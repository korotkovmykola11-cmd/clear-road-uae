// cr-drive-binding.js — extracted from input/index.html (main inline script).
// External module; depends on globals (script order in input / ТЗ-0).



// ============================================================
//  ТЗ3 — DRIVE MODE ROUTE BINDING
//  Keeps Decision Engine, selectedRoute and Drive Mode locked
//  to the same Google route index. Does not change UI/CSS.
// ============================================================
function getCanonicalRouteByIndex(index) {
  if (!Array.isArray(analyzedRoutes) || !analyzedRoutes.length) return null;
  const normalizedIndex = Number(index);
  if (Number.isFinite(normalizedIndex)) {
    const exact = analyzedRoutes.find(function(route) { return Number(route.index) === normalizedIndex; });
    if (exact) return exact;
  }
  return null;
}

function resolveDriveRoute(index) {
  const exact = getCanonicalRouteByIndex(index);
  if (exact) return exact;

  if (selectedRoute) {
    const selected = getCanonicalRouteByIndex(selectedRoute.index);
    if (selected) return selected;
  }

  if (_bestRoute) {
    const best = getCanonicalRouteByIndex(_bestRoute.index);
    if (best) return best;
  }

  return Array.isArray(analyzedRoutes) && analyzedRoutes.length ? analyzedRoutes[0] : null;
}

function setActiveDriveRoute(route, source) {
  const canonical = route ? getCanonicalRouteByIndex(route.index) || route : null;
  if (!canonical) return null;

  selectedRoute = canonical;
  activeDriveRouteIndex = canonical.index;
  activeDriveRouteSnapshot = {
    source: source || "unknown",
    index: canonical.index,
    title: canonical.title || _tz1RouteName(canonical),
    durationMin: canonical.durationMin || _tz1Minutes(canonical),
    score: canonical.score || null,
    updatedAt: Date.now()
  };

  return canonical;
}

function validateSelectedDriveRoute(route, source) {
  const canonical = setActiveDriveRoute(route, source);
  if (!canonical) return null;

  if (currentDirectionsResult && currentDirectionsResult.routes && currentDirectionsResult.routes[canonical.index] !== canonical.route) {
    const fixedIndex = currentDirectionsResult.routes.findIndex(function(googleRoute) { return googleRoute === canonical.route; });
    if (fixedIndex >= 0 && fixedIndex !== canonical.index) {
      canonical.index = fixedIndex;
      activeDriveRouteIndex = fixedIndex;
    }
  }

  return canonical;
}

function renderSelectedRouteOnDriveMap(route) {
  const r = validateSelectedDriveRoute(route, "renderSelectedRouteOnDriveMap");
  if (!r || !driveMap || !currentDirectionsResult) return false;

  if (driveRenderer) driveRenderer.setMap(null);

  driveRenderer = new google.maps.DirectionsRenderer({
    map: driveMap,
    directions: currentDirectionsResult,
    routeIndex: r.index,
    polylineOptions: {
      strokeColor: "#2d6a4f",
      strokeWeight: 6
    }
  });

  return true;
}

function updateDriveRouteStatusLabel(route, prefix) {
  const st = document.getElementById("drive-status");
  if (!st || !route) return;
  const label = route.title || _tz1RouteName(route) || ("Route " + (route.index + 1));
  st.textContent = (prefix || "AI route locked") + " · " + label;
}

function startDriveMode(index) {
  clearDelayedStartTimer();

  const r = validateSelectedDriveRoute(resolveDriveRoute(index), "startDriveMode");
  if (!r || !currentDirectionsResult) return;

  currentStepIndex = 0;
  betterRouteIndex = null;
  _rerouteDecision = null;
  _rerouteDismissedUntil = 0;
  _rerouteDismissedIndex = null;
  _rerouteLastShownAt = 0;
  _rerouteLastSignature = "";
  lastRerouteCheckAt = 0;
  lastKnownUserLatLng = null;
  lastGpsAccuracyMeters = null;
  lastRouteDistanceMeters = null;
  lastGpsStatusText = "";
  offRouteRecalcInProgress = false;
  offRouteSince = 0;
  lastStepSwitchAt = 0;
  lastStableStepIndex = 0;
  smoothedUserLatLng = null;
  lastDriveDirectionsRequestAt = 0;
  _driveDisplayedEtaMin = null;
  _driveEtaSmoothLastAt = 0;
  lastWarningPhase = "";
  lastSpokenText = "";
  lastSpokenAt = 0;
  lastVoiceInstructionKey = "";
  lastVoiceInstructionAt = 0;
  hasSpokenStartNavigation = false;
  hasSpokenDriveDecision = false;
  heldTimedWarning = null;
  heldTimedWarningUntil = 0;
  lastPhaseChangeAt = 0;
  lastStableTimedPhase = "";
  _laneGuidanceHeld = null;
  _laneGuidanceHeldUntil = 0;
  followUserMode = true;
  lastUserHeading = 0;
  driveMapHasFollowed = false;

  document.getElementById("drive-mode").classList.add("active");

  if (!driveMap) {
    driveMap = new google.maps.Map(document.getElementById("drive-map"), {
      center: { lat: 25.2048, lng: 55.2708 },
      zoom: 14,
      disableDefaultUI: true,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] }
      ]
    });
  }

  renderSelectedRouteOnDriveMap(r);
  updateDriveRouteStatusLabel(r, "AI route locked");
  updateDriveUI();

  if (voiceEnabled) {
    setTimeout(function() {
      if (!hasSpokenDriveDecision && selectedRoute && selectedRoute.index === r.index) {
        hasSpokenDriveDecision = true;
        speakText(buildDecisionVoiceText(selectedRoute, "drive_start"), "normal");
      }
    }, 350);
    setTimeout(function() {
      if (selectedRoute && selectedRoute.index === r.index) speakStartNavigation(selectedRoute);
    }, 1800);
  }

  if (r.route && r.route.bounds) driveMap.fitBounds(r.route.bounds);

  if (driveInterval) {
    clearInterval(driveInterval);
    driveInterval = null;
  }

  startLiveDriveTracking();
}

function simulateDriveProgress() {
  // Day 5.5: disabled — replaced by GPS watchPosition in startLiveDriveTracking()
}

function showDriveAlert(message, benefit) {
  const alert = document.getElementById("drive-alert");
  document.getElementById("drive-alert-message").textContent = `${message} — ${benefit}`;
  alert.classList.add("visible");
}

function dismissAlert() {
  const alert = document.getElementById("drive-alert");
  if (alert) alert.classList.remove("visible");

  if (betterRouteIndex !== null) {
    _rerouteDismissedIndex = betterRouteIndex;
    _rerouteDismissedUntil = Date.now() + 90000;
  }

  betterRouteIndex = null;
  _rerouteDecision = null;
  _rerouteLastSignature = "";
}

function switchToAlternative() {
  const targetIndex = _rerouteDecision && Number.isFinite(_rerouteDecision.targetIndex)
    ? _rerouteDecision.targetIndex
    : betterRouteIndex;

  if (targetIndex === null || targetIndex === undefined) return;

  const chosen = resolveDriveRoute(targetIndex);
  if (!chosen) return;

  if (typeof learnFromRouteChoice === "function") learnFromRouteChoice(chosen);

  betterRouteIndex = null;
  _rerouteDecision = null;
  _rerouteDismissedIndex = null;
  _rerouteDismissedUntil = 0;
  _rerouteLastSignature = "";

  setActiveDriveRoute(chosen, "switchToAlternative");
  currentStepIndex = 0;
  lastWarningPhase = "";
  lastDriveVoiceStepIndex = -1;
  lastDriveVoicePhase = "";

  renderSelectedRouteOnDriveMap(chosen);
  updateDriveRouteStatusLabel(chosen, "Switched to AI route");
  updateDriveUI();

  const alert = document.getElementById("drive-alert");
  if (alert) alert.classList.remove("visible");

  if (driveMap && chosen.route && chosen.route.bounds) driveMap.fitBounds(chosen.route.bounds);

  if (voiceEnabled) {
    speakText("Route switched. Continuing via " + getRouteSummaryName(chosen), "normal");
  }
}

function exitDriveMode() {
  clearDelayedStartTimer();
  stopLiveDriveTracking();

  if (driveUserMarker) {
    driveUserMarker.setMap(null);
    driveUserMarker = null;
  }

  document.getElementById("drive-mode").classList.remove("active");

  if (driveInterval) {
    clearInterval(driveInterval);
    driveInterval = null;
  }

  currentStepIndex = 0;
  betterRouteIndex = null;
  _rerouteDecision = null;
  lastKnownUserLatLng = null;
  lastWarningPhase = "";
  lastSpokenText = "";
  lastSpokenAt = 0;
  heldTimedWarning = null;
  heldTimedWarningUntil = 0;
  lastPhaseChangeAt = 0;
  lastStableTimedPhase = "";
  _laneGuidanceHeld = null;
  _laneGuidanceHeldUntil = 0;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
