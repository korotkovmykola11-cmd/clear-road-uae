// ============================================================
//  ТЗ-2 FINAL — ROUTE DATA INTEGRITY / UAE ROUTING LOCK
//  Fixes: huge ETA/distance numbers, NOT_FOUND stale UI, plus-code text routing,
//  floating minute diffs, and wrong-country geocoding.
//  Scope: route input + Directions data only. Voice/visual design untouched.
// ============================================================
(function installTZ2RouteDataIntegrity(){
  'use strict';

  const TZ2_VERSION = 'TZ2_ROUTE_DATA_INTEGRITY_2026_04_25_FINAL';
  const UAE_BOUNDS = { minLat: 22.45, maxLat: 26.35, minLng: 51.45, maxLng: 56.55 };
  const ROUTE_TIMEOUT_MS = 14000;
  const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}/i;

  window.tz2RouteDataIntegrity = window.tz2RouteDataIntegrity || { version: TZ2_VERSION };
  const tz2State = window.tz2RouteDataIntegrity;
  tz2State.selected = tz2State.selected || { start: null, end: null };

  function $(id){ return document.getElementById(id); }
  function htmlEscape(value){
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function showRouteError(message){
    const results = $('results');
    if (results) results.innerHTML = '<div class="error">' + htmlEscape(message) + '</div>';
  }
  function clearRouteStateOnly(){
    try { if (typeof clearRoutes === 'function') clearRoutes(); } catch(e) { console.warn('[TZ2] clearRoutes skipped', e); }
    try {
      currentDirectionsResult = null;
      analyzedRoutes = [];
      selectedRoute = null;
      _bestRoute = null;
      _fastestRoute = null;
      currentDecision = null;
    } catch (_) {}
    try { window.__CLEAR_ROAD_AI_DECISION_STICKY__ = null; } catch (_) {}
  }
  function isGoogleReady(){
    return !!(window.google && google.maps && google.maps.DirectionsService && google.maps.Geocoder && directionsService && typeof directionsService.route === 'function');
  }
  function numeric(v){ const n = Number(v); return Number.isFinite(n) ? n : null; }
  function latOf(loc){
    if (!loc) return null;
    if (typeof loc.lat === 'function') return numeric(loc.lat());
    return numeric(loc.lat);
  }
  function lngOf(loc){
    if (!loc) return null;
    if (typeof loc.lng === 'function') return numeric(loc.lng());
    return numeric(loc.lng);
  }
  function toLatLngLiteral(loc){
    const lat = latOf(loc), lng = lngOf(loc);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }
  function isInsideUAE(loc){
    const p = toLatLngLiteral(loc);
    if (!p) return false;
    return p.lat >= UAE_BOUNDS.minLat && p.lat <= UAE_BOUNDS.maxLat && p.lng >= UAE_BOUNDS.minLng && p.lng <= UAE_BOUNDS.maxLng;
  }
  function looksLikePlusCode(text){ return PLUS_CODE_RE.test(String(text || '').trim()); }
  /** Loose match so Autocomplete full address ↔ truncated input still pairs with Places geometry. */
  function tz2AddressesLooselyMatch(a, b){
    const x = String(a || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const y = String(b || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!x || !y) return false;
    if (x === y) return true;
    if (x.includes(y) || y.includes(x)) return true;
    const strip = function(s){ return s.replace(/[,،]/g, '').replace(/\s+/g, ''); };
    const xs = strip(x); const ys = strip(y);
    if (xs === ys) return true;
    if (ys.includes(xs) || xs.includes(ys)) return true;
    return false;
  }
  /**
   * Autocomplete binding runs calculateRoutes before TZ2 place_changed saves geometry.
   * Sync from Autocomplete.getPlace() when text matches — avoids bad geocodes / empty routes.
   */
  function syncAutocompleteGeometryIntoTz2(){
    ['start','end'].forEach(function(kind){
      const input = $(kind);
      const ac = kind === 'start'
        ? window.__clearRoadStartAutocomplete
        : window.__clearRoadEndAutocomplete;
      if (!input || !ac || typeof ac.getPlace !== 'function') return;
      const place = ac.getPlace();
      if (!place || !place.geometry || !place.geometry.location) return;
      const addr = (place.formatted_address || place.name || '').trim();
      const val = (input.value || '').trim();
      if (!val) return;
      if (addr && !tz2AddressesLooselyMatch(addr, val)) return;
      saveSelectedPoint(kind, place);
    });
  }
  function routeDebugOn(){
    try { return window.__CLEAR_ROAD_ROUTE_DEBUG__ === true; } catch (e) { return false; }
  }
  function routeCalcDebug(label, payload){
    try {
      if (routeDebugOn()) console.info('[ClearRoad route]', label, payload);
    } catch (_) {}
  }
  function appendUAE(text){
    const raw = String(text || '').trim();
    if (!raw) return raw;
    if (/\b(uae|united arab emirates|دولة الإمارات|الإمارات)\b/i.test(raw)) return raw;
    if (/\b(dubai|sharjah|ajman|abu dhabi|ras al khaimah|fujairah|umm al quwain|al ain|jebel ali|terminal)\b/i.test(raw)) {
      return raw + ', United Arab Emirates';
    }
    return raw + ', UAE';
  }
  function normalizeTerminalText(text){
    const v = String(text || '').trim();
    if (/dubai\s*(terminal|termina|termi)\s*2/i.test(v) || /terminal\s*2/i.test(v)) {
      return 'Dubai International Airport Terminal 2, Dubai, United Arab Emirates';
    }
    if (/dubai\s*(terminal|termina|termi)\s*3/i.test(v) || /terminal\s*3/i.test(v)) {
      return 'Dubai International Airport Terminal 3, Dubai, United Arab Emirates';
    }
    if (/dubai\s*(terminal|termina|termi)\s*1/i.test(v) || /terminal\s*1/i.test(v)) {
      return 'Dubai International Airport Terminal 1, Dubai, United Arab Emirates';
    }
    return v;
  }
  function saveSelectedPoint(kind, place){
    if (!place) return null;
    const loc = place.geometry && place.geometry.location ? toLatLngLiteral(place.geometry.location) : toLatLngLiteral(place.location || place.latLng || place);
    if (!loc || !isInsideUAE(loc)) return null;
    const saved = {
      kind,
      latLng: loc,
      placeId: place.place_id || place.placeId || null,
      name: place.name || place.formatted_address || place.description || '',
      address: place.formatted_address || place.name || place.description || ''
    };
    tz2State.selected[kind] = saved;
    const input = $(kind);
    if (input) input.__tz2SelectedPoint = saved;
    return saved;
  }
  function getSavedPoint(kind){
    const input = $(kind);
    const p = (input && input.__tz2SelectedPoint) || tz2State.selected[kind];
    return p && p.latLng && isInsideUAE(p.latLng) ? p : null;
  }
  function geocodeUAE(text){
    return new Promise((resolve, reject) => {
      if (!window.google || !google.maps || !google.maps.Geocoder) return reject(new Error('Geocoder unavailable'));
      const geocoder = tz2State.geocoder || (tz2State.geocoder = new google.maps.Geocoder());
      const query = appendUAE(normalizeTerminalText(text));
      const timer = setTimeout(() => reject(new Error('Geocode timeout')), ROUTE_TIMEOUT_MS);
      geocoder.geocode({
        address: query,
        componentRestrictions: { country: 'AE' },
        region: 'AE'
      }, (results, status) => {
        clearTimeout(timer);
        if (status !== 'OK' || !results || !results.length) return reject(new Error('Address not found in UAE: ' + status));
        const best = results.find(r => r.geometry && r.geometry.location && isInsideUAE(r.geometry.location));
        if (!best) return reject(new Error('Address resolved outside UAE'));
        resolve({ latLng: toLatLngLiteral(best.geometry.location), address: best.formatted_address || query, placeId: best.place_id || null });
      });
    });
  }
  async function resolveRoutePoint(kind){
    const input = $(kind);
    const text = (input && input.value ? input.value : '').trim();
    if (!text) throw new Error(kind === 'start' ? 'Enter start point' : 'Enter destination');

    const saved = getSavedPoint(kind);
    if (saved && !looksLikePlusCode(text)) return saved;

    // For current-position plus codes/reverse geocode strings, use live GPS coordinates instead of routing by text.
    const liveUserLatLng =
      (typeof lastKnownUserLatLng !== 'undefined' && lastKnownUserLatLng)
        ? lastKnownUserLatLng
        : ((typeof smoothedUserLatLng !== 'undefined' && smoothedUserLatLng) ? smoothedUserLatLng : null);

    if (kind === 'start' && liveUserLatLng && isInsideUAE(liveUserLatLng)) {
      if (looksLikePlusCode(text) || /current location|my location|al nuaimi|al nuaimia|ajman/i.test(text)) {
        return { latLng: toLatLngLiteral(liveUserLatLng), address: text || 'Current location', placeId: null };
      }
    }

    const resolved = await geocodeUAE(text);
    tz2State.selected[kind] = { kind, ...resolved };
    if (input) input.__tz2SelectedPoint = tz2State.selected[kind];
    return tz2State.selected[kind];
  }
  function routeLegValues(route){
    const leg = route && route.legs && route.legs[0];
    if (!leg) return null;
    const duration = (leg.duration_in_traffic || leg.duration || {}).value;
    const distance = (leg.distance || {}).value;
    return { duration: numeric(duration), distance: numeric(distance) };
  }
  function validateRealUaeDirections(result){
    if (!result || !Array.isArray(result.routes) || !result.routes.length) {
      return { ok:false, message:'No route returned by Google Directions' };
    }
    for (const route of result.routes) {
      const v = routeLegValues(route);
      if (!v || !Number.isFinite(v.duration) || !Number.isFinite(v.distance)) {
        return { ok:false, message:'Route data is incomplete' };
      }
      if (v.duration <= 0 || v.distance <= 0) {
        return { ok:false, message:'Route data is invalid' };
      }
    }
    return { ok:true };
  }
  function requestDirectionsSafe(originPoint, destinationPoint){
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ status:'TIMEOUT', result:null }), ROUTE_TIMEOUT_MS);
      directionsService.route({
        origin: originPoint.latLng,
        destination: destinationPoint.latLng,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: { departureTime: new Date(), trafficModel: 'bestguess' },
        region: 'AE'
      }, (result, status) => {
        clearTimeout(timer);
        resolve({ result, status });
      });
    });
  }
  function prepareAnalyzedRoutes(result){
    const dbg = routeDebugOn();
    if (dbg && result && Array.isArray(result.routes)) {
      result.routes.forEach(function(gr, idx) {
        var L = gr.legs || [];
        var A = L[0];
        console.log('[ROUTE PRE] directions-raw', idx, {
          summary: gr.summary,
          legs: L.length,
          durationValue: A && A.duration && A.duration.value,
          distanceValue: A && A.distance && A.distance.value,
          startAddress: A && A.start_address,
          endAddress: A && A.end_address
        });
      });
    }

    const routeData = extractRoutesFromDirectionsResult(result);
    if (dbg) {
      routeData.forEach(function(r, i) {
        console.log('[ROUTE PRE] extracted', i, {
          id: r.id,
          summary: r.summary,
          duration: r.duration,
          duration_in_traffic: r.duration_in_traffic,
          distance: r.distance,
          legs: r.legs ? r.legs.length : 0,
          steps: r.steps ? r.steps.length : 0
        });
      });
    }

    const extractionCheck = validateExtractedRoutes(routeData);
    if (!extractionCheck.ok) {
      if (dbg) console.warn('[ROUTE REJECT]', 'validateExtractedRoutes', extractionCheck.message);
      throw new Error(extractionCheck.message);
    }

    let routes = routeData.map((data, i) => {
      const route = data.rawRoute || data.route;
      const leg = data.rawLeg || (route && route.legs ? route.legs[0] : null);
      const metrics = calculateRouteMetrics(route, leg, route);
      return normalizeRoute({
        ...data,
        id: data.id || `route-${i + 1}`,
        route,
        index: i,
        displayIndex: i + 1,
        duration: data.duration,
        duration_in_traffic: data.duration_in_traffic,
        distance: data.distance,
        legs: data.legs,
        steps: data.steps,
        extractedRoute: data,
        ...metrics
      }, i);
    });

    if (dbg) {
      routes.forEach(function(r, i) {
        console.log('[ROUTE PRE] normalized', i, {
          id: r.id,
          summary: r.summary,
          durationSec: r.durationSec,
          durationTrafficSec: r.durationTrafficSec,
          distanceKm: r.distanceKm,
          legs: r.legs ? r.legs.length : 0,
          steps: r.steps ? r.steps.length : 0
        });
      });
    }

    const normalizationCheck = validateNormalizedRoutes(routes);
    if (!normalizationCheck.ok) {
      if (dbg) console.warn('[ROUTE REJECT]', 'validateNormalizedRoutes', normalizationCheck.message);
      throw new Error(normalizationCheck.message);
    }

    routes = scoreRoutes(routes);
    const scoreCheck = validateScoredRoutes(routes);
    if (!scoreCheck.ok) {
      if (dbg) console.warn('[ROUTE REJECT]', 'validateScoredRoutes', scoreCheck.message);
      throw new Error(scoreCheck.message);
    }

    applyClearRoadRouteSanityMarks(routes);
    const beforeFilter = routes.slice();
    routes = routes.filter(function(r){ return r && !r.invalidRoute; });

    if (!routes.length && beforeFilter.length) {
      if (dbg) {
        console.warn('[ROUTE REJECT] prepareAnalyzedRoutes all sanity-filtered — recovering Google routes', beforeFilter.length);
      }
      beforeFilter.forEach(function(r) {
        if (r) {
          r.invalidRoute = false;
          delete r.invalidReason;
        }
      });
      routes = beforeFilter.filter(Boolean);
    }

    if (!routes.length) {
      routeCalcDebug('prepareAnalyzedRoutes-empty', {
        reason: 'no routes after processing',
        rawRouteCount: routeData && routeData.length
      });
      throw new Error("Route data looks incorrect. Please choose a more specific destination.");
    }
    return routes;
  }
  function renderPreparedRoutes(result, routes, originPoint, destinationPoint){
    currentDirectionsResult = result;
    const canonical = buildCanonicalDecisionState(routes, { assumeScored: true });
    analyzedRoutes = canonical.routes;
    currentDecision = canonical.decision;
    _bestRoute = canonical.bestRoute;
    _fastestRoute = canonical.fastestRoute;
    selectedRoute = _bestRoute;

    try {
      document.documentElement.setAttribute("data-route-state", "READY");
    } catch (_rdy) {}

    renderResults();
    drawRoutes(result);

    try { runPredictiveCheck(originPoint.latLng, destinationPoint.latLng, getDisplayMinutes(_bestRoute)); } catch(e) { console.warn('[TZ2] predictive skipped', e); }
  }

  const originalCalculateRoutes = typeof window.calculateRoutes === 'function' ? window.calculateRoutes : calculateRoutes;
  window.calculateRoutes = calculateRoutes = async function calculateRoutesTZ2Final(){
    clearRouteStateOnly();
    const startText = ($('start') && $('start').value || '').trim();
    const endText = ($('end') && $('end').value || '').trim();
    _parkingType = typeof detectParkingType === 'function' ? detectParkingType(endText) : null;

    if (!startText || !endText) {
      const results = $('results');
      if (results) results.innerHTML = '';
      return;
    }
    if (!isGoogleReady()) {
      showRouteError('Map service unavailable. Try again shortly.');
      return;
    }

    const results = $('results');
    if (results) results.innerHTML = '<div class="loading">Finding best UAE routes...</div>';

    try {
      syncAutocompleteGeometryIntoTz2();
      const originPoint = await resolveRoutePoint('start');
      const destinationPoint = await resolveRoutePoint('end');
      routeCalcDebug('resolved-points', {
        startInput: startText,
        endInput: endText,
        origin: originPoint && originPoint.latLng,
        destination: destinationPoint && destinationPoint.latLng
      });
      if (!originPoint || !destinationPoint || !isInsideUAE(originPoint.latLng) || !isInsideUAE(destinationPoint.latLng)) {
        throw new Error('Choose valid UAE start and destination from suggestions.');
      }

      const { result, status } = await requestDirectionsSafe(originPoint, destinationPoint);
      routeCalcDebug('directions-response', {
        status,
        routesCount: result && Array.isArray(result.routes) ? result.routes.length : 0
      });
      if (status !== 'OK') {
        clearRouteStateOnly();
        showRouteError('Could not find UAE route: ' + status + '. Choose address from suggestions.');
        return;
      }

      const realism = validateRealUaeDirections(result);
      if (!realism.ok) {
        clearRouteStateOnly();
        showRouteError(realism.message);
        return;
      }

      const routes = prepareAnalyzedRoutes(result);
      renderPreparedRoutes(result, routes, originPoint, destinationPoint);
    } catch (err) {
      clearRouteStateOnly();
      showRouteError(err && err.message ? err.message : 'Could not calculate route. Choose UAE address from suggestions.');
      console.warn('[TZ2] calculateRoutes blocked bad route data:', err);
      routeCalcDebug('calculate-error', {
        message: err && err.message,
        startInput: startText,
        endInput: endText,
        hints: 'Set window.__CLEAR_ROAD_ROUTE_DEBUG__ = true for full traces'
      });
    }
  };
  try { window.__CLEAR_ROAD_ROUTE_CALC_CORE__ = calculateRoutes; } catch (_) {}

  // Wire TZ2 geometry capture to the single core Places Autocomplete (no second widget per input).
  function installUAEAutocomplete(){
    if (!window.google || !google.maps || !google.maps.places || !google.maps.places.Autocomplete) return false;
    function getCoreAc(kind){
      try {
        if (kind === 'start' && window.__clearRoadStartAutocomplete) return window.__clearRoadStartAutocomplete;
        if (kind === 'end' && window.__clearRoadEndAutocomplete) return window.__clearRoadEndAutocomplete;
      } catch (_) {}
      return null;
    }
    ['start','end'].forEach((kind) => {
      const input = $(kind);
      if (!input || input.dataset.tz2AutocompleteFinal === '1') return;
      const ac = getCoreAc(kind);
      if (!ac || typeof ac.addListener !== 'function') return;
      if (!ac.__tz2SavePointWired) {
        ac.__tz2SavePointWired = true;
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          const saved = saveSelectedPoint(kind, place);
          if (!saved) {
            tz2State.selected[kind] = null;
            input.__tz2SelectedPoint = null;
            return;
          }
          if (saved.address) input.value = saved.address;
          const s = ($('start') && $('start').value || '').trim();
          const e = ($('end') && $('end').value || '').trim();
          if (s && e) setTimeout(() => window.calculateRoutes(), 50);
        });
      }
      if (!input.__tz2ManualEditWired) {
        input.__tz2ManualEditWired = true;
        input.addEventListener('input', () => {
          input.__tz2SelectedPoint = null;
          tz2State.selected[kind] = null;
        });
      }
      input.dataset.tz2AutocompleteFinal = '1';
      tz2State[kind + 'Autocomplete'] = ac;
    });
    return true;
  }

  const originalInitAutocomplete = typeof window.initAutocomplete === 'function' ? window.initAutocomplete : null;
  if (originalInitAutocomplete) {
    window.initAutocomplete = initAutocomplete = function initAutocompleteTZ2Final(){
      try { originalInitAutocomplete.apply(this, arguments); } catch(e) { console.warn('[TZ2] original autocomplete skipped', e); }
      installUAEAutocomplete();
    };
  }
  const originalInitMap = typeof window.initMap === 'function' ? window.initMap : null;
  if (originalInitMap) {
    window.initMap = initMap = function initMapTZ2Final(){
      const result = originalInitMap.apply(this, arguments);
      setTimeout(installUAEAutocomplete, 250);
      return result;
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(installUAEAutocomplete, 500), { once:true });
  else setTimeout(installUAEAutocomplete, 500);

  // Formatting guard: no +2.1000000000000014 MIN and no impossible display values.
  function minutesNumber(route){
    if (!route) return 0;
    if (Number.isFinite(Number(route.time))) return Math.round((Number(route.time) / 60) * 10) / 10;
    if (Number.isFinite(Number(route.durationTrafficSec))) return Math.round((Number(route.durationTrafficSec) / 60) * 10) / 10;
    if (Number.isFinite(Number(route.duration_in_traffic))) return Math.round((Number(route.duration_in_traffic) / 60) * 10) / 10;
    if (Number.isFinite(Number(route.durationMin))) return Math.round(Number(route.durationMin) * 10) / 10;
    return 0;
  }
  window.getDisplayMinutes = getDisplayMinutes = function getDisplayMinutesTZ2(route){ return minutesNumber(route); };
  window.getDisplayDiff = getDisplayDiff = function getDisplayDiffTZ2(a,b){ return Math.round((minutesNumber(a) - minutesNumber(b)) * 10) / 10; };
  if (typeof _tz1Minutes === 'function') window._tz1Minutes = _tz1Minutes = function _tz1MinutesTZ2(route){ return minutesNumber(route); };

  if (typeof tz8RenderAlternativeCard === 'function') {
    const oldRouteName = typeof _tz1RouteName === 'function' ? _tz1RouteName : (r => (r && r.summary) || 'Route');
    window.tz8RenderAlternativeCard = tz8RenderAlternativeCard = function tz8RenderAlternativeCardTZ2(route, best, analyzedRoutes, idx) {
      const diff = Math.round(minutesNumber(route) - minutesNumber(best));
      const safeDiff = Math.abs(diff) < 1 ? 0 : diff;
      const diffText = safeDiff <= 0 ? 'same ETA' : '+' + safeDiff + ' min';
      const roleCls = safeDiff < 0 ? 'faster' : route.traffic === 'low' ? 'no-tolls' : 'relaxed';
      const distanceText = typeof tz8RouteDistanceKm === 'function' && tz8RouteDistanceKm(route) ? tz8RouteDistanceKm(route) + ' km' : 'distance n/a';
      const rank = Number.isFinite(route.decisionRank) ? route.decisionRank : idx + 2;
      const character = typeof tz9RouteCharacter === 'function' ? tz9RouteCharacter(route, best) : 'ALTERNATIVE ROUTE';
      const reason = typeof tz9CleanReason === 'function' ? tz9CleanReason(route, best, analyzedRoutes) : 'Alternative route available';
      const trafficText = route.trafficLabel || route.traffic || 'traffic';
      const scoreValue = Math.round(route.decisionScore || route.score || 0);
      const bestAltClass = idx === 0 ? ' best-alt' : '';
      let h = '';
      h += '<div class="alt-card-p tz9-alt-card" onclick="openRouteDetails(' + route.index + ')" data-decision-rank="' + htmlEscape(rank) + '" data-best-alternative="' + (idx === 0 ? 'true' : 'false') + '">';
      h += '<div class="alt-bar ' + roleCls + '"></div><div class="alt-body">';
      h += '<div class="tz9-route-tag' + bestAltClass + '">' + (idx === 0 ? 'BEST ALTERNATIVE' : 'ALTERNATIVE ' + (idx + 1)) + '</div>';
      h += '<div class="tz9-route-main"><div class="tz9-route-time">' + htmlEscape(minutesNumber(route)) + ' min</div><div class="tz9-route-diff' + (diff > 0 ? ' warn' : '') + '">' + htmlEscape(diffText) + '</div></div>';
      h += '<div class="tz9-route-title">' + htmlEscape(character) + ' · via ' + htmlEscape(oldRouteName(route)) + '</div>';
      h += '<div class="tz9-route-reason">' + htmlEscape(reason) + '</div>';
      h += '<div class="tz9-route-meta"><span class="tz9-pill">' + htmlEscape(distanceText) + '</span>';
      h += '<span class="tz9-pill ' + (typeof tz9TrafficClass === 'function' ? tz9TrafficClass(route) : '') + '">' + htmlEscape(trafficText) + '</span>';
      h += '<span class="tz9-pill">score ' + htmlEscape(scoreValue) + '</span></div></div>';
      h += '<div class="tz9-alt-end"><div class="tz9-score-label">rank</div><div class="tz9-score-value">#' + htmlEscape(rank) + '</div></div></div>';
      return h;
    };
  }

  document.documentElement.setAttribute('data-tz2-route-integrity', TZ2_VERSION);
  console.info('[TZ2] Route Data Integrity installed', { version: TZ2_VERSION });
})();
