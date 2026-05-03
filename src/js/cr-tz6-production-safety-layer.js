// ============================================================
//  ТЗ6 — PRODUCTION SAFETY / FALLBACK MODE
//  Safety layer only: no UI redesign, no route-engine rollback.
//  Protects GPS, Google API, Directions, route data and Drive Mode.
// ============================================================
(function applyProductionSafetyFallbackMode() {
  const TZ6_GPS_FALLBACK_MESSAGE = "GPS unavailable · route guidance still active";
  const TZ6_API_FALLBACK_MESSAGE = "Map service unavailable · try again shortly";
  const TZ6_ROUTE_FALLBACK_MESSAGE = "Route data unavailable · recalculate route";

  let tz6LastSafeErrorAt = 0;
  let tz6FallbackMode = false;
  let tz6FallbackReason = "";

  function tz6Now() { return Date.now(); }

  function tz6LogSafe(context, error) {
    const now = tz6Now();
    if (now - tz6LastSafeErrorAt > 1500) {
      console.warn("TZ6 safety fallback:", context, error || "");
      tz6LastSafeErrorAt = now;
    }
  }

  function tz6Element(id) {
    return document.getElementById(id);
  }

  function tz6SetText(id, value) {
    const el = tz6Element(id);
    if (el) el.textContent = value == null ? "" : String(value);
  }

  function tz6ShowRouteError(message) {
    const results = tz6Element("results");
    if (results) results.innerHTML = '<div class="error">' + _tz1EscapeHTML(String(message || TZ6_ROUTE_FALLBACK_MESSAGE)) + '</div>';
  }

  function tz6SetDriveFallback(reason, route) {
    tz6FallbackMode = true;
    tz6FallbackReason = reason || TZ6_GPS_FALLBACK_MESSAGE;

    const activeRoute = route || selectedRoute || _bestRoute || (Array.isArray(analyzedRoutes) ? analyzedRoutes[0] : null);
    if (typeof updateDriveGpsStatus === "function") {
      try { updateDriveGpsStatus(activeRoute, null, tz6FallbackReason); } catch (e) { tz6LogSafe("updateDriveGpsStatus", e); }
    }

    const aheadIcon = tz6Element("drive-ahead-icon");
    if (aheadIcon) {
      aheadIcon.classList.remove("alert");
      aheadIcon.classList.add("warning");
      aheadIcon.textContent = "⚠";
    }
    tz6SetText("drive-ahead-text", tz6FallbackReason);

    if (activeRoute) {
      const min = typeof _tz1Minutes === "function" ? _tz1Minutes(activeRoute) : Math.round(activeRoute.durationMin || activeRoute.time || 0);
      const km = activeRoute.distanceKm || (activeRoute.distance ? Math.round((activeRoute.distance / 1000) * 10) / 10 : "--");
      if (Number.isFinite(min) && min > 0) tz6SetText("drive-eta-time", applySmoothedDriveEta(min));
      tz6SetText("drive-distance", km);
      tz6SetText("drive-traffic", activeRoute.trafficLabel || activeRoute.traffic || "route");
      tz6SetText("drive-next-instruction", "Follow selected route");
      tz6SetText("drive-next-distance", tz6FallbackReason);
    }
  }

  function tz6ClearDriveFallback() {
    tz6FallbackMode = false;
    tz6FallbackReason = "";
  }

  function tz6IsGoogleMapsReady() {
    return !!(window.google && google.maps && google.maps.DirectionsRenderer && google.maps.TravelMode);
  }

  function tz6HasValidDirectionsResult(result) {
    return !!(result && Array.isArray(result.routes) && result.routes.length);
  }

  function tz6HasUsableRoute(route) {
    return !!(route && route.route && route.route.legs && route.route.legs[0]);
  }

  function tz6NormalizeRouteData(route) {
    if (!route) return null;
    try {
      if (typeof _tz1Minutes === "function" && !Number.isFinite(route.durationMin)) route.durationMin = _tz1Minutes(route);
      if (route.distanceKm == null && route.distance) route.distanceKm = Math.round((route.distance / 1000) * 10) / 10;
      if (!route.title && typeof _tz1RouteName === "function") route.title = _tz1RouteName(route);
      if (!route.why && typeof _tz2BuildWhy === "function" && Array.isArray(analyzedRoutes)) route.why = _tz2BuildWhy(route, analyzedRoutes);
      if (!route.confidence && typeof calculateConfidence === "function" && Array.isArray(analyzedRoutes)) route.confidence = calculateConfidence(route, analyzedRoutes);
    } catch (e) {
      tz6LogSafe("normalize route", e);
    }
    return route;
  }

  function tz6GetSafeDriveRoute(index) {
    try {
      const resolved = typeof resolveDriveRoute === "function" ? resolveDriveRoute(index) : null;
      if (resolved) return tz6NormalizeRouteData(resolved);
      if (selectedRoute) return tz6NormalizeRouteData(selectedRoute);
      if (_bestRoute) return tz6NormalizeRouteData(_bestRoute);
      if (Array.isArray(analyzedRoutes) && analyzedRoutes.length) return tz6NormalizeRouteData(analyzedRoutes[0]);
    } catch (e) {
      tz6LogSafe("safe drive route", e);
    }
    return null;
  }

  function tz6SafeUpdateDriveUI() {
    try {
      if (typeof updateDriveUI === "function" && selectedRoute) updateDriveUI();
    } catch (e) {
      tz6LogSafe("updateDriveUI", e);
      tz6SetDriveFallback("Drive UI fallback · route still active", selectedRoute);
    }
  }

  const tz6OriginalCalculateRoutes = typeof calculateRoutes === "function" ? calculateRoutes : null;
  if (tz6OriginalCalculateRoutes) {
    calculateRoutes = function() {
      const startInput = tz6Element("start");
      const endInput = tz6Element("end");
      const start = (startInput && startInput.value ? startInput.value : "").trim();
      const end = (endInput && endInput.value ? endInput.value : "").trim();

      if (!start || !end) {
        const results = tz6Element("results");
        if (results) results.innerHTML = "";
        return;
      }

      if (!tz6IsGoogleMapsReady() || !directionsService || typeof directionsService.route !== "function") {
        tz6ShowRouteError(TZ6_API_FALLBACK_MESSAGE);
        return;
      }

      try {
        return tz6OriginalCalculateRoutes.apply(this, arguments);
      } catch (e) {
        tz6LogSafe("calculateRoutes", e);
        tz6ShowRouteError(TZ6_API_FALLBACK_MESSAGE);
      }
    };
  }

  const tz6OriginalDrawRoutes = typeof drawRoutes === "function" ? drawRoutes : null;
  if (tz6OriginalDrawRoutes) {
    drawRoutes = function(result) {
      try {
        if (!tz6IsGoogleMapsReady() || !map || !tz6HasValidDirectionsResult(result)) return;
        return tz6OriginalDrawRoutes.apply(this, arguments);
      } catch (e) {
        tz6LogSafe("drawRoutes", e);
      }
    };
  }

  const tz6OriginalStartDrive = typeof startDrive === "function" ? startDrive : null;
  if (tz6OriginalStartDrive) {
    startDrive = function(index) {
      const safeRoute = tz6GetSafeDriveRoute(index);
      if (!safeRoute) {
        tz6ShowRouteError("Select a route first · route data missing");
        return;
      }
      try {
        return tz6OriginalStartDrive.call(this, safeRoute.index);
      } catch (e) {
        tz6LogSafe("startDrive", e);
        tz6SetDriveFallback("Drive fallback · selected route kept", safeRoute);
      }
    };
  }

  const tz6OriginalStartDriveMode = typeof startDriveMode === "function" ? startDriveMode : null;
  if (tz6OriginalStartDriveMode) {
    startDriveMode = function(index) {
      const safeRoute = tz6GetSafeDriveRoute(index);
      if (!safeRoute) {
        tz6ShowRouteError("Cannot start Drive Mode · route data missing");
        return;
      }
      if (!tz6IsGoogleMapsReady() || !currentDirectionsResult) {
        selectedRoute = safeRoute;
        const driveMode = tz6Element("drive-mode");
        if (driveMode) driveMode.classList.add("active");
        tz6SetDriveFallback(TZ6_API_FALLBACK_MESSAGE, safeRoute);
        return;
      }
      try {
        return tz6OriginalStartDriveMode.call(this, safeRoute.index);
      } catch (e) {
        tz6LogSafe("startDriveMode", e);
        selectedRoute = safeRoute;
        const driveMode = tz6Element("drive-mode");
        if (driveMode) driveMode.classList.add("active");
        tz6SetDriveFallback("Drive Mode fallback · selected route kept", safeRoute);
      }
    };
  }

  const tz6OriginalStartLiveDriveTracking = typeof startLiveDriveTracking === "function" ? startLiveDriveTracking : null;
  if (tz6OriginalStartLiveDriveTracking) {
    startLiveDriveTracking = function() {
      const safeRoute = tz6GetSafeDriveRoute(activeDriveRouteIndex || (selectedRoute && selectedRoute.index));
      if (!safeRoute) {
        tz6SetDriveFallback(TZ6_ROUTE_FALLBACK_MESSAGE, null);
        return;
      }
      if (!navigator.geolocation) {
        tz6SetDriveFallback("GPS not supported · route guidance active", safeRoute);
        tz6SafeUpdateDriveUI();
        return;
      }
      try {
        return tz6OriginalStartLiveDriveTracking.apply(this, arguments);
      } catch (e) {
        tz6LogSafe("startLiveDriveTracking", e);
        tz6SetDriveFallback(TZ6_GPS_FALLBACK_MESSAGE, safeRoute);
        tz6SafeUpdateDriveUI();
      }
    };
  }

  const tz6OriginalHandleLiveDrivePosition = typeof handleLiveDrivePosition === "function" ? handleLiveDrivePosition : null;
  if (tz6OriginalHandleLiveDrivePosition) {
    handleLiveDrivePosition = function(pos) {
      const safeRoute = tz6GetSafeDriveRoute(activeDriveRouteIndex || (selectedRoute && selectedRoute.index));
      if (!safeRoute) {
        tz6SetDriveFallback(TZ6_ROUTE_FALLBACK_MESSAGE, null);
        return;
      }
      if (!pos || !pos.coords || !Number.isFinite(pos.coords.latitude) || !Number.isFinite(pos.coords.longitude)) {
        tz6SetDriveFallback("GPS position invalid · route guidance active", safeRoute);
        return;
      }
      try {
        const result = tz6OriginalHandleLiveDrivePosition.apply(this, arguments);
        tz6ClearDriveFallback();
        return result;
      } catch (e) {
        tz6LogSafe("handleLiveDrivePosition", e);
        tz6SetDriveFallback("GPS fallback · route guidance active", safeRoute);
        tz6SafeUpdateDriveUI();
      }
    };
  }

  const tz6OriginalHandleOffRouteRecalculation = typeof handleOffRouteRecalculation === "function" ? handleOffRouteRecalculation : null;
  if (tz6OriginalHandleOffRouteRecalculation) {
    handleOffRouteRecalculation = function(userLatLng) {
      const safeRoute = tz6GetSafeDriveRoute(activeDriveRouteIndex || (selectedRoute && selectedRoute.index));
      const safeUserLatLng =
        userLatLng ||
        ((typeof lastKnownUserLatLng !== "undefined" && lastKnownUserLatLng) ? lastKnownUserLatLng : null) ||
        ((typeof smoothedUserLatLng !== "undefined" && smoothedUserLatLng) ? smoothedUserLatLng : null);

      if (!safeRoute) {
        tz6SetDriveFallback(TZ6_ROUTE_FALLBACK_MESSAGE, null);
        return;
      }
      if (!safeUserLatLng) {
        tz6SetDriveFallback("Off-route detected · waiting for GPS position", safeRoute);
        return;
      }
      if (!directionsService || typeof directionsService.route !== "function" || !tz6IsGoogleMapsReady()) {
        tz6SetDriveFallback("Off-route detected · recalculation unavailable", safeRoute);
        return;
      }
      try {
        return tz6OriginalHandleOffRouteRecalculation.call(this, safeUserLatLng);
      } catch (e) {
        tz6LogSafe("handleOffRouteRecalculation", e);
        tz6SetDriveFallback("Off-route detected · keep current route", safeRoute);
      }
    };
  }

  const tz6OriginalEvaluateReroute = typeof evaluateReroute === "function" ? evaluateReroute : null;
  if (tz6OriginalEvaluateReroute) {
    evaluateReroute = function(currentRoute, routes) {
      try {
        if (!currentRoute || !Array.isArray(routes) || routes.filter(Boolean).length < 2) return null;
        return tz6OriginalEvaluateReroute.apply(this, arguments);
      } catch (e) {
        tz6LogSafe("evaluateReroute", e);
        return null;
      }
    };
  }

  const tz6OriginalSwitchToAlternative = typeof switchToAlternative === "function" ? switchToAlternative : null;
  if (tz6OriginalSwitchToAlternative) {
    switchToAlternative = function() {
      try {
        const route = tz6GetSafeDriveRoute(betterRouteIndex);
        if (!route) {
          if (typeof dismissAlert === "function") dismissAlert();
          tz6SetDriveFallback("Alternative unavailable · keeping current route", selectedRoute);
          return;
        }
        return tz6OriginalSwitchToAlternative.apply(this, arguments);
      } catch (e) {
        tz6LogSafe("switchToAlternative", e);
        if (typeof dismissAlert === "function") dismissAlert();
        tz6SetDriveFallback("Switch unavailable · keeping current route", selectedRoute);
      }
    };
  }

  const tz6OriginalDismissAlert = typeof dismissAlert === "function" ? dismissAlert : null;
  if (tz6OriginalDismissAlert) {
    dismissAlert = function() {
      try {
        return tz6OriginalDismissAlert.apply(this, arguments);
      } catch (e) {
        tz6LogSafe("dismissAlert", e);
        const alert = tz6Element("drive-alert");
        if (alert) alert.classList.remove("visible");
        _rerouteDismissedUntil = Date.now() + 90000;
      }
    };
  }

  window.clearRoadTZ6Safety = {
    isFallback: function() { return tz6FallbackMode; },
    reason: function() { return tz6FallbackReason; },
    safeRoute: tz6GetSafeDriveRoute
  };
})();
