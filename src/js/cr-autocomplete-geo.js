// cr-autocomplete-geo.js — extracted from input/index.html (main inline script).
// External module; depends on globals (script order in input / ТЗ-0).



function initAutocomplete() {
  if (startAutocomplete && endAutocomplete) {
    try {
      window.__clearRoadStartAutocomplete = startAutocomplete;
      window.__clearRoadEndAutocomplete = endAutocomplete;
      window.__CLEAR_ROAD_PLACES_AUTOCOMPLETE_READY__ = true;
    } catch (_) {}
    try {
      if (typeof window.__clearRoadUxDiagPlaces === "function") {
        window.__clearRoadUxDiagPlaces(true, "Existing Autocomplete instances reused");
      }
      if (typeof window.__clearRoadUxDiagLog === "function") {
        window.__clearRoadUxDiagLog("Autocomplete active", "reused instances");
      }
    } catch (_) {}
    patchAutocompleteBindings();
    wireInputAssist();
    return;
  }
  const startInput = document.getElementById("start");
  const endInput   = document.getElementById("end");
  if (!startInput || !endInput) return;
  if (!google?.maps?.places) {
    console.error("[Clear Road UX] Google Places library is not loaded (google.maps.places missing). Check: libraries=places on script URL, Maps JS load, API key; in Cloud Console enable Maps JavaScript API and Places API (legacy widget Autocomplete), not only Places API (New).");
    try { window.__CLEAR_ROAD_PLACES_AUTOCOMPLETE_READY__ = false; } catch (_) {}
    try {
      if (typeof window.__clearRoadUxDiagPlaces === "function") {
        window.__clearRoadUxDiagPlaces(false, "google.maps.places missing after Maps load");
      }
    } catch (_) {}
    wireInputAssist();
    return;
  }

  const options = {
    fields: ["formatted_address", "geometry", "name", "place_id"],
    componentRestrictions: { country: "ae" }
  };

  startAutocomplete = new google.maps.places.Autocomplete(startInput, options);
  endAutocomplete   = new google.maps.places.Autocomplete(endInput, options);
  try {
    window.__clearRoadStartAutocomplete = startAutocomplete;
    window.__clearRoadEndAutocomplete = endAutocomplete;
    window.__CLEAR_ROAD_PLACES_AUTOCOMPLETE_READY__ = true;
  } catch (_) {}

  try {
    if (typeof window.__clearRoadUxDiagPlaces === "function") {
      window.__clearRoadUxDiagPlaces(true, "Autocomplete bound to #start and #end (componentRestrictions: ae)");
    }
  } catch (_) {}
  try {
    if (typeof window.__clearRoadUxDiagLog === "function") {
      window.__clearRoadUxDiagLog("Autocomplete active", "Google Places suggestions on #start and #end");
    }
  } catch (_) {}
  try {
    if (window.__CLEAR_ROAD_UX_DIAG__) window.__CLEAR_ROAD_UX_DIAG__.localFallbackLogged = false;
  } catch (_) {}

  patchAutocompleteBindings();
  wireInputAssist();
}


const AUTOCOMPLETE_DEBOUNCE_MS  = 220;
const STEP_SWITCH_COOLDOWN_MS   = 1800;
const STEP_REACHED_RADIUS_M     = 28;
const NEXT_STEP_PREPARE_RADIUS_M = 180;
const NEXT_STEP_SOON_RADIUS_M   = 90;

let _startInputDebounced   = null;
let _endInputDebounced     = null;
let _lastManualRouteTrigger = 0;

function debounce(fn, delay) {
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay || 220); };
}

function setGpsLoading(on) {
  const btn = document.getElementById("gps-btn");
  if (btn) btn.classList.toggle("gps-loading", !!on);
}

function setGpsResolving(on) {
  const si = document.getElementById("start");
  if (!si) return;
  si.classList.toggle("gps-resolving", !!on);
  si.setAttribute("aria-busy", on ? "true" : "false");
}

function tryCalculateRoutesFromInputs() {
  const now   = Date.now();
  const start = document.getElementById("start")?.value?.trim() || "";
  const end   = document.getElementById("end")?.value?.trim() || "";
  if (!start || !end) return;
  if (now - _lastManualRouteTrigger < 900) return;
  _lastManualRouteTrigger = now;
  calculateRoutes();
}

function wireInputAssist() {
  const startInput = document.getElementById("start");
  const endInput   = document.getElementById("end");
  if (!startInput || !endInput) return;

  if (!_startInputDebounced) {
    _startInputDebounced = debounce(() => {
      const s = startInput.value.trim();
      const e = endInput.value.trim();
      if ((s.length >= 3 || e.length >= 3) && s && e) tryCalculateRoutesFromInputs();
    }, AUTOCOMPLETE_DEBOUNCE_MS);
  }
  if (!_endInputDebounced) {
    _endInputDebounced = debounce(() => {
      const s = startInput.value.trim();
      const e = endInput.value.trim();
      if ((s.length >= 3 || e.length >= 3) && s && e) tryCalculateRoutesFromInputs();
    }, AUTOCOMPLETE_DEBOUNCE_MS);
  }

  if (!startInput.dataset.inputAssistBound) {
    startInput.addEventListener("input", _startInputDebounced);
    startInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); tryCalculateRoutesFromInputs(); }
    });
    startInput.addEventListener("blur", () => tryCalculateRoutesFromInputs());
    startInput.dataset.inputAssistBound = "1";
  }
  if (!endInput.dataset.inputAssistBound) {
    endInput.addEventListener("input", _endInputDebounced);
    endInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); tryCalculateRoutesFromInputs(); }
    });
    endInput.addEventListener("blur", () => tryCalculateRoutesFromInputs());
    endInput.dataset.inputAssistBound = "1";
  }
}

function ensureAutocompleteReady() {
  if (!google?.maps?.places) {
    console.error("[Clear Road UX] Google Places library is not loaded (ensureAutocompleteReady). Same checks as initAutocomplete: libraries=places, legacy Places API for Autocomplete widget.");
    try { window.__CLEAR_ROAD_PLACES_AUTOCOMPLETE_READY__ = false; } catch (_) {}
    try {
      if (typeof window.__clearRoadUxDiagPlaces === "function") {
        window.__clearRoadUxDiagPlaces(false, "places missing in ensureAutocompleteReady");
      }
    } catch (_) {}
    wireInputAssist();
    return;
  }
  if (!startAutocomplete || !endAutocomplete) initAutocomplete();
  wireInputAssist();
}

function _safeLatLngFromPlace(place) {
  try {
    const loc = place && place.geometry && place.geometry.location;
    if (!loc) return null;
    const lat = typeof loc.lat === "function" ? loc.lat() : Number(loc.lat);
    const lng = typeof loc.lng === "function" ? loc.lng() : Number(loc.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (_) {
    return null;
  }
}

function bindAutocompletePlaceChanged(autocomplete, kind) {
  if (!autocomplete || autocomplete.__patchedPlaceChanged) return;
  autocomplete.addListener("place_changed", () => {
    try {
      const place = autocomplete.getPlace();
      const ll = _safeLatLngFromPlace(place);
      if (!ll) return;

      const input = document.getElementById(kind === "start" ? "start" : "end");
      if (!input) return;

      try {
        const lp = document.getElementById("cr-ac-panel-" + input.id);
        if (lp) lp.style.display = "none";
      } catch (_) {}

      input.value = (place && (place.formatted_address || place.name)) || input.value || "";

      if (kind === "start") {
        currentUserCoords = { lat: ll.lat, lng: ll.lng };
      } else {
        try {
          window.__clearRoadEndCoords = { lat: ll.lat, lng: ll.lng };
        } catch (_) {}
      }

      tryCalculateRoutesFromInputs();
    } catch (_) {
      /* ignore — bad or partial Places result must not break the app */
    }
  });
  autocomplete.__patchedPlaceChanged = true;
}

function patchAutocompleteBindings() {
  if (startAutocomplete) bindAutocompletePlaceChanged(startAutocomplete, "start");
  if (endAutocomplete)   bindAutocompletePlaceChanged(endAutocomplete, "end");
}

function handleGeoError(err) {
  setGpsLoading(false);
  try { setGpsResolving(false); } catch (_) {}
  const startInput = document.getElementById("start");
  if (!startInput) return;
  let msg;
  if (err?.code === 1) { startInput.placeholder = t("gps_blocked"); msg = startInput.placeholder; }
  else if (err?.code === 2) { startInput.placeholder = t("gps_unavail"); msg = startInput.placeholder; }
  else if (err?.code === 3) { startInput.placeholder = t("gps_timeout"); msg = startInput.placeholder; }
  else { startInput.placeholder = t("gps_error"); msg = startInput.placeholder; }
  startInput.title = msg;
  try {
    if (typeof window.__clearRoadUxDiagGps === "function") {
      window.__clearRoadUxDiagGps(false, { code: err?.code, message: msg, via: "handleGeoError" });
    }
  } catch (_) {}
}

function _normalizeLatLngForGeocode(latLng) {
  const lat = typeof latLng.lat === "function" ? latLng.lat() : Number(latLng.lat);
  const lng = typeof latLng.lng === "function" ? latLng.lng() : Number(latLng.lng);
  return { lat, lng };
}

function _latLngLikelyUAE(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= 22.4 && lat <= 26.25 && lng >= 51.3 && lng <= 56.75;
}

function _geocodeResultHasUAECountry(result) {
  const comps = result && result.address_components;
  if (!comps || !comps.length) return false;
  return comps.some(
    (c) => c.types && c.types.includes("country") && c.short_name === "AE"
  );
}

function _geocodeGranularityRank(result) {
  const order = ["street_address", "premise", "point_of_interest", "establishment", "route", "neighborhood", "sublocality", "locality", "administrative_area_level_1"];
  let rank = 0;
  for (const c of result.address_components || []) {
    for (const t of c.types || []) {
      const i = order.indexOf(t);
      if (i >= 0 && i >= rank) rank = i + 1;
    }
  }
  return rank;
}

/** Prefer AE country component when coords in UAE; else first formatted line (best-effort), not blind results[0] only for non-UAE. */
function pickFormattedAddressFromGeocoderResults(results, latLng) {
  if (!results || !results.length) return null;
  const { lat, lng } = _normalizeLatLngForGeocode(latLng);
  const expectUAE = _latLngLikelyUAE(lat, lng);
  const uaeCandidates = results.filter(_geocodeResultHasUAECountry);
  if (expectUAE) {
    if (uaeCandidates.length) {
      let best = uaeCandidates[0];
      let bestR = _geocodeGranularityRank(best);
      for (let i = 1; i < uaeCandidates.length; i++) {
        const r = _geocodeGranularityRank(uaeCandidates[i]);
        if (r > bestR) {
          bestR = r;
          best = uaeCandidates[i];
        }
      }
      return best.formatted_address || null;
    }
    const first = results[0];
    return (first && first.formatted_address) ? first.formatted_address : null;
  }
  const first = results[0];
  return (first && first.formatted_address) ? first.formatted_address : null;
}

function reverseGeocodeLatLng(latLng) {
  return new Promise((resolve) => {
    try {
      const { lat, lng } = _normalizeLatLngForGeocode(latLng);
      const fallbackCoord = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      const expectUAE = _latLngLikelyUAE(lat, lng);
      if (!google?.maps?.Geocoder) {
        try {
          window.__clearRoadUxDiagGeocode && window.__clearRoadUxDiagGeocode({
            lat, lng, picked: fallbackCoord, reason: "Geocoder class missing", expectUAE
          });
        } catch (_) {}
        resolve(fallbackCoord);
        return;
      }
      new google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
        let picked = fallbackCoord;
        let reason = "";
        if (status !== "OK" || !results?.length) {
          reason = "no results or status " + String(status);
        } else {
          const addr = pickFormattedAddressFromGeocoderResults(results, { lat, lng });
          const uaeCand = results.filter(_geocodeResultHasUAECountry);
          picked = addr || fallbackCoord;
          if (addr) {
            if (expectUAE && !uaeCand.length) {
              reason = "UAE bbox: no country AE in results — using first formatted_address as best-effort (verify on map)";
            } else if (expectUAE) {
              reason = "formatted address from UAE-filtered geocoder candidate";
            } else {
              reason = "formatted address (non-UAE coords, first suitable)";
            }
          } else if (expectUAE) {
            reason = "no formatted address from geocoder — coordinates only";
          } else {
            reason = "pick returned null — coordinates only";
          }
        }
        try {
          window.__clearRoadUxDiagGeocode && window.__clearRoadUxDiagGeocode({
            lat, lng, status, expectUAE, picked, reason, resultCount: results?.length || 0
          });
        } catch (_) {}
        resolve(picked);
      });
    } catch {
      try {
        const { lat, lng } = _normalizeLatLngForGeocode(latLng);
        const fb = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        window.__clearRoadUxDiagGeocode && window.__clearRoadUxDiagGeocode({ picked: fb, reason: "reverseGeocodeLatLng exception" });
        resolve(fb);
      } catch {
        resolve("");
      }
    }
  });
}

async function applyResolvedStartLocation(latLng, shouldRoute = true) {
  const startInput = document.getElementById("start");
  if (!startInput) return;
  const latN = Number(latLng.lat);
  const lngN = Number(latLng.lng);
  const coordStr = `${latN.toFixed(5)}, ${lngN.toFixed(5)}`;
  try {
    currentUserCoords = { lat: latN, lng: lngN };
    let address = "";
    try {
      address = await reverseGeocodeLatLng({ lat: latN, lng: lngN });
    } catch (geoErr) {
      console.error("[Clear Road UX] reverse geocode threw", geoErr);
    }
    const line = (address && String(address).trim()) ? String(address).trim() : coordStr;
    startInput.value = line;
    startInput.placeholder = t("gps_current");
    startInput.title = line;
    if (map) map.panTo({ lat: latN, lng: lngN });
    if (shouldRoute) tryCalculateRoutesFromInputs();
  } catch (e) {
    console.error("[Clear Road UX] applyResolvedStartLocation failed", e);
    startInput.value = coordStr;
    startInput.placeholder = t("gps_current");
    startInput.title = coordStr;
    if (shouldRoute) tryCalculateRoutesFromInputs();
  }
}

async function requestGPSPatched() {
  if (!navigator.geolocation) {
    const si = document.getElementById("start");
    if (si) si.placeholder = t("gps_unsupported");
    try {
      if (typeof window.__clearRoadUxDiagGps === "function") {
        window.__clearRoadUxDiagGps(false, { code: 0, message: "geolocation not supported", via: "requestGPSPatched" });
      }
    } catch (_) {}
    return;
  }
  setGpsLoading(true);
  setGpsResolving(true);
  const si = document.getElementById("start");
  if (si) si.placeholder = t("gps_detecting");

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      await applyResolvedStartLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }, true);
      setGpsLoading(false);
      setGpsResolving(false);
      try {
        if (typeof window.__clearRoadUxDiagGps === "function") {
          window.__clearRoadUxDiagGps(true, { lat: pos.coords.latitude, lng: pos.coords.longitude, via: "requestGPSPatched" });
        }
      } catch (_) {}
    },
    (err) => { setGpsResolving(false); handleGeoError(err); },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
  );
}

async function requestGPS() { await requestGPSPatched(); }

function patchGpsEntrypoints() {
  const btn = document.getElementById("gps-btn");
  if (!btn) return;
  btn.onclick = function () {
    console.info("[Clear Road UX] GPS button → requestGPS()");
    if (typeof requestGPS !== "function") {
      console.error("[Clear Road UX] requestGPS is not available");
      return;
    }
    requestGPS();
  };
}
