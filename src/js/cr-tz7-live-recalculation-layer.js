//  ТЗ-7 — LIVE RECALCULATION LAYER
//  Periodically re-checks routes, rebuilds the Decision Layer,
//  and notifies the driver if a better route appears.
//  This patch does not change UI/CSS and does not rewrite ТЗ-1–6.
// ============================================================
(function() {
  const TZ7_RECALC_INTERVAL_MS = 90000;
  const TZ7_MIN_ALERT_GAP_MS = 60000;
  const TZ7_MIN_SCORE_GAIN = 4;
  const TZ7_MIN_TIME_GAIN_MIN = 1;

  let tz7Timer = null;
  let tz7InProgress = false;
  let tz7LastAlertAt = 0;
  let tz7LastSignature = "";

  function tz7Log(scope, err) {
    try { console.warn("[TZ7] " + scope, err); } catch (_) {}
  }

  function tz7CanUseMaps() {
    return !!(window.google && google.maps && directionsService && typeof directionsService.route === "function");
  }

  function tz7GetDestination() {
    const endEl = document.getElementById("end");
    return endEl && endEl.value ? endEl.value.trim() : "";
  }

  function tz7GetOrigin() {
    if (lastKnownUserLatLng) return lastKnownUserLatLng;
    const startEl = document.getElementById("start");
    const start = startEl && startEl.value ? startEl.value.trim() : "";
    return start || null;
  }

  function tz7NormalizeFreshRoutes(result) {
    const routeData = extractRoutesFromDirectionsResult(result);
    const extractionCheck = validateExtractedRoutes(routeData);
    if (!extractionCheck.ok) throw new Error(extractionCheck.message || "Route extraction failed");

    let freshRoutes = routeData.map(function(data, i) {
      const route = data.rawRoute || data.route;
      const leg = data.rawLeg || (route && route.legs ? route.legs[0] : null);
      const metrics = calculateRouteMetrics(route, leg, route);
      return normalizeRoute(Object.assign({}, data, {
        id: data.id || ("route-" + (i + 1)),
        route: route,
        index: i,
        displayIndex: i + 1,
        duration: data.duration,
        duration_in_traffic: data.duration_in_traffic,
        distance: data.distance,
        legs: data.legs,
        steps: data.steps,
        extractedRoute: data
      }, metrics), i);
    });

    const normalizationCheck = validateNormalizedRoutes(freshRoutes);
    if (!normalizationCheck.ok) throw new Error(normalizationCheck.message || "Route normalization failed");

    const canonical = buildCanonicalDecisionState(freshRoutes);
    return { routes: canonical.routes, decision: canonical.decision };
  }

  function tz7BuildLiveDecision(currentRoute, freshBest) {
    if (!currentRoute || !freshBest) return null;

    const currentMin = getDisplayMinutes(currentRoute);
    const freshMin = getDisplayMinutes(freshBest);
    const timeGain = currentMin - freshMin;

    const currentScore = Number.isFinite(currentRoute.score) ? currentRoute.score : 0;
    const freshScore = Number.isFinite(freshBest.score) ? freshBest.score : 0;
    const scoreGain = currentScore - freshScore;

    const routeChanged = Number(currentRoute.index) !== Number(freshBest.index);
    const hasUsefulGain = timeGain >= TZ7_MIN_TIME_GAIN_MIN || scoreGain >= TZ7_MIN_SCORE_GAIN;

    if (!routeChanged && !hasUsefulGain) return null;
    if (!hasUsefulGain) return null;

    return {
      action: timeGain >= 3 || scoreGain >= 8 ? "switch" : "suggest",
      confidence: timeGain >= 3 || scoreGain >= 8 ? "high" : "medium",
      title: timeGain > 0 ? ("Better route available → save " + timeGain + " min") : "Better route available",
      detail: (Array.isArray(freshBest.whyPoints) && freshBest.whyPoints.length ? freshBest.whyPoints.slice(0, 2).join(" · ") : (freshBest.why || "Improved live route")) + " via " + getRouteSummaryName(freshBest),
      timeGain: timeGain,
      scoreGain: scoreGain
    };
  }

  function tz7ApplyFreshRoutes(freshRoutes, freshDecision, result) {
    currentDirectionsResult = result;
    analyzedRoutes = freshRoutes;
    currentDecision = freshDecision;
    _bestRoute = freshDecision.bestRoute;
    _fastestRoute = freshRoutes.slice().sort(function(a, b) { return _tz1Minutes(a) - _tz1Minutes(b); })[0];

    if (selectedRoute) {
      const sameIndex = freshRoutes.find(function(route) { return Number(route.index) === Number(selectedRoute.index); });
      selectedRoute = sameIndex || freshDecision.bestRoute;
    } else {
      selectedRoute = freshDecision.bestRoute;
    }

    if (typeof renderResults === "function") renderResults();
    if (typeof drawRoutes === "function") drawRoutes(result);
  }

  function tz7ShowBetterRouteIfNeeded(previousSelected, freshDecision, freshRoutes, result) {
    if (!freshDecision || !freshDecision.bestRoute || !previousSelected) return;

    const freshBest = freshDecision.bestRoute;
    const liveDecision = tz7BuildLiveDecision(previousSelected, freshBest);
    if (!liveDecision) return;

    const now = Date.now();
    const signature = Number(previousSelected.index) + "→" + Number(freshBest.index) + ":" + Math.round(liveDecision.scoreGain || 0) + ":" + Math.round(liveDecision.timeGain || 0);
    if (signature === tz7LastSignature && now - tz7LastAlertAt < TZ7_MIN_ALERT_GAP_MS) return;

    tz7ApplyFreshRoutes(freshRoutes, freshDecision, result);

    betterRouteIndex = freshBest.index;
    _rerouteDecision = {
      action: liveDecision.action,
      confidence: liveDecision.confidence,
      targetIndex: freshBest.index,
      title: liveDecision.title,
      detail: liveDecision.detail,
      scoreGain: liveDecision.scoreGain || 0,
      timeGain: liveDecision.timeGain || 0,
      createdAt: now,
      source: "TZ7 live recalculation"
    };

    tz7LastSignature = signature;
    tz7LastAlertAt = now;

    if (typeof renderDriveAlertDecision === "function") {
      renderDriveAlertDecision(liveDecision, freshBest);
    } else {
      const alert = document.getElementById("drive-alert");
      const message = document.getElementById("drive-alert-message");
      if (alert && message) {
        message.textContent = liveDecision.title + " — " + liveDecision.detail;
        alert.classList.add("visible");
      }
    }

    if (driveMap && freshBest.route && freshBest.route.bounds) {
      try { driveMap.fitBounds(freshBest.route.bounds); } catch (_) {}
    }
  }

  function runLiveRecalculation() {
    if (tz7InProgress) return;
    if (!tz7CanUseMaps()) return;
    if (!selectedRoute && !currentDecision) return;

    const tickNow = Date.now();
    if (typeof offRouteRecalcInProgress !== "undefined" && offRouteRecalcInProgress) return;
    if (tickNow - lastOffRouteRecalcAt < DRIVE_OFF_ROUTE_REROUTE_COOLDOWN_MS) return;
    if (tickNow - lastDriveDirectionsRequestAt < DRIVE_DIRECTIONS_MIN_GAP_MS) return;

    const origin = tz7GetOrigin();
    const destination = tz7GetDestination();
    if (!origin || !destination) return;

    const previousSelected = selectedRoute || (currentDecision && currentDecision.bestRoute) || _bestRoute;
    if (!previousSelected) return;

    tz7InProgress = true;
    lastDriveDirectionsRequestAt = Date.now();

    directionsService.route({
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: true,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: "bestguess"
      }
    }, function(result, status) {
      tz7InProgress = false;
      try {
        if (status !== "OK" || !result || !Array.isArray(result.routes) || !result.routes.length) return;

        const fresh = tz7NormalizeFreshRoutes(result);
        const freshBest = fresh.decision && fresh.decision.bestRoute;
        if (!freshBest) return;

        const liveDecision = tz7BuildLiveDecision(previousSelected, freshBest);
        if (liveDecision) {
          tz7ShowBetterRouteIfNeeded(previousSelected, fresh.decision, fresh.routes, result);
        }
      } catch (e) {
        tz7Log("runLiveRecalculation callback", e);
      }
    });
  }

  function startTZ7LiveRecalculation() {
    stopTZ7LiveRecalculation();
    tz7Timer = setInterval(runLiveRecalculation, TZ7_RECALC_INTERVAL_MS);
  }

  function stopTZ7LiveRecalculation() {
    if (tz7Timer) {
      clearInterval(tz7Timer);
      tz7Timer = null;
    }
    tz7InProgress = false;
  }

  const tz7OriginalStartDriveMode = typeof startDriveMode === "function" ? startDriveMode : null;
  if (tz7OriginalStartDriveMode) {
    startDriveMode = function(index) {
      const result = tz7OriginalStartDriveMode.apply(this, arguments);
      startTZ7LiveRecalculation();
      return result;
    };
  }

  const tz7OriginalExitDriveMode = typeof exitDriveMode === "function" ? exitDriveMode : null;
  if (tz7OriginalExitDriveMode) {
    exitDriveMode = function() {
      stopTZ7LiveRecalculation();
      return tz7OriginalExitDriveMode.apply(this, arguments);
    };
  }

  const tz7OriginalClearRoutes = typeof clearRoutes === "function" ? clearRoutes : null;
  if (tz7OriginalClearRoutes) {
    clearRoutes = function() {
      stopTZ7LiveRecalculation();
      return tz7OriginalClearRoutes.apply(this, arguments);
    };
  }

  const tz7OriginalStopLiveDriveTracking = typeof stopLiveDriveTracking === "function" ? stopLiveDriveTracking : null;
  if (tz7OriginalStopLiveDriveTracking) {
    stopLiveDriveTracking = function() {
      stopTZ7LiveRecalculation();
      return tz7OriginalStopLiveDriveTracking.apply(this, arguments);
    };
  }

  window.clearRoadTZ7LiveRecalculation = {
    start: startTZ7LiveRecalculation,
    stop: stopTZ7LiveRecalculation,
    runNow: runLiveRecalculation,
    isRunning: function() { return !!tz7Timer; },
    intervalMs: TZ7_RECALC_INTERVAL_MS
  };
})();
