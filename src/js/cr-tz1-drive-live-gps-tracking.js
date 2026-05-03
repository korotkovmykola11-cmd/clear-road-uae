// ТЗ-2 [v22] — live GPS в Drive: watchPosition, сглаживание, маркер/камера, мягкий reroute / off-route recalc (монолит).
// Порядок DOM: сразу после cr-tz1-drive-voice-ai-advice.js — до cr-route-cards-ui-cleanup.js
// (нужны speakRerouteDecision из voice-ai; selectBestRoute из AI layer; applyWhyToRoutes из TZ4; calculateRouteScore из TZ3;
// updateDriveUI из drive-update-ui; isDriveGpsUsable / shouldTriggerSoftOffRouteReroute из cr-tz1-drive-gps-warnings).
// Из основного <script> до внешних файлов: getRerouteDecision, findBestCurrentStepIndex, setActiveDriveRoute, dismissAlert,
// directionsService, renderSelectedRouteOnDriveMap, updateDriveRouteStatusLabel, speakText и связанные глобалы.

function renderDriveAlertDecision(decision, altRoute) {
  const alert = document.getElementById("drive-alert");
  const message = document.getElementById("drive-alert-message");

  if (!alert || !message) return;

  if (!decision || decision.action === "stay" || !altRoute) {
    alert.classList.remove("visible");
    return;
  }

  const confidenceClass = decision.confidence === "high" ? "high" :
                          decision.confidence === "medium" ? "medium" : "low";

  const actionLabel = decision.action === "switch" ? "Switch recommended" : "Alternative suggested";
  const scoreText = Number.isFinite(decision.scoreGain) ? ("Score +" + Math.round(decision.scoreGain)) : "AI route check";

  _rerouteDecision = {
    action: decision.action,
    confidence: decision.confidence,
    targetIndex: altRoute.index,
    title: decision.title,
    detail: decision.detail,
    scoreGain: decision.scoreGain || 0,
    timeGain: decision.timeGain || 0,
    createdAt: Date.now()
  };

  const viaName = getRouteSummaryName(altRoute);
  message.innerHTML = `
    <div class="drive-alert-header">
      <span class="drive-alert-badge ${confidenceClass}">
        <span class="dot"></span>
        ${_tz1EscapeHTML(decision.confidence)} confidence
      </span>
      <span class="drive-alert-state ${decision.action}">${_tz1EscapeHTML(actionLabel)}</span>
    </div>
    <div class="drive-alert-title">${_tz1EscapeHTML(decision.title)}</div>
    <div class="drive-alert-detail">${_tz1EscapeHTML(decision.detail)}</div>
    <div class="drive-alert-meta">${_tz1EscapeHTML(scoreText)} · Via ${_tz1EscapeHTML(viaName)}</div>
  `;

  const primaryBtn = alert.querySelector(".drive-alert-btn.primary");
  const secondaryBtn = alert.querySelector(".drive-alert-btn.secondary");

  if (primaryBtn && secondaryBtn) {
    primaryBtn.textContent = decision.action === "switch" ? "Switch now" : "Try alternative";
    primaryBtn.className = `drive-alert-btn primary${decision.action === "suggest" ? " suggest" : ""}`;
    secondaryBtn.textContent = "Keep current";
  }

  alert.classList.add("visible");
  speakRerouteDecision(decision, altRoute);
}

function evaluateReroute(currentRoute, allRoutes) {
  if (!currentRoute || !Array.isArray(allRoutes) || allRoutes.length <= 1) return null;

  const now = Date.now();
  const alternatives = allRoutes.filter(function(route) {
    if (!route || route.index === currentRoute.index) return false;
    if (_rerouteDismissedIndex === route.index && now < _rerouteDismissedUntil) return false;
    return true;
  });

  let bestAlt = null;
  let bestDecision = null;

  alternatives.forEach(function(alt) {
    const decision = getRerouteDecision(currentRoute, alt);
    if (!decision || decision.action === "stay") return;

    if (!bestAlt) {
      bestAlt = alt;
      bestDecision = decision;
      return;
    }

    const currentPriority = bestDecision.action === "switch" ? 2 : bestDecision.action === "suggest" ? 1 : 0;
    const newPriority = decision.action === "switch" ? 2 : decision.action === "suggest" ? 1 : 0;

    const currentScoreGain = Number(bestDecision.scoreGain || 0);
    const newScoreGain = Number(decision.scoreGain || 0);
    const currentTimeGain = Number(bestDecision.timeGain || 0);
    const newTimeGain = Number(decision.timeGain || 0);

    if (
      newPriority > currentPriority ||
      (newPriority === currentPriority && newScoreGain > currentScoreGain) ||
      (newPriority === currentPriority && newScoreGain === currentScoreGain && newTimeGain > currentTimeGain)
    ) {
      bestAlt = alt;
      bestDecision = decision;
    }
  });

  if (!bestAlt || !bestDecision) return null;

  return {
    index: bestAlt.index,
    route: bestAlt,
    decision: bestDecision,
    signature: currentRoute.index + "→" + bestAlt.index + ":" + bestDecision.action
  };
}

function getUserLatLngFromPosition(pos) {
  return new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
}

function smoothUserPosition(newLatLng) {
  if (!smoothedUserLatLng) {
    smoothedUserLatLng = newLatLng;
    return newLatLng;
  }
  const alpha = 0.35;
  smoothedUserLatLng = new google.maps.LatLng(
    smoothedUserLatLng.lat() + (newLatLng.lat() - smoothedUserLatLng.lat()) * alpha,
    smoothedUserLatLng.lng() + (newLatLng.lng() - smoothedUserLatLng.lng()) * alpha
  );
  return smoothedUserLatLng;
}

function updateUserHeading(prevLatLng, nextLatLng) {
  if (!prevLatLng || !nextLatLng) return lastUserHeading || 0;

  const d = google.maps.geometry.spherical.computeDistanceBetween(prevLatLng, nextLatLng);
  if (d < 5) return lastUserHeading || 0;

  lastUserHeading = google.maps.geometry.spherical.computeHeading(prevLatLng, nextLatLng) || 0;
  return lastUserHeading;
}

function updateDriveUserMarker(userLatLng) {
  if (!driveMap) return;

  const icon = {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 6,
    fillColor: "#2563eb",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    rotation: lastUserHeading || 0,
    anchor: new google.maps.Point(0, 2)
  };

  if (!driveUserMarker) {
    driveUserMarker = new google.maps.Marker({
      position: userLatLng,
      map: driveMap,
      title: "You",
      zIndex: 9999,
      icon
    });
  } else {
    driveUserMarker.setPosition(userLatLng);
    driveUserMarker.setIcon(icon);
  }
}

function updateDriveCamera(userLatLng) {
  if (!driveMap || !followUserMode || !userLatLng) return;

  if (!driveMapHasFollowed) {
    driveMap.setZoom(17);
    driveMap.panTo(userLatLng);
    driveMapHasFollowed = true;
    return;
  }

  driveMap.panTo(userLatLng);

  const currentZoom = driveMap.getZoom() || 0;
  if (currentZoom < 16) {
    driveMap.setZoom(16);
  }
}

function handleLiveDrivePosition(pos) {
  if (!selectedRoute) return;

  if (!isDriveGpsUsable(pos)) {
    updateDriveGpsStatus(selectedRoute, null, "GPS weak" + formatGpsAccuracy());
    return;
  }

  const rawLatLng = getUserLatLngFromPosition(pos);
  const userLatLng = smoothUserPosition(rawLatLng);
  const prevLatLng = lastKnownUserLatLng;

  lastDriveGpsMoveMeters = prevLatLng
    ? google.maps.geometry.spherical.computeDistanceBetween(prevLatLng, userLatLng)
    : 999;

  updateUserHeading(prevLatLng, userLatLng);
  lastKnownUserLatLng = userLatLng;

  updateDriveUserMarker(userLatLng);
  updateDriveCamera(userLatLng);

  const nextStepIndex = findBestCurrentStepIndex(selectedRoute, userLatLng, currentStepIndex);
  if (nextStepIndex !== currentStepIndex) {
    currentStepIndex = nextStepIndex;
    lastWarningPhase = "";
    lastDriveVoiceStepIndex = -1;
    lastDriveVoicePhase = "";
  }

  updateDriveUI();

  if (shouldTriggerSoftOffRouteReroute(userLatLng, selectedRoute)) {
    handleOffRouteRecalculation(userLatLng);
    return;
  }

  const now = Date.now();
  if (currentStepIndex >= 2 && now - lastRerouteCheckAt > DRIVE_REROUTE_EVAL_INTERVAL_MS) {
    lastRerouteCheckAt = now;

    const reroute = evaluateReroute(selectedRoute, analyzedRoutes);

    if (!reroute) {
      if (betterRouteIndex !== null) {
        betterRouteIndex = null;
        _rerouteDecision = null;
        _rerouteLastSignature = "";
        const alert = document.getElementById("drive-alert");
        if (alert) alert.classList.remove("visible");
      }
      return;
    }

    const shouldShow = reroute.signature !== _rerouteLastSignature || now - _rerouteLastShownAt > 60000;
    betterRouteIndex = reroute.index;

    if (shouldShow) {
      _rerouteLastSignature = reroute.signature;
      _rerouteLastShownAt = now;
      renderDriveAlertDecision(reroute.decision, reroute.route);
    }
  }
}

function handleOffRouteRecalculation(userLatLng) {
  const now = Date.now();
  if (offRouteRecalcInProgress) return;
  if (now - lastOffRouteRecalcAt < DRIVE_OFF_ROUTE_REROUTE_COOLDOWN_MS) return;

  offRouteRecalcInProgress = true;
  lastOffRouteRecalcAt = now;
  lastDriveDirectionsRequestAt = now;
  betterRouteIndex = null;
  _rerouteDecision = null;
  dismissAlert();
  updateDriveGpsStatus(selectedRoute, null, "Off route · recalculating…");

  const destination = document.getElementById("end").value.trim();
  if (!destination || !directionsService) {
    offRouteRecalcInProgress = false;
    return;
  }

  directionsService.route({
    origin: userLatLng,
    destination,
    travelMode: google.maps.TravelMode.DRIVING,
    provideRouteAlternatives: true,
    drivingOptions: {
      departureTime: new Date(),
      trafficModel: "bestguess"
    }
  }, (result, status) => {
    offRouteRecalcInProgress = false;

    if (status !== "OK" || !result.routes?.length) {
      updateDriveGpsStatus(selectedRoute, null, "Off route · recalculation unavailable");
      return;
    }

    currentDirectionsResult = result;

    analyzedRoutes = result.routes.map((route, i) => {
      const leg = route.legs[0];
      const metrics = calculateRouteMetrics(route, leg, route);
      return { route, index: i, displayIndex: i + 1, ...metrics };
    });

    analyzedRoutes = analyzedRoutes.map(r => {
      const scoreData = calculateRouteScore(r, analyzedRoutes);
      return { ...r, ...scoreData };
    });

    _bestRoute = selectBestRoute(analyzedRoutes);
    _fastestRoute = [...analyzedRoutes].sort((a, b) => a.time - b.time)[0];
    selectedRoute = _bestRoute;

    analyzedRoutes = applyWhyToRoutes(analyzedRoutes, _bestRoute);
    const whyCheck = validateWhyRoutes(analyzedRoutes);
    if (!whyCheck.ok) {
      document.getElementById("results").innerHTML = `<div class="error">${whyCheck.message}</div>`;
      return;
    }

    analyzedRoutes.forEach(r => {
      r.role = getRouteRole(r, _bestRoute, _fastestRoute, analyzedRoutes);
    });

    setActiveDriveRoute(_bestRoute, "softOffRouteReroute");
    currentStepIndex = 0;
    betterRouteIndex = null;
    _rerouteDecision = null;
    offRouteSince = 0;
    lastStepSwitchAt = 0;
    lastStableStepIndex = 0;
    smoothedUserLatLng = userLatLng;
    dismissAlert();

    renderSelectedRouteOnDriveMap(selectedRoute);
    updateDriveRouteStatusLabel(selectedRoute, "GPS reroute locked");
    updateDriveUI();
    updateDriveCamera(userLatLng);

    if (voiceEnabled) speakText("Route updated from your current position.", "normal");
  });
}

function startLiveDriveTracking() {
  if (!navigator.geolocation) {
    updateDriveGpsStatus(selectedRoute, null, "GPS not supported");
    return;
  }

  stopLiveDriveTracking();
  updateDriveGpsStatus(selectedRoute, null, "Waiting for GPS…");

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      handleLiveDrivePosition(pos);
      updateDriveGpsStatus(selectedRoute, null, "GPS live" + formatGpsAccuracy());
    },
    function(err) {
      console.error("Initial Drive GPS error:", err);
      updateDriveGpsStatus(selectedRoute, null, "GPS blocked or unavailable");
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );

  driveWatchId = navigator.geolocation.watchPosition(
    function(pos) {
      handleLiveDrivePosition(pos);
    },
    function(err) {
      console.error("Drive GPS error:", err);
      updateDriveGpsStatus(selectedRoute, null, "GPS error: allow location");
    },
    { enableHighAccuracy: true, maximumAge: 500, timeout: 10000 }
  );
}

function stopLiveDriveTracking() {
  if (driveWatchId !== null) {
    navigator.geolocation.clearWatch(driveWatchId);
    driveWatchId = null;
  }
  smoothedUserLatLng = null;
  offRouteSince = 0;
  offRouteRecalcInProgress = false;
  lastStepSwitchAt = 0;
  lastStableStepIndex = 0;
  lastGpsAccuracyMeters = null;
  lastRouteDistanceMeters = null;
  lastGpsStatusText = "";
}
