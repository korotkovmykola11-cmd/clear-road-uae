(function clearRoadUxDiagnosticsBootstrap() {
  const LOG = "[Clear Road UX]";
  try { window.__CLEAR_ROAD_MAPS_AUTH_FAILED__ = false; } catch (_) {}
  window.__CLEAR_ROAD_UX_DIAG__ = {
    places: "unknown",
    gpsLast: "unknown",
    mapsAuth: "unknown",
    localFallbackLogged: false
  };
  function ensureStrip() {
    let el = document.getElementById("cr-ux-diag-strip");
    if (!el) {
      el = document.createElement("div");
      el.id = "cr-ux-diag-strip";
      el.className = "cr-ux-diag-strip";
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
    }
    return el;
  }
  function renderStrip() {
    const st = window.__CLEAR_ROAD_UX_DIAG__;
    const p = st.places === "ok" ? "OK" : st.places === "fail" ? "FAIL" : "—";
    const g = st.gpsLast === "ok" ? "OK" : st.gpsLast === "fail" ? "FAIL" : "—";
    const auth = st.mapsAuth === "fail" ? "  Maps:FAIL" : "";
    ensureStrip().textContent = "Places:" + p + "  GPS:" + g + auth;
  }
  window.__clearRoadUxDiagLog = function (tag, detail) {
    if (detail !== undefined) console.info(LOG, tag, detail);
    else console.info(LOG, tag);
  };
  window.__clearRoadUxDiagPlaces = function (ok, detail) {
    window.__CLEAR_ROAD_UX_DIAG__.places = ok ? "ok" : "fail";
    if (ok) window.__clearRoadUxDiagLog("Places ready", detail || "");
    else console.error(LOG, "Places FAIL — autocomplete widgets will not work. Check Maps JS + Places API (legacy), libraries=places, and API key.", detail || "");
    renderStrip();
  };
  window.__clearRoadUxDiagGps = function (ok, detail) {
    window.__CLEAR_ROAD_UX_DIAG__.gpsLast = ok ? "ok" : "fail";
    if (ok) {
      window.__clearRoadUxDiagLog("GPS success", detail || "");
    } else {
      console.error(LOG, "GPS error", detail != null ? detail : "");
    }
    renderStrip();
  };
  window.__clearRoadUxDiagFallback = function (reason) {
    if (window.__CLEAR_ROAD_UX_DIAG__.localFallbackLogged) return;
    window.__CLEAR_ROAD_UX_DIAG__.localFallbackLogged = true;
    console.warn(LOG, "Local autocomplete fallback on — Google Places suggestions unavailable for typing.", reason || "");
    renderStrip();
  };
  window.__clearRoadUxDiagGeocode = function (payload) {
    window.__clearRoadUxDiagLog("Reverse geocode", payload);
  };
  window.__clearRoadUxDiagMapsAuthFail = function () {
    try { window.__CLEAR_ROAD_MAPS_AUTH_FAILED__ = true; } catch (_) {}
    window.__CLEAR_ROAD_UX_DIAG__.mapsAuth = "fail";
    try {
      var mapEl = document.getElementById("map");
      if (mapEl) {
        mapEl.setAttribute("data-cr-maps-auth", "failed");
        mapEl.title = "Google Maps could not load (API key / referrer / billing). Use http://localhost:3000 and check Cloud Console.";
      }
    } catch (_) {}
    console.error(
      LOG,
      "Maps API key rejected (gm_authFailure). Check: HTTP referrer vs " + String(location.origin) + ", enabled APIs (Maps JS, Places, Directions, Geocoding), billing, and key embedded in build."
    );
    renderStrip();
    try {
      if (typeof window.__clearRoadUxDiagPlaces === "function") {
        window.__clearRoadUxDiagPlaces(false, "Maps JS auth failure — Places will not initialize");
      }
    } catch (_) {}
  };
  window.gm_authFailure = window.__clearRoadUxDiagMapsAuthFail;
  if (document.body) renderStrip();
})();
