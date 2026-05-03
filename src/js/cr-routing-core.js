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

    currentDecision = selectBestRouteDecision(analyzedRoutes);
    const decisionCheck = validateAIDecision(currentDecision);
    if (!decisionCheck.ok) {
      document.getElementById("results").innerHTML = `<div class="error">${decisionCheck.message}</div>`;
      return;
    }

    _bestRoute = currentDecision.bestRoute;
    _fastestRoute = [...analyzedRoutes].sort((a, b) => a.time - b.time)[0];
    selectedRoute = _bestRoute;

    // SSOT этап 1: не пересчитывать выбор маршрута вторым buildRealDecision — только WHY-тексты
    analyzedRoutes = applyWhyToRoutes(analyzedRoutes, _bestRoute);

    analyzedRoutes.forEach(r => {
      r.role = getRouteRole(r, _bestRoute, _fastestRoute, analyzedRoutes);
    });

    renderResults();
    drawRoutes(result);

    // Day 6.5: fire predictive check asynchronously — doesn't block current render
    runPredictiveCheck(start, end, getDisplayMinutes(_bestRoute));
  });
}

function drawRoutes(result) {
  renderers.forEach(function(renderer) { renderer.setMap(null); });
  renderers = [];

  const best = currentDecision && currentDecision.bestRoute ? currentDecision.bestRoute : _bestRoute;
  const alternatives = tz8GetDecisionAlternatives(currentDecision, best, analyzedRoutes);
  const ordered = alternatives.concat(best ? [best] : []);

  ordered.forEach(function(r) {
    if (!r || !Number.isFinite(r.index)) return;
    const isBest = best && r.index === best.index;
    const renderer = new google.maps.DirectionsRenderer({
      map: map,
      directions: result,
      routeIndex: r.index,
      suppressMarkers: !isBest,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: isBest ? "#22d3a0" : "#60a5fa",
        strokeOpacity: isBest ? 1 : 0.56,
        strokeWeight: isBest ? 6 : 4,
        zIndex: isBest ? 10 : 1
      }
    });
    renderers.push(renderer);
  });

  if (best && best.route && best.route.bounds) map.fitBounds(best.route.bounds);
}
