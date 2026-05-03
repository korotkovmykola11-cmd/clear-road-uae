(function crFixRouteEmptyStateFinalV2(){
  'use strict';
  const VERSION = 'CR_FIX_ROUTE_EMPTY_STATE_FINAL_V2_2026_04_25';
  /**
   * AUDIT фаза 1: задержки повторного installAll. Ядро маршрута (__CLEAR_ROAD_ROUTE_CALC_CORE__),
   * экземпляр DirectionsService и цепочка initMap навешиваются не синхронно с парсингом скрипта.
   * Пять точек (0 → 120 → 450 → 1200 → 2800 ms): немедленный повтор, ранний пост-DOM/initMap,
   * типичная гонка с Maps/Places, поздняя регистрация обёрток, крайний случай медленной среды.
   * Укорочение массива — только после регресс-теста пустого списка маршрутов и empty-state.
   */
  const CR_EMPTY_STATE_INSTALL_RETRY_DELAYS_MS = Object.freeze([0, 120, 450, 1200, 2800]);
  const FALLBACK_TEXT_RE = /Route data unavailable\s*[·-]\s*recalculate route|Route display fallback\s*[·-]\s*recalculate route/i;
  const API_ERROR_TEXT_RE = /Map service unavailable|Could not find|Could not calculate|No route returned|Address not found|outside UAE|Route rejected|Directions/i;
  let realDirectionsRequestStarted = false;
  let lastRealDirectionsRequestAt = 0;

  function $(id){ return document.getElementById(id); }
  function val(id){ const el = $(id); return el && el.value ? String(el.value).trim() : ''; }
  function hasInputs(){ return !!(val('start') && val('end')); }
  function clearResults(){ const r = $('results'); if (r) r.innerHTML = ''; }
  function resetRouteState(){
    try { currentDirectionsResult = null; } catch(_) {}
    try { analyzedRoutes = []; } catch(_) {}
    try { selectedRoute = null; } catch(_) {}
    try { _bestRoute = null; } catch(_) {}
    try { _fastestRoute = null; } catch(_) {}
    try { currentDecision = null; } catch(_) {}
    try { if (window.currentDecision) window.currentDecision = null; } catch(_) {}
    try { if (Array.isArray(window.analyzedRoutes)) window.analyzedRoutes = []; } catch(_) {}
    try { window.selectedRouteId = null; } catch(_) {}
  }
  function enterIdle(reason){
    try {
      if (typeof clearRoutes === "function") clearRoutes();
    } catch (_) {}
    resetRouteState();
    try {
      currentDirectionsResult = null;
    } catch (_) {}
    try {
      window.__clearRoadUserPickIndex = null;
    } catch (_) {}
    clearResults();
    document.documentElement.setAttribute('data-route-state', 'IDLE');
    document.documentElement.setAttribute('data-route-idle-reason', reason || 'missing-input');
    try {
      if (typeof renderResults === "function") renderResults();
    } catch (_) {}
  }
  function hideUnsafeFallbackErrors(){
    const r = $('results');
    if (!r) return;
    const text = (r.textContent || '').trim();
    if (!text) return;
    const noRoutes = !(Array.isArray(window.analyzedRoutes || (typeof analyzedRoutes !== 'undefined' ? analyzedRoutes : [])) && (window.analyzedRoutes || analyzedRoutes).length);
    if (FALLBACK_TEXT_RE.test(text)) {
      r.innerHTML = '';
      if (!hasInputs()) enterIdle('fallback-cleared-empty-input');
      return;
    }
    // Do not allow old safety layers to show an error before a real Directions request.
    if (!realDirectionsRequestStarted && !lastRealDirectionsRequestAt && API_ERROR_TEXT_RE.test(text) && !hasInputs()) {
      enterIdle('early-error-cleared');
      return;
    }
    // If renderResults was called with no route data, keep screen clean. Real API errors are shown only by calculateRoutes after request.
    if (noRoutes && FALLBACK_TEXT_RE.test(text)) r.innerHTML = '';
  }
  let hideFallbackScheduled = false;
  function scheduleHideUnsafeFallbackErrors(){
    if (hideFallbackScheduled) return;
    hideFallbackScheduled = true;
    requestAnimationFrame(function(){
      hideFallbackScheduled = false;
      hideUnsafeFallbackErrors();
    });
  }
  function installDirectionsRequestTracker(){
    try {
      if (!window.google || !google.maps || !google.maps.DirectionsService) return false;
      if (typeof directionsService === 'undefined' || !directionsService || typeof directionsService.route !== 'function') return false;
      if (directionsService.route.__crTrackedV2) return true;
      const hadTz7 = !!(directionsService.route && directionsService.route.__tz7Patched);
      const inner = directionsService.route.bind(directionsService);
      const wrapped = function(){
        realDirectionsRequestStarted = true;
        lastRealDirectionsRequestAt = Date.now();
        document.documentElement.setAttribute('data-route-state','LOADING');
        return inner.apply(directionsService, arguments);
      };
      wrapped.__crTrackedV2 = true;
      if (hadTz7) wrapped.__tz7Patched = true;
      directionsService.route = wrapped;
      window.__crDirectionsTrackedV2 = true;
      return true;
    } catch(e) { return false; }
  }
  function patchCalculateRoutes(){
    if (typeof window.__CLEAR_ROAD_ROUTE_CALC_CORE__ !== 'function') return;
    if (window.calculateRoutes && window.calculateRoutes.__crEmptyStateFinalV2) return;
    const core = window.__CLEAR_ROAD_ROUTE_CALC_CORE__;
    const wrapped = async function calculateRoutesUnified(){
      if (!hasInputs()) {
        realDirectionsRequestStarted = false;
        lastRealDirectionsRequestAt = 0;
        enterIdle('calculate-with-missing-input');
        return;
      }
      document.documentElement.setAttribute('data-route-state','LOADING');
      const beforeRequestAt = lastRealDirectionsRequestAt;
      try {
        if (typeof window.clearRoadTZ7PatchDirectionsRoute === 'function') window.clearRoadTZ7PatchDirectionsRoute();
        const out = await core.apply(this, arguments);
        if (typeof window.clearRoadTZ7ScheduleAfterCalculateRoutes === 'function') window.clearRoadTZ7ScheduleAfterCalculateRoutes();
        if (typeof window.clearRoadTZ6bScheduleApplyAll === 'function') window.clearRoadTZ6bScheduleApplyAll();
        hideUnsafeFallbackErrors();
        const routes = (typeof analyzedRoutes !== 'undefined' && Array.isArray(analyzedRoutes)) ? analyzedRoutes : (Array.isArray(window.analyzedRoutes) ? window.analyzedRoutes : []);
        if (routes && routes.length) document.documentElement.setAttribute('data-route-state','READY');
        else if (lastRealDirectionsRequestAt === beforeRequestAt && !realDirectionsRequestStarted) enterIdle('no-request-no-routes');
        return out;
      } catch(e) {
        if (!hasInputs()) { enterIdle('exception-missing-input'); return; }
        document.documentElement.setAttribute('data-route-state','ERROR');
        throw e;
      }
    };
    wrapped.__crEmptyStateFinalV2 = true;
    wrapped.__crRouteUnified = true;
    window.calculateRoutes = wrapped;
    try { calculateRoutes = wrapped; } catch(_) {}
  }
  function bindInputs(){
    ['start','end'].forEach(function(id){
      const input = $(id);
      if (!input || input.dataset.crEmptyStateV2Bound === '1') return;
      input.dataset.crEmptyStateV2Bound = '1';
      input.addEventListener('input', function(){
        if (!hasInputs()) enterIdle('input-cleared');
        else scheduleHideUnsafeFallbackErrors();
      }, true);
      input.addEventListener('change', function(){
        if (!hasInputs()) enterIdle('change-cleared');
        else scheduleHideUnsafeFallbackErrors();
      }, true);
    });
  }
  function installObserver(){
    const r = $('results');
    if (!r || r.__crEmptyStateObserverV2) return;
    r.__crEmptyStateObserverV2 = true;
    new MutationObserver(function(){ scheduleHideUnsafeFallbackErrors(); }).observe(r, {childList:true, subtree:true, characterData:true});
  }
  function hookInitMapForDirectionsTracker(){
    if (window.__crEmptyStateInitMapHookV2) return;
    const existing = window.initMap;
    if (typeof existing !== 'function') return;
    window.__crEmptyStateInitMapHookV2 = true;
    const hooked = function initMapCrEmptyStateDirectionsHook(){
      const out = existing.apply(this, arguments);
      try { installDirectionsRequestTracker(); } catch (_) {}
      return out;
    };
    try {
      hooked.__crTz12Patched = existing.__crTz12Patched;
    } catch (_) {}
    window.initMap = hooked;
    try { initMap = hooked; } catch (_) {}
  }
  function installAll(){
    hookInitMapForDirectionsTracker();
    installDirectionsRequestTracker();
    patchCalculateRoutes();
    bindInputs();
    installObserver();
    if (!hasInputs()) enterIdle('initial-load');
    hideUnsafeFallbackErrors();
    document.documentElement.setAttribute('data-cr-empty-state-fix', VERSION);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installAll, {once:true});
  else installAll();
  CR_EMPTY_STATE_INSTALL_RETRY_DELAYS_MS.forEach(function(ms){ setTimeout(installAll, ms); });
})();
