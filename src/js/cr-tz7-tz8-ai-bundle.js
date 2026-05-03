// ============================================================
//  ТЗ-7 FINAL — ROUTE CONTROL LOGIC
//  Purpose: make route preference/filter buttons and bottom Route/Drive nav real controls.
//  Scope: route controls only. AI text, mobile layout, GPS and autocomplete are not changed.
// ============================================================
(function installTZ7RouteControlLogic(){
  'use strict';

  const TZ7_VERSION = 'TZ7_ROUTE_CONTROL_LOGIC_2026_04_25_FINAL';
  const PREF_KEY = 'clearRoadUAE.pref';
  const FILTERS_KEY = 'clearRoadUAE.filters.v1';
  const PREFS = ['balanced', 'fastest', 'no_tolls'];
  const DEFAULT_FILTERS = {
    avoid_highways: false,
    fewer_turns: false,
    less_traffic: false,
    fewer_stops: false,
    stable_route: false,
    avoid_complex: false
  };

  window.__CLEAR_ROAD_TZ7_ROUTE_CONTROL__ = TZ7_VERSION;

  function safeLog(){ try { console.info.apply(console, arguments); } catch (_) {} }
  function $(id){ return document.getElementById(id); }
  function safeArray(v){ return Array.isArray(v) ? v : []; }
  function getPref(){
    try {
      const v = localStorage.getItem(PREF_KEY) || 'balanced';
      return PREFS.includes(v) ? v : 'balanced';
    } catch (_) { return 'balanced'; }
  }
  function savePref(pref){
    const next = PREFS.includes(pref) ? pref : 'balanced';
    try { localStorage.setItem(PREF_KEY, next); } catch (_) {}
    return next;
  }
  function getFilters(){
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(FILTERS_KEY) || '{}') || {}; } catch (_) { stored = {}; }
    const merged = Object.assign({}, DEFAULT_FILTERS, stored);
    try {
      window.userFilters = merged;
      if (typeof userFilters !== 'undefined') userFilters = merged;
    } catch (_) {}
    return merged;
  }
  function saveFilters(filters){
    const merged = Object.assign({}, DEFAULT_FILTERS, filters || {});
    try { localStorage.setItem(FILTERS_KEY, JSON.stringify(merged)); } catch (_) {}
    try {
      window.userFilters = merged;
      if (typeof userFilters !== 'undefined') userFilters = merged;
    } catch (_) {}
    return merged;
  }
  function routeMinutes(route){
    try {
      if (typeof window.getDisplayMinutes === 'function') {
        const v = Number(window.getDisplayMinutes(route));
        if (Number.isFinite(v)) return v;
      }
    } catch (_) {}
    const candidates = [
      route && route.durationMin,
      route && route.durationTrafficSec != null ? Number(route.durationTrafficSec) / 60 : null,
      route && route.duration_in_traffic != null ? Number(route.duration_in_traffic) / 60 : null,
      route && route.time != null ? Number(route.time) / 60 : null
    ];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
    return 999999;
  }
  function routeTolls(route){
    if (!route) return false;
    const sb = route.scoreBreakdown || {};
    return !!(route.tolls || route.hasTolls || route.salikDetected || route.uaeSalik || Number(route.salikCost) > 0 || Number(route.uaeTollCost) > 0 || Number(route.tollCost) > 0 || Number(sb.tollCost) > 0);
  }
  function routeText(route){
    const parts = [];
    if (!route) return '';
    ['summary','routeTitle','title','name','why','tradeOff','uaeAdvice','drivePersonality'].forEach(k => { if (route[k]) parts.push(route[k]); });
    if (Array.isArray(route.whyPoints)) parts.push(route.whyPoints.join(' '));
    if (Array.isArray(route.steps)) route.steps.forEach(s => { if (s && s.instructions) parts.push(s.instructions); });
    if (Array.isArray(route.legs)) route.legs.forEach(l => { if (l && l.start_address) parts.push(l.start_address); if (l && l.end_address) parts.push(l.end_address); });
    return parts.join(' ').toLowerCase();
  }
  function routeHighway(route){
    const text = routeText(route);
    const share = Number(route && (route.highwayShare != null ? route.highwayShare : Number(route.highwayPct || 0) / 100));
    return !!(route && route.highway) || share >= 0.45 || /\b(e11|e311|e611|e44|e66|e77)\b|sheikh zayed|emirates road|mohammed bin zayed|highway|motorway/.test(text);
  }
  function routeTraffic(route){
    const sb = route && route.scoreBreakdown ? route.scoreBreakdown : {};
    const score = Number(route && route.trafficScore != null ? route.trafficScore : sb.trafficScore);
    const delay = Number(route && route.delayMin != null ? route.delayMin : sb.delayMin);
    const rank = Number(route && (route.trafficRank || route.trafficLevel) != null ? (route.trafficRank || route.trafficLevel) : sb.trafficRank);
    return Math.max(0,
      (Number.isFinite(score) ? score * 20 : 0) +
      (Number.isFinite(delay) ? delay : 0) +
      (Number.isFinite(rank) ? Math.max(0, rank - 1) * 3 : 0)
    );
  }
  function routeTurns(route){
    const sb = route && route.scoreBreakdown ? route.scoreBreakdown : {};
    const v = Number(route && (route.stopsCount || route.turnsCount) != null ? (route.stopsCount || route.turnsCount) : (sb.stopsCount || sb.turns || route && route.complexity));
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  }
  function routeControlScore(route){
    const pref = getPref();
    const filters = getFilters();
    let score = routeMinutes(route) * 10;

    if (pref === 'fastest') score = routeMinutes(route) * 100 + routeTraffic(route) * 2;
    if (pref === 'no_tolls') score += routeTolls(route) ? 10000 : -150;

    if (filters.avoid_highways) score += routeHighway(route) ? 4500 : -100;
    if (filters.less_traffic) score += routeTraffic(route) * 90;
    if (filters.fewer_turns) score += routeTurns(route) * 90;
    if (filters.fewer_stops) score += routeTurns(route) * 120;
    if (filters.stable_route) score += routeTraffic(route) * 35 + Math.max(0, 100 - Number(route && route.stabilityScore || 75)) * 8;
    if (filters.avoid_complex) score += routeTurns(route) * 85;

    const base = Number(route && (route.score || route.filterDecisionScore));
    if (Number.isFinite(base)) score += base;
    return score;
  }
  function syncRouteControlUI(){
    const pref = getPref();
    const filters = getFilters();
    document.querySelectorAll('.pref-btn, .tz5-pref-chip').forEach(btn => {
      const active = btn && btn.dataset && btn.dataset.pref === pref;
      btn.classList.toggle('active', !!active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    document.querySelectorAll('.filter-btn, .tz5-filter-chip').forEach(btn => {
      const key = btn && btn.dataset ? btn.dataset.filter : '';
      const active = !!filters[key];
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  function applyRouteControlSelection(reason){
    const routes = safeArray(typeof analyzedRoutes !== 'undefined' ? analyzedRoutes : window.analyzedRoutes).filter(Boolean);
    if (!routes.length) return false;
    try {
      routes.forEach(r => {
        r.routeControlScore = routeControlScore(r);
        r.controlReason = reason || 'route-control';
      });
      const canonical = buildCanonicalDecisionState(routes, { assumeScored: true });
      analyzedRoutes = canonical.routes;
      window.analyzedRoutes = canonical.routes;
      currentDecision = canonical.decision;
      _bestRoute = canonical.bestRoute;
      selectedRoute = canonical.selectedRoute || canonical.bestRoute;
      _fastestRoute = canonical.fastestRoute;
    } catch (_) {}
    syncRouteControlUI();
    return true;
  }
  function scheduleRerender(reason){
    const run = () => {
      try { applyRouteControlSelection(reason); } catch(e) { console.warn('[TZ7] selection skipped', e); }
      try { if (typeof renderResults === 'function') renderResults(); } catch(e) { console.warn('[TZ7] render skipped', e); }
      try { if (typeof currentDirectionsResult !== 'undefined' && currentDirectionsResult && typeof drawRoutes === 'function') drawRoutes(currentDirectionsResult); } catch(_) {}
      syncRouteControlUI();
    };
    setTimeout(run, 80);
  }
  function calculateOrRerender(reason){
    syncRouteControlUI();
    const s = ($('start') && $('start').value || '').trim();
    const e = ($('end') && $('end').value || '').trim();
    if (s && e && typeof calculateRoutes === 'function') {
      try { calculateRoutes(); } catch(err) { console.warn('[TZ7] calculateRoutes failed', err); }
      scheduleRerender(reason);
    } else {
      scheduleRerender(reason);
      if (!e && $('end')) $('end').focus();
      else if (!s && $('start')) $('start').focus();
    }
  }

  // Final public controls. These intentionally override older partial handlers.
  window.setUserPreference = function setUserPreferenceTZ7(value){
    if (!PREFS.includes(value)) return;
    savePref(value);
    calculateOrRerender('preference:' + value);
  };
  try { setUserPreference = window.setUserPreference; } catch (_) {}

  window.toggleFilter = function toggleFilterTZ7(key){
    const filters = getFilters();
    if (!(key in filters)) return;
    filters[key] = !filters[key];
    saveFilters(filters);
    calculateOrRerender('filter:' + key);
  };
  try { toggleFilter = window.toggleFilter; } catch (_) {}

  function patchDirectionsRoute(){
    try {
      if (typeof directionsService === 'undefined' || !directionsService || typeof directionsService.route !== 'function') return false;
      if (directionsService.route.__tz7Patched) return true;
      const original = directionsService.route.bind(directionsService);
      const patched = function tz7DirectionsRoute(options, callback){
        const pref = getPref();
        const filters = getFilters();
        const opts = Object.assign({}, options || {});
        if (pref === 'no_tolls') opts.avoidTolls = true;
        if (filters.avoid_highways) opts.avoidHighways = true;
        if (!opts.drivingOptions) opts.drivingOptions = { departureTime: new Date(), trafficModel: 'bestguess' };
        if (!opts.region) opts.region = 'AE';
        return original(opts, callback);
      };
      patched.__tz7Patched = true;
      directionsService.route = patched;
      return true;
    } catch(e) { console.warn('[TZ7] Directions patch failed', e); return false; }
  }

  function openRouteScreen(){
    syncRouteControlUI();
    const s = ($('start') && $('start').value || '').trim();
    const e = ($('end') && $('end').value || '').trim();
    const routes = safeArray(typeof analyzedRoutes !== 'undefined' ? analyzedRoutes : window.analyzedRoutes);
    if (s && e && !routes.length && typeof calculateRoutes === 'function') {
      try { calculateRoutes(); } catch(err) { console.warn('[TZ7] route tab calculate failed', err); }
    } else {
      scheduleRerender('bottom-route');
    }
    const results = $('results');
    if (results && results.scrollIntoView) setTimeout(() => results.scrollIntoView({ behavior:'smooth', block:'start' }), 80);
    const alt = $('other-routes-section');
    if (alt) alt.classList.add('expanded');
  }
  function startDriveFromBottom(){
    const routes = safeArray(typeof analyzedRoutes !== 'undefined' ? analyzedRoutes : window.analyzedRoutes);
    if (!routes.length) { openRouteScreen(); return; }
    applyRouteControlSelection('bottom-drive');
    const r = (typeof selectedRoute !== 'undefined' && selectedRoute) || routes[0];
    if (!r) return;
    if (typeof startDrive === 'function') startDrive(r.index);
    else if (typeof startDriveMode === 'function') startDriveMode(r.index);
  }
  function wireBottomNav(){
    const items = document.querySelectorAll('.bottom-nav .nav-item');
    if (!items || items.length < 2) return;
    const routeBtn = items[0];
    const driveBtn = items[1];
    function setRouteDriveActive(isDrive) {
      if (routeBtn && !routeBtn.classList.contains('disabled')) {
        routeBtn.classList.toggle('active', !isDrive);
      }
      if (driveBtn && !driveBtn.classList.contains('disabled')) {
        driveBtn.classList.toggle('active', !!isDrive);
      }
    }
    routeBtn.onclick = function(ev){
      if (ev) ev.preventDefault();
      setRouteDriveActive(false);
      openRouteScreen();
      return false;
    };
    driveBtn.onclick = function(ev){
      if (ev) ev.preventDefault();
      setRouteDriveActive(true);
      startDriveFromBottom();
      return false;
    };
    routeBtn.dataset.tz7Wired = 'route';
    driveBtn.dataset.tz7Wired = 'drive';
  }

  function wireControlButtons(){
    document.querySelectorAll('.pref-btn, .tz5-pref-chip').forEach(btn => {
      if (!btn || !btn.dataset || !btn.dataset.pref) return;
      btn.onclick = function(ev){ if (ev) ev.preventDefault(); window.setUserPreference(btn.dataset.pref); return false; };
    });
    document.querySelectorAll('.filter-btn, .tz5-filter-chip').forEach(btn => {
      if (!btn || !btn.dataset || !btn.dataset.filter) return;
      btn.onclick = function(ev){ if (ev) ev.preventDefault(); window.toggleFilter(btn.dataset.filter); return false; };
    });
  }

  window.clearRoadTZ7PatchDirectionsRoute = patchDirectionsRoute;
  window.clearRoadTZ7ScheduleAfterCalculateRoutes = function(){ scheduleRerender('calculateRoutes'); };

  function install(){
    patchDirectionsRoute();
    syncRouteControlUI();
    wireControlButtons();
    wireBottomNav();
  }
  [0, 250, 800, 1600].forEach(t => setTimeout(install, t));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();

  window.clearRoadTZ7Audit = function(){
    const filters = getFilters();
    return {
      marker: window.__CLEAR_ROAD_TZ7_ROUTE_CONTROL__ === TZ7_VERSION,
      setUserPreference: typeof window.setUserPreference === 'function',
      toggleFilter: typeof window.toggleFilter === 'function',
      bottomRouteWired: !!(document.querySelector('.bottom-nav .nav-item') && document.querySelector('.bottom-nav .nav-item').dataset.tz7Wired === 'route'),
      bottomDriveWired: !!(document.querySelectorAll('.bottom-nav .nav-item')[1] && document.querySelectorAll('.bottom-nav .nav-item')[1].dataset.tz7Wired === 'drive'),
      directionsPatched: (typeof directionsService !== 'undefined' && directionsService && directionsService.route && !!directionsService.route.__tz7Patched) || false,
      routeCalculateUnified: !!(window.calculateRoutes && window.calculateRoutes.__crRouteUnified),
      pref: getPref(),
      filters,
      corePresent: ['calculateRoutes','renderResults','startDriveMode','requestGPS','setLang'].every(function(fn){ return typeof window[fn] === 'function' || typeof globalThis[fn] === 'function'; })
    };
  };

  safeLog('[TZ7] Route Control Logic installed', TZ7_VERSION);
})();

// ============================================================
//  ТЗ-8 — REAL AI LOGIC ENGINE
//  Final decision layer: compares routes, applies thresholds,
//  writes one clear AI decision, removes text-only AI noise.
// ============================================================
(function applyTZ8RealAIDecisionEngine(){
  const TZ8_VERSION = 'TZ8_REAL_AI_ENGINE_2026_04_25';
  window.__CLEAR_ROAD_TZ8_AI_ENGINE__ = TZ8_VERSION;

  function safeNum(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : (Number.isFinite(fallback) ? fallback : 0);
  }
  function roundMin(v){
    const n = safeNum(v, 0);
    if (n <= 0) return 0;
    return Math.max(1, Math.round(n));
  }
  function minutes(route){
    if (!route) return 0;
    try {
      if (typeof _tz1Minutes === 'function') return roundMin(_tz1Minutes(route));
    } catch (_) {}
    return roundMin(route.durationMin || route.duration || route.timeMin || route.time || 0);
  }
  function km(route){
    if (!route) return 0;
    if (Number.isFinite(Number(route.distanceKm))) return Math.round(Number(route.distanceKm) * 10) / 10;
    if (Number.isFinite(Number(route.distance))) return Math.round((Number(route.distance) / 1000) * 10) / 10;
    return 0;
  }
  function stops(route){
    if (!route) return 0;
    try { if (typeof _tz2Turns === 'function') return safeNum(_tz2Turns(route), 0); } catch (_) {}
    return safeNum(route.turns || route.stops || route.steps || 0, 0);
  }
  function delay(route){
    if (!route) return 0;
    try { if (typeof tz4DelayMin === 'function') return roundMin(tz4DelayMin(route)); } catch (_) {}
    return roundMin(route.delayMin || route.trafficDelay || route.delay || 0);
  }
  function trafficRank(route){
    if (!route) return 1;
    try { if (typeof _tz1TrafficRank === 'function') return safeNum(_tz1TrafficRank(route.traffic), 1); } catch (_) {}
    const txt = String(route.traffic || route.trafficLevel || '').toLowerCase();
    if (/heavy|high|red|bad|jam|severe/.test(txt)) return 3;
    if (/medium|moderate|amber|yellow/.test(txt)) return 2;
    if (/low|light|green|clear/.test(txt)) return 1;
    const raw = safeNum(route.trafficScore, NaN);
    if (Number.isFinite(raw)) return raw >= 0.66 ? 3 : raw >= 0.33 ? 2 : 1;
    return 1;
  }
  function routeName(route){
    if (!route) return 'selected route';
    try { if (typeof _tz1RouteName === 'function') return String(_tz1RouteName(route) || 'selected route'); } catch (_) {}
    return String(route.name || route.summary || route.routeName || route.via || 'selected route');
  }
  function pref(){
    try { if (typeof getUserPreference === 'function') return String(getUserPreference() || 'balanced'); } catch (_) {}
    return String(window.userPreference || 'balanced');
  }

  const ROUTE_MODE_KEY = 'clearRoadUAE.routeMode';
  const ROUTE_MODES = ['fast', 'calm'];
  function getRouteMode(){
    try {
      const v = String(localStorage.getItem(ROUTE_MODE_KEY) || 'fast').toLowerCase();
      return ROUTE_MODES.indexOf(v) !== -1 ? v : 'fast';
    } catch (_) {
      return 'fast';
    }
  }
  function syncRouteModeUI(){
    const mode = getRouteMode();
    document.querySelectorAll('.route-mode-btn').forEach(function(btn){
      if (!btn || !btn.dataset) return;
      const active = btn.dataset.routeMode === mode;
      btn.classList.toggle('active', !!active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  try { window.getRouteMode = getRouteMode; } catch (_) {}
  try { window.syncRouteModeUI = syncRouteModeUI; } catch (_) {}
  window.setRouteMode = function setRouteModeCR(mode){
    const raw = String(mode || 'fast').toLowerCase();
    const m = ROUTE_MODES.indexOf(raw) !== -1 ? raw : 'fast';
    try { localStorage.setItem(ROUTE_MODE_KEY, m); } catch (_) {}
    syncRouteModeUI();
    try {
      if (typeof window.clearRoadTZ7ScheduleAfterCalculateRoutes === 'function') {
        window.clearRoadTZ7ScheduleAfterCalculateRoutes();
      }
    } catch (_) {}
  };
  try { setRouteMode = window.setRouteMode; } catch (_) {}
  function filters(){
    const f = (typeof userFilters === 'object' && userFilters) ? userFilters : (window.routeControlsState && window.routeControlsState.filters) || {};
    return {
      avoidTolls: !!(f.avoid_tolls || f.no_tolls || f.noTolls),
      avoidHighways: !!(f.avoid_highways || f.avoidHighways),
      fewerTurns: !!(f.fewer_turns || f.fewerTurns),
      avoidTraffic: !!(f.avoid_traffic || f.no_traffic || f.avoidTraffic)
    };
  }
  function hasTolls(route){
    return !!(route && (route.tolls || route.hasTolls || safeNum(route.tollCost, 0) > 0 || safeNum(route.salikCost, 0) > 0));
  }
  function salikAed(route){
    return safeNum(route && route.salikCost, safeNum(route && route.tollCost, 0));
  }
  function salikGates(route){
    return Math.max(0, Math.round(safeNum(route && route.salikCount, safeNum(route && route.tollCount, 0))));
  }
  function hasHighway(route){
    if (!route) return false;
    if (route.highway || route.hasHighway) return true;
    return /e11|e311|e611|highway|motorway|sheikh/i.test(String(route.summary || route.name || route.routeName || ''));
  }

  function aiScore(route){
    if (!route) return 999999;
    const p = pref();
    const f = filters();
    const routeMinutes = minutes(route);
    const routeKm = km(route);
    const routeStops = stops(route);
    const routeDelay = delay(route);
    const routeTrafficRank = trafficRank(route);
    const highwayShareRaw = safeNum(route.highwayShare, hasHighway(route) ? 0.65 : 0.2);
    const highwayShare = Math.max(0, Math.min(1, highwayShareRaw));
    let score = 0;
    score += routeMinutes * (p === 'fastest' ? 1.45 : 1.0);
    score += routeKm * 0.35;
    score += routeTrafficRank * (f.avoidTraffic ? 6 : 3);
    score += routeDelay * 0.9;
    score += routeStops * (f.fewerTurns ? 0.9 : 0.25);
    score += hasTolls(route) ? (p === 'no_tolls' || f.avoidTolls ? 30 : 3) : 0;
    score += hasHighway(route) && f.avoidHighways ? 24 : 0;
    score += f.avoidHighways ? highwayShare * 6 : Math.abs(highwayShare - 0.55) * 2.2;
    if (Number.isFinite(Number(route.score))) score += Number(route.score) * 0.08;
    return Math.round(score * 10) / 10;
  }

  function rankRoutes(routes){
    return (Array.isArray(routes) ? routes.filter(Boolean) : []).slice().sort(function(a,b){
      return aiScore(a) - aiScore(b) || minutes(a) - minutes(b) || km(a) - km(b);
    });
  }
  try { window.__CLEAR_ROAD_RANK_ROUTES__ = rankRoutes; } catch (_) {}
  function routeDeltaVsFastest(route, fastest){
    const routeMin = minutes(route);
    const fastestMin = minutes(fastest);
    const deltaMin = Math.max(0, Math.round(routeMin - fastestMin));
    const deltaPct = fastestMin > 0 ? deltaMin / fastestMin : 0;
    return { routeMin, fastestMin, deltaMin, deltaPct };
  }
  function isRegionAjmanDubaiLike(routes){
    const txt = (Array.isArray(routes) ? routes : []).map(function(r){
      return String((r && (r.summary || r.name || r.routeName || r.title)) || '').toLowerCase();
    }).join(' ');
    const hasAjmanLike = /ajman|عجمان|аджман|عجمان/.test(txt);
    const hasDubaiLike = /dubai|دبي|дубай/.test(txt);
    return hasAjmanLike && hasDubaiLike;
  }
  function isTooSlowCandidate(route, fastest, routes){
    const d = routeDeltaVsFastest(route, fastest);
    if (d.deltaMin <= 0) return false;
    const thresholdExceeded = d.deltaPct > 0.35 || d.deltaMin > 20;
    if (!thresholdExceeded) return false;
    if (isRegionAjmanDubaiLike(routes) && d.fastestMin <= 90 && d.routeMin >= 180) return true;
    return true;
  }
  function canSelectSlowRoute(route, fastest, routes){
    const p = pref();
    const f = filters();
    const allRoutes = Array.isArray(routes) ? routes.filter(Boolean) : [];
    if (!allRoutes.length) return false;
    const d = routeDeltaVsFastest(route, fastest);
    const everyoneSlow = allRoutes.every(function(r){
      const rd = routeDeltaVsFastest(r, fastest);
      return rd.deltaMin <= 20 || rd.deltaPct <= 0.35;
    });
    if (everyoneSlow) return true;
    if ((p === 'no_tolls' || f.avoidTolls) && hasTolls(fastest) && !hasTolls(route) && d.deltaMin <= 25) return true;
    const highwayHeavyFastest = hasHighway(fastest) || safeNum(fastest && fastest.highwayShare, 0) >= 0.55;
    if (f.avoidHighways && highwayHeavyFastest && !hasHighway(route) && d.deltaMin <= 25) return true;
    return false;
  }
  function confidenceV2(best, fastest, second){
    if (!best) return { level:'LOW', percent:45, margin:0, reason:'No reliable route' };
    const secondRoute = second || null;
    const dFast = routeDeltaVsFastest(best, fastest || best);
    let scoreGap = secondRoute ? Math.max(0, aiScore(secondRoute) - aiScore(best)) : 100;
    const stabilityGap = secondRoute ? Math.abs(safeNum(secondRoute.stabilityScore, 0) - safeNum(best.stabilityScore, 0)) : 0;
    let routeModeCalm = false;
    try { routeModeCalm = getRouteMode() === 'calm'; } catch (_) {}
    const prefConflict = (pref() === 'fastest' && dFast.deltaMin > 3) || (routeModeCalm && dFast.deltaMin > 14);
    let level = 'MEDIUM';
    if ((!secondRoute || scoreGap >= 9 || dFast.deltaMin <= 1) && !prefConflict) level = 'HIGH';
    if (dFast.deltaMin > 22 || dFast.deltaPct > 0.38 || prefConflict) level = 'LOW';
    if (level !== 'LOW' && secondRoute && scoreGap >= 0 && scoreGap < 3) level = 'MEDIUM';
    if (level === 'HIGH' && secondRoute && scoreGap < 5) level = 'MEDIUM';
    if (level !== 'LOW' && secondRoute && stabilityGap >= 18 && scoreGap < 6) level = 'MEDIUM';
    let percent;
    if (level === 'HIGH') percent = 82 + Math.min(8, Math.floor(scoreGap));
    else if (level === 'MEDIUM') percent = 61 + Math.min(12, Math.floor(scoreGap * 2.2));
    else percent = 42 + Math.min(10, Math.floor((secondRoute ? scoreGap : 0)));
    percent = Math.max(40, Math.min(92, percent));
    return { level: level, percent: percent, margin: Math.round(scoreGap * 10) / 10, reason: prefConflict ? 'Preference conflict with slower route' : 'Rule-based confidence' };
  }

  function sameRoute(a,b){
    if (!a || !b) return false;
    if (a.id && b.id && String(a.id) === String(b.id)) return true;
    if (Number.isFinite(Number(a.index)) && Number.isFinite(Number(b.index)) && Number(a.index) === Number(b.index)) return true;
    return false;
  }

  function getLang(){
    return String(window.currentLang || document.documentElement.lang || document.body.getAttribute('data-lang') || 'en').toLowerCase();
  }
  const L = {
    en: {
      go:'GO NOW', close:'ROUTES ARE CLOSE', only:'ONLY VALID ROUTE', why:'WHY', trade:'TRADE-OFF', when:'WHEN', conf:'AI CONFIDENCE',
      fastest:'fastest option', altSlower:'alternative is slower by {x} min', altClose:'alternative is almost equal', betterTraffic:'better traffic balance', fewerStops:'fewer turns/stops', toll:'possible toll road', highway:'uses highway section', noWait:'Leave when ready — compare minutes and Salik below.', closeReason:'difference is less than 3 min', onlyReason:'Google returned one usable route', avoidTolls:'avoids toll roads', avoidHighways:'avoids highway sections', calmer:'calmer traffic right now', shorter:'shorter distance', slowerBecause:'This route is slower, but selected because', low:'LOW', medium:'MEDIUM', high:'HIGH',
      salikCostNarr:'Salik about {aed} AED ({gates} gates)', salikFreeVs:'Skips Salik versus a tolled alternative', pickBySalik:'Times are close — decide using Salik cost and comfort.', stabBetter:'More stable ETA than the main alternative'
    },
    ru: {
      go:'ЕДЬ СЕЙЧАС', close:'МАРШРУТЫ ПОЧТИ РАВНЫ', only:'ОДИН ДОСТУПНЫЙ МАРШРУТ', why:'ПОЧЕМУ', trade:'КОМПРОМИСС', when:'КОГДА', conf:'УВЕРЕННОСТЬ AI',
      fastest:'самый быстрый вариант', altSlower:'альтернатива медленнее на {x} мин', altClose:'альтернатива почти равная', betterTraffic:'лучший баланс по трафику', fewerStops:'меньше поворотов/остановок', toll:'возможен платный участок', highway:'есть участок по шоссе', noWait:'Выезжай, когда готов — ниже сравнение минут и Салика.', closeReason:'разница меньше 3 мин', onlyReason:'Google вернул один рабочий маршрут', avoidTolls:'без платных дорог', avoidHighways:'без участков по шоссе', calmer:'спокойнее по трафику сейчас', shorter:'короче по расстоянию', slowerBecause:'Маршрут медленнее, но выбран потому что', low:'НИЗКАЯ', medium:'СРЕДНЯЯ', high:'ВЫСОКАЯ',
      salikCostNarr:'Салик около {aed} AED ({gates} ворот)', salikFreeVs:'Без Салика против платной альтернативы', pickBySalik:'Время близко — решай по Салику и комфорту.', stabBetter:'Стабильнее ETA, чем основная альтернатива'
    },
    ua: {
      go:'ЇДЬ ЗАРАЗ', close:'МАРШРУТИ МАЙЖЕ РІВНІ', only:'ОДИН ДОСТУПНИЙ МАРШРУТ', why:'ЧОМУ', trade:'КОМПРОМІС', when:'КОЛИ', conf:'ВПЕВНЕНІСТЬ AI',
      fastest:'найшвидший варіант', altSlower:'альтернатива повільніша на {x} хв', altClose:'альтернатива майже рівна', betterTraffic:'кращий баланс трафіку', fewerStops:'менше поворотів/зупинок', toll:'можлива платна ділянка', highway:'є ділянка шосе', noWait:'Виїжджай, коли готовий — нижче порівняння хвилин і Саліку.', closeReason:'різниця менше 3 хв', onlyReason:'Google повернув один робочий маршрут', avoidTolls:'без платних доріг', avoidHighways:'без ділянок шосе', calmer:'спокійніший трафік зараз', shorter:'коротша відстань', slowerBecause:'Маршрут повільніший, але вибраний тому що', low:'НИЗЬКА', medium:'СЕРЕДНЯ', high:'ВИСОКА',
      salikCostNarr:'Салік ~{aed} AED ({gates} шлюзів)', salikFreeVs:'Без Саліку проти платної альтернативи', pickBySalik:'Час близький — обирай за Саліком і комфортом.', stabBetter:'Стабільніший ETA за основну альтернативу'
    },
    ar: {
      go:'انطلق الآن', close:'المسارات متقاربة', only:'مسار واحد صالح', why:'السبب', trade:'المقابل', when:'الوقت', conf:'ثقة AI',
      fastest:'الخيار الأسرع', altSlower:'البديل أبطأ بـ {x} دقيقة', altClose:'البديل شبه مماثل', betterTraffic:'توازن مروري أفضل', fewerStops:'منعطفات/توقفات أقل', toll:'قد يوجد طريق برسوم', highway:'يتضمن طريقاً سريعاً', noWait:'انطلق عند الجاهزية — قارن الدقائق والسالك أدناه.', closeReason:'الفرق أقل من 3 دقائق', onlyReason:'أرجع Google مساراً صالحاً واحداً', avoidTolls:'يتجنب طرق الرسوم', avoidHighways:'يتجنب المقاطع السريعة', calmer:'حركة مرور أكثر هدوءاً الآن', shorter:'مسافة أقصر', slowerBecause:'هذا المسار أبطأ لكنه مُختار لأن', low:'منخفضة', medium:'متوسطة', high:'عالية',
      salikCostNarr:'سالك نحو {aed} درهم ({gates} بوابات)', salikFreeVs:'بدون سالك مقارنة ببديل برسوم', pickBySalik:'الأوقات متقاربة — قرّر حسب تكلفة سالك والراحة.', stabBetter:'وقت وصول أكثر استقراراً من البديل الرئيسي'
    }
  };
  function dict(){ const lang = getLang(); return L[lang] || L.en; }
  function tpl(s, obj){ return String(s || '').replace(/\{(\w+)\}/g, function(_, k){ return obj && obj[k] != null ? obj[k] : ''; }); }

  /** Этап 2: сигнатура набора маршрутов + prefs для гистерезиса выбора (без скачков при почти равных aiScore). */
  function clearRoadAiChoiceSignature(routes){
    const list = (Array.isArray(routes) ? routes : []).filter(Boolean).slice().sort(function(a, b){ return Number(a.index) - Number(b.index); });
    const p = pref();
    const f = filters();
    const fk = (f.avoidTolls ? '1' : '0') + (f.avoidHighways ? '1' : '0') + (f.fewerTurns ? '1' : '0') + (f.avoidTraffic ? '1' : '0');
    let rm = 'fast';
    try { rm = getRouteMode(); } catch (_) {}
    return p + '|' + rm + '|' + fk + '|' + list.map(function(r){
      return String(r.index) + ':' + Math.round(minutes(r)) + ':' + (Math.round(aiScore(r) * 10) / 10);
    }).join(';');
  }

  function calmStress(route){
    if (!route) return 1e9;
    if (Number.isFinite(route.calmStressScore)) return route.calmStressScore;
    const sb = route.scoreBreakdown || {};
    if (Number.isFinite(sb.calmStressScore)) return sb.calmStressScore;
    if (Number.isFinite(route.stressScore)) return route.stressScore;
    return 1e9;
  }

  function buildRealDecision(routes){
    const rawInput = Array.isArray(routes) ? routes.filter(Boolean) : [];
    applyClearRoadRouteSanityMarks(rawInput);
    let routesForRanking = rawInput.filter(function(route){ return route && !route.invalidRoute; });
    if (!routesForRanking.length && rawInput.length) {
      try {
        if (window.__CLEAR_ROAD_ROUTE_DEBUG__ === true) {
          console.warn('[ROUTE REJECT]', 'buildRealDecision all sanity-filtered — keeping Google routes', rawInput.length);
        }
      } catch (_) {}
      rawInput.forEach(function(r) {
        if (r) {
          r.invalidRoute = false;
          delete r.invalidReason;
        }
      });
      routesForRanking = rawInput.filter(Boolean);
    }
    if (!routesForRanking.length) {
      try { window.__CLEAR_ROAD_AI_DECISION_STICKY__ = null; } catch (_) {}
      return {
        bestRoute: null,
        fastestRoute: null,
        alternatives: [],
        rankedRoutes: [],
        confidence: { level: "LOW", percent: 45, margin: 0, reason: "No sane routes after validation" },
        selectedRouteId: null,
        selectedRouteIndex: null,
        aiDecision: { type: "NONE", headline: "", why: [], tradeoff: [], when: "", bestMinutes: null, secondMinutes: null, deltaMinutes: null, scoreGap: 0, routeName: "" },
        generatedAt: new Date().toISOString(),
        version: TZ8_VERSION
      };
    }
    const choiceSig = clearRoadAiChoiceSignature(routesForRanking);
    const ranked = rankRoutes(routesForRanking);
    const fastest = ranked.slice().sort(function(a,b){ return minutes(a) - minutes(b) || aiScore(a) - aiScore(b); })[0] || null;
    const saneCandidates = ranked.filter(function(route){
      if (!route || !fastest) return false;
      const tooSlow = isTooSlowCandidate(route, fastest, ranked);
      if (!tooSlow) return true;
      route.tooSlow = true;
      route.notRecommended = true;
      return canSelectSlowRoute(route, fastest, ranked);
    });
    const routeMode = getRouteMode();
    let orderedForChoice = saneCandidates.slice();
    if (routeMode === 'calm' && orderedForChoice.length > 1) {
      orderedForChoice.sort(function(a, b){
        const ca = calmStress(a);
        const cb = calmStress(b);
        if (ca !== cb) return ca - cb;
        return minutes(a) - minutes(b);
      });
    }
    let best = orderedForChoice[0] || ranked[0] || null;
    const CHOICE_HYST = 2.8;
    const CALM_STRESS_HYST = 3.5;
    try {
      const st = window.__CLEAR_ROAD_AI_DECISION_STICKY__;
      if (best && st && st.sig === choiceSig && st.bestIndex != null && Number.isFinite(Number(st.bestIndex))) {
        const prev = routesForRanking.find(function(r){ return r && Number(r.index) === Number(st.bestIndex); });
        if (prev && orderedForChoice.some(function(r){ return sameRoute(r, prev); })) {
          if (routeMode === 'calm') {
            const stressGap = calmStress(prev) - calmStress(best);
            if (stressGap >= 0 && stressGap < CALM_STRESS_HYST) best = prev;
          } else {
            const gap = aiScore(prev) - aiScore(best);
            if (gap >= 0 && gap < CHOICE_HYST) best = prev;
          }
        }
      }
    } catch (_hy) {}
    const alternatives = best ? ranked.filter(function(r){ return !sameRoute(r, best); }) : [];
    const second = alternatives[0] || null;
    const d = dict();
    const p = pref();
    const f = filters();
    const bestMin = minutes(best);
    const secondMin = minutes(second);
    const delta = second ? secondMin - bestMin : null;
    const scoreGap = second ? Math.max(0, aiScore(second) - aiScore(best)) : 100;

    const timeGap = second ? Math.round(secondMin - bestMin) : 0;
    const delayGap = second ? Math.max(0, delay(second) - delay(best)) : 0;
    const distGap = second ? Math.round((km(second) - km(best)) * 10) / 10 : 0;
    const stopGap = second ? Math.max(0, stops(second) - stops(best)) : 0;
    const bestNoToll = best ? !hasTolls(best) : false;
    const secondHasToll = second ? hasTolls(second) : false;
    const bestNoHighway = best ? !hasHighway(best) : false;
    const secondHasHighway = second ? hasHighway(second) : false;

    let type = 'GO_NOW';
    let headline = d.go;
    let reason = d.fastest;
    let confidenceLevel = 'MEDIUM';
    let confidencePercent = 70;

    if (!second) {
      type = 'ONLY_ROUTE'; headline = d.only; reason = d.onlyReason; confidenceLevel = 'HIGH'; confidencePercent = 88;
    } else if ((p === 'no_tolls' || f.avoidTolls) && bestNoToll && secondHasToll) {
      reason = d.slowerBecause + ' ' + d.avoidTolls;
    } else if (f.avoidHighways && bestNoHighway && secondHasHighway) {
      reason = d.slowerBecause + ' ' + d.avoidHighways;
    } else if (timeGap >= 2) {
      reason = tpl(d.altSlower, {x: timeGap});
    } else if (delayGap >= 2 || trafficRank(best) < trafficRank(second)) {
      reason = d.calmer;
    } else if (distGap >= 1.5) {
      reason = d.shorter;
    } else if (stopGap >= 2) {
      reason = d.fewerStops;
    } else if (Math.abs(delta) < 1 || delta < 3 || scoreGap < 3) {
      type = 'SIMILAR'; headline = d.close; reason = d.closeReason;
    }
    const slowVsFastest = fastest ? routeDeltaVsFastest(best, fastest) : { deltaMin:0, deltaPct:0 };
    if (slowVsFastest.deltaMin > 0 && (slowVsFastest.deltaMin > 20 || slowVsFastest.deltaPct > 0.35) && !/^This route is slower, but selected because/i.test(reason)) {
      reason = d.slowerBecause + ' ' + reason.toLowerCase();
    }

    const why = [];
    why.push(reason);
    if (second && trafficRank(best) < trafficRank(second)) why.push(d.betterTraffic);
    if (second && stops(best) + 1 < stops(second)) why.push(d.fewerStops);
    if (second && distGap >= 1.5) why.push(d.shorter);
    if (second && salikAed(second) > 0.5 && salikAed(best) < 0.5) why.push(d.salikFreeVs);
    if (second) {
      const sb = safeNum(best && best.stabilityScore, 50);
      const ss = safeNum(second && second.stabilityScore, 50);
      if (sb >= ss + 8) why.push(d.stabBetter);
    }
    const trade = [];
    const sa = salikAed(best);
    const sg = salikGates(best);
    if (best && sa > 0.5) trade.push(tpl(d.salikCostNarr, { aed: Math.round(sa), gates: sg }));
    else if (best && hasTolls(best)) trade.push(d.toll);
    if (best && hasHighway(best)) trade.push(d.highway);
    if (second && timeGap <= 1) trade.push(d.altClose);
    else if (!trade.length && second && timeGap > 0) trade.push(tpl(d.altSlower, {x: timeGap}));
    if (!trade.length) trade.push(d.onlyReason);

    let whenText = d.noWait;
    if (type === 'SIMILAR' && second && Math.abs(salikAed(best) - salikAed(second)) > 1.5) {
      whenText = d.pickBySalik;
    }

    const ai = {
      type,
      headline,
      why: unique(why).slice(0,3),
      tradeoff: unique(trade).slice(0,3),
      when: whenText,
      bestMinutes: bestMin,
      secondMinutes: secondMin,
      deltaMinutes: second ? delta : null,
      scoreGap,
      routeName: routeName(best)
    };

    if (best) {
      best.isBestRoute = true;
      best.aiSelected = true;
      best.decisionRank = 1;
      best.decisionScore = aiScore(best);
      best.aiDecision = ai;
      best.whyPoints = ai.why.slice();
      best.why = ai.why.join(' · ');
      best.tradeOff = ai.tradeoff.join(' · ');
    }
    alternatives.forEach(function(route, i){
      route.isBestRoute = false;
      route.aiSelected = false;
      route.decisionRank = i + 2;
      route.decisionScore = aiScore(route);
    });

    try {
      if (best) window.__CLEAR_ROAD_AI_DECISION_STICKY__ = { sig: choiceSig, bestIndex: best.index };
      else window.__CLEAR_ROAD_AI_DECISION_STICKY__ = null;
    } catch (_st) {}

    const conf = confidenceV2(best, fastest, second);
    confidenceLevel = conf.level;
    confidencePercent = conf.percent;
    return {
      bestRoute: best,
      fastestRoute: fastest,
      alternatives,
      rankedRoutes: ranked,
      confidence: { level: confidenceLevel, percent: confidencePercent, margin: conf.margin, reason: conf.reason },
      selectedRouteId: best ? best.id : null,
      selectedRouteIndex: best ? best.index : null,
      aiDecision: ai,
      generatedAt: new Date().toISOString(),
      version: TZ8_VERSION
    };
  }

  function unique(arr){
    const out=[];
    (arr || []).forEach(function(x){ x = String(x || '').trim(); if (x && out.indexOf(x) === -1) out.push(x); });
    return out;
  }
  function esc(s){
    try { if (typeof _tz1EscapeHTML === 'function') return _tz1EscapeHTML(String(s == null ? '' : s)); } catch (_) {}
    return String(s == null ? '' : s).replace(/[&<>'"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]; });
  }

  window.buildRealDecision = buildRealDecision;
  try { window.__CLEAR_ROAD_ROUTE_DECISION_SSOT__ = buildRealDecision; } catch (_) {}
  window.buildAIDecision = buildRealDecision;
  window.calculateDecisionConfidence = function(bestRoute, alternatives){
    try {
      if (typeof currentDecision !== "undefined" && currentDecision && currentDecision.confidence && currentDecision.bestRoute && bestRoute) {
        if (Number(currentDecision.bestRoute.index) === Number(bestRoute.index))
          return currentDecision.confidence;
      }
    } catch (_) {}
    const routes = [bestRoute].concat(Array.isArray(alternatives) ? alternatives : []).filter(Boolean);
    return buildRealDecision(routes).confidence;
  };
  try { buildAIDecision = buildRealDecision; } catch (_) {}
  try { calculateDecisionConfidence = window.calculateDecisionConfidence; } catch (_) {}

  window.generateWhy = function(route, bestRoute, allRoutes){
    const decision = buildRealDecision(allRoutes && allRoutes.length ? allRoutes : (Array.isArray(analyzedRoutes) ? analyzedRoutes : [route, bestRoute].filter(Boolean)));
    if (route && decision.bestRoute && sameRoute(route, decision.bestRoute)) return decision.aiDecision.why.slice();
    const best = decision.bestRoute || bestRoute;
    const diff = minutes(route) - minutes(best);
    const d = dict();
    if (Number.isFinite(diff) && diff > 0) return [tpl(d.altSlower, {x: diff})];
    if (Number.isFinite(diff) && Math.abs(diff) < 1) return [d.altClose];
    return [d.betterTraffic];
  };
  window.generateWhyLine = function(route, allRoutes, bestRoute){
    return window.generateWhy(route, bestRoute, allRoutes).join(' · ');
  };
  try { generateWhy = window.generateWhy; } catch (_) {}
  try { generateWhyLine = window.generateWhyLine; } catch (_) {}

  window.getAIAdviceText = function(route){
    const decision = buildRealDecision(Array.isArray(analyzedRoutes) && analyzedRoutes.length ? analyzedRoutes : [route].filter(Boolean));
    const ai = decision.aiDecision;
    const tail = ai.when ? " " + ai.when : "";
    return ai.headline + ". " + (ai.why || []).join(" · ") + ". " + (ai.tradeoff || []).join(" · ") + "." + tail;
  };
  try { getAIAdviceText = window.getAIAdviceText; } catch (_) {}

  window.buildDecisionVoiceText = function(route){
    try {
      if (typeof window.crBuildRouteAdvisorVoiceBrief === "function") {
        const v = window.crBuildRouteAdvisorVoiceBrief(route);
        if (v) return v;
      }
    } catch (_) {}
    const decision = buildRealDecision(Array.isArray(analyzedRoutes) && analyzedRoutes.length ? analyzedRoutes : [route].filter(Boolean));
    const ai = decision.aiDecision;
    return [ai.headline].concat((ai.why || []).slice(0, 1)).concat([ai.when]).filter(Boolean).join(". ");
  };
  try { buildDecisionVoiceText = window.buildDecisionVoiceText; } catch (_) {}

  window.clearRoadTZ8Audit = function(){
    const routes = Array.isArray(analyzedRoutes) ? analyzedRoutes : [];
    const decision = buildRealDecision(routes);
    return {
      marker: window.__CLEAR_ROAD_TZ8_AI_ENGINE__ === TZ8_VERSION,
      hasDecision: !!decision.bestRoute,
      type: decision.aiDecision && decision.aiDecision.type,
      headline: decision.aiDecision && decision.aiDecision.headline,
      confidence: decision.confidence,
      alternatives: decision.alternatives.length,
      noFloatLeak: !/0\.\d{6,}/.test(document.body ? document.body.innerText : ''),
      renderWrapped: !!(window.renderResults && window.renderResults.__tz8Wrapped),
      corePresent: ['calculateRoutes','renderResults','startDriveMode','requestGPS','setLang'].every(function(fn){ return typeof window[fn] === 'function' || typeof globalThis[fn] === 'function'; })
    };
  };

  console.log('[TZ8] Real AI Logic Engine installed', TZ8_VERSION);
  [0, 400, 1200].forEach(function(t){ setTimeout(syncRouteModeUI, t); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncRouteModeUI, { once: true });
  else syncRouteModeUI();
})();
