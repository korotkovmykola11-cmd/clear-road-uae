// cr-routing-core.js — extracted from input/index.html (main inline script).
// External module; depends on globals (script order in input / ТЗ-0).

function clearRoutes() {
  renderers.forEach(r => r.setMap(null));
  renderers = [];
  analyzedRoutes = [];
  selectedRoute = null;
  _bestRoute = null;
  _fastestRoute = null;
  currentDecision = null;
  activeDriveRouteIndex = null;
  activeDriveRouteSnapshot = null;
  try { window.__CLEAR_ROAD_AI_DECISION_STICKY__ = null; } catch (_) {}
  try { window.__clearRoadUserPickIndex = null; } catch (_) {}
  try { window.selectedRouteId = null; } catch (_) {}
  try {
    lastDriveDirectionsRequestAt = 0;
    _driveDisplayedEtaMin = null;
    _driveEtaSmoothLastAt = 0;
  } catch (_) {}
}

// ============================================================
//  ROUTE ANALYSIS + RENDERING
// ============================================================

function calculateRoutes() {
  clearRoutes();

  const start = document.getElementById("start").value.trim();
  const end = document.getElementById("end").value.trim();

  // ТЗ5: detect parking type (does NOT affect route selection)
  _parkingType = detectParkingType(end);

  if (!start || !end) {
    document.getElementById("results").innerHTML = "";
    return;
  }

  document.getElementById("results").innerHTML = '<div class="loading">Finding best routes...</div>';

  directionsService.route({
    origin: start,
    destination: end,
    travelMode: google.maps.TravelMode.DRIVING,
    provideRouteAlternatives: true,
    drivingOptions: {
      departureTime: new Date(),
      trafficModel: "bestguess"
    }
  }, (result, status) => {
    if (status !== "OK") {
      document.getElementById("results").innerHTML = `<div class="error">Could not find route: ${status}</div>`;
      return;
    }

    const routeData = extractRoutesFromDirectionsResult(result);
    const extractionCheck = validateExtractedRoutes(routeData);
    if (!extractionCheck.ok) {
      document.getElementById("results").innerHTML = `<div class="error">${extractionCheck.message}</div>`;
      return;
    }

    currentDirectionsResult = result;

    analyzedRoutes = routeData.map((data, i) => {
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

    const normalizationCheck = validateNormalizedRoutes(analyzedRoutes);
    if (!normalizationCheck.ok) {
      document.getElementById("results").innerHTML = `<div class="error">${normalizationCheck.message}</div>`;
      return;
    }

    analyzedRoutes = scoreRoutes(analyzedRoutes);

    const scoreCheck = validateScoredRoutes(analyzedRoutes);
    if (!scoreCheck.ok) {
      document.getElementById("results").innerHTML = `<div class="error">${scoreCheck.message}</div>`;
      return;
    }

    const canonical = buildCanonicalDecisionState(analyzedRoutes, { assumeScored: true });
    analyzedRoutes = canonical.routes;
    currentDecision = canonical.decision;
    const decisionCheck = validateAIDecision(currentDecision);
    if (!decisionCheck.ok) {
      document.getElementById("results").innerHTML = `<div class="error">${decisionCheck.message}</div>`;
      return;
    }

    _bestRoute = canonical.bestRoute;
    _fastestRoute = canonical.fastestRoute;
    selectedRoute = canonical.selectedRoute || canonical.bestRoute;
    try {
      window.selectedRouteId = selectedRoute && selectedRoute.id != null ? selectedRoute.id : null;
    } catch (_) {}

    renderResults();
    drawRoutes(result);

    // Day 6.5: fire predictive check asynchronously — doesn't block current render
    runPredictiveCheck(start, end, getDisplayMinutes(_bestRoute));
  });
}

function drawRoutes(result) {
  renderers.forEach(function(renderer) { renderer.setMap(null); });
  renderers = [];

  const sorted =
    typeof crSortRoutesByIndex === "function"
      ? crSortRoutesByIndex(analyzedRoutes)
      : Array.isArray(analyzedRoutes)
        ? analyzedRoutes.filter(function(r) { return r && Number.isFinite(r.index); })
        : [];
  const best = currentDecision && currentDecision.bestRoute ? currentDecision.bestRoute : _bestRoute;

  let userPicked = false;
  try {
    const v = window.__clearRoadUserPickIndex;
    userPicked = v !== null && v !== undefined && String(v) !== "" && Number.isFinite(Number(v));
  } catch (_) {}

  const focusRoute =
    userPicked && selectedRoute && sorted.some(function(r) { return r && selectedRoute && Number(r.index) === Number(selectedRoute.index); })
      ? selectedRoute
      : null;

  const mapOpts = { userPicked: userPicked };

  sorted.forEach(function(r) {
    if (!r || !Number.isFinite(r.index)) return;
    const poly =
      typeof crRoutePolylineOptionsForMap === "function"
        ? crRoutePolylineOptionsForMap(r, sorted, focusRoute, best, mapOpts)
        : {
            strokeColor: "#3b82f6",
            strokeWeight: 4,
            strokeOpacity: 0.8,
            zIndex: 10
          };
    const showMarkers = userPicked
      ? focusRoute && Number(r.index) === Number(focusRoute.index)
      : best && Number(r.index) === Number(best.index);
    const renderer = new google.maps.DirectionsRenderer({
      map: map,
      directions: result,
      routeIndex: r.index,
      suppressMarkers: !showMarkers,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: poly.strokeColor,
        strokeOpacity: poly.strokeOpacity,
        strokeWeight: poly.strokeWeight,
        zIndex: poly.zIndex
      }
    });
    renderers.push(renderer);
  });

  const boundsTarget = userPicked && focusRoute && focusRoute.route && focusRoute.route.bounds
    ? focusRoute
    : best && best.route && best.route.bounds
      ? best
      : null;
  if (boundsTarget && boundsTarget.route && boundsTarget.route.bounds) {
    try {
      map.fitBounds(boundsTarget.route.bounds, userPicked ? 48 : 32);
    } catch (_fb) {
      try {
        map.fitBounds(boundsTarget.route.bounds);
      } catch (_fb2) {}
    }
  }
}
