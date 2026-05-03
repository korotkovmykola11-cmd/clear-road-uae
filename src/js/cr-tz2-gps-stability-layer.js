// ============================================================

// ============================================================
//  ТЗ-2 — GPS STABILITY LAYER
//  Stabilizes geolocation, keeps Drive Mode alive on GPS errors,
//  and provides safe fallback statuses without changing route UI.
// ============================================================
(function() {
  const TZ2_GPS_OPTIONS_STRICT = { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 };
  const TZ2_GPS_OPTIONS_FALLBACK = { enableHighAccuracy: false, maximumAge: 60000, timeout: 18000 };
  const TZ2_WATCH_OPTIONS = { enableHighAccuracy: true, maximumAge: 7000, timeout: 15000 };
  const TZ2_STALE_GPS_MS = 30000;

  let tz2LastPosition = null;
  let tz2LastPositionAt = 0;
  let tz2StaleTimer = null;
  let tz2GpsErrorCount = 0;

  function tz2El(id) { return document.getElementById(id); }
  function tz2Log(scope, err) { try { console.warn('[TZ2 GPS]', scope, err); } catch (_) {} }

  function tz2HasValidCoords(pos) {
    return !!(pos && pos.coords && Number.isFinite(pos.coords.latitude) && Number.isFinite(pos.coords.longitude));
  }

  function tz2ErrorMessage(err) {
    if (!err) return 'GPS unavailable · route guidance active';
    if (err.code === 1) return 'GPS blocked · allow location or continue with selected route';
    if (err.code === 2) return 'GPS unavailable · keeping selected route active';
    if (err.code === 3) return 'GPS timeout · keeping selected route active';
    return 'GPS error · route guidance active';
  }

  function tz2SetGpsLoading(isLoading) {
    const btn = tz2El('gps-btn');
    if (btn) btn.classList.toggle('gps-loading', !!isLoading);
  }

  function tz2SetStartStatus(message) {
    const startInput = tz2El('start');
    if (startInput && message) {
      startInput.placeholder = message;
      startInput.title = message;
    }
  }

  function tz2SetDriveStatus(message) {
    try {
      if (typeof updateDriveGpsStatus === 'function') {
        updateDriveGpsStatus(selectedRoute || null, null, message);
      }
    } catch (e) { tz2Log('updateDriveGpsStatus', e); }

    const reality = tz2El('drive-reality-strip');
    const main = tz2El('drive-reality-main');
    const dist = tz2El('drive-reality-distance');
    const driveMode = tz2El('drive-mode');
    if (driveMode && driveMode.classList.contains('active') && reality && main && dist) {
      reality.style.display = 'flex';
      main.textContent = message;
      dist.textContent = 'GPS';
    }
  }

  function tz2RememberPosition(pos) {
    if (!tz2HasValidCoords(pos)) return false;
    tz2LastPosition = {
      coords: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
        speed: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null
      },
      timestamp: pos.timestamp || Date.now()
    };
    tz2LastPositionAt = Date.now();
    tz2GpsErrorCount = 0;
    return true;
  }

  function tz2UseLastKnownPosition(scope) {
    if (!tz2LastPosition || Date.now() - tz2LastPositionAt > 120000) return false;
    try {
      if (typeof handleLiveDrivePosition === 'function') {
        handleLiveDrivePosition(tz2LastPosition);
        tz2SetDriveStatus('GPS weak · using last known position');
        return true;
      }
    } catch (e) { tz2Log(scope || 'lastKnownPosition', e); }
    return false;
  }

  function tz2StartStaleMonitor() {
    if (tz2StaleTimer) clearInterval(tz2StaleTimer);
    tz2StaleTimer = setInterval(function() {
      const driveMode = tz2El('drive-mode');
      if (!driveMode || !driveMode.classList.contains('active')) return;
      if (!tz2LastPositionAt) return;
      if (Date.now() - tz2LastPositionAt > TZ2_STALE_GPS_MS) {
        tz2SetDriveStatus('GPS signal weak · selected route remains active');
      }
    }, 10000);
  }

  function tz2StopStaleMonitor() {
    if (tz2StaleTimer) {
      clearInterval(tz2StaleTimer);
      tz2StaleTimer = null;
    }
  }

  function tz2GetCurrentPosition(options) {
    return new Promise(function(resolve, reject) {
      if (!navigator.geolocation) {
        reject({ code: 0, message: 'Geolocation not supported' });
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  const tz2OriginalRequestGPS = typeof requestGPS === 'function' ? requestGPS : null;
  requestGPS = async function() {
    if (!navigator.geolocation) {
      tz2SetStartStatus(typeof t === 'function' ? t('gps_unsupported') : 'GPS not supported');
      try { setGpsResolving(false); } catch (_) {}
      try {
        if (typeof window.__clearRoadUxDiagGps === "function") {
          window.__clearRoadUxDiagGps(false, { code: 0, message: "not supported", via: "TZ2 requestGPS" });
        }
      } catch (_) {}
      return;
    }

    tz2SetGpsLoading(true);
    try { setGpsResolving(true); } catch (_) {}
    tz2SetStartStatus(typeof t === 'function' ? t('gps_detecting') : 'Detecting location…');

    try {
      const pos = await tz2GetCurrentPosition(TZ2_GPS_OPTIONS_STRICT).catch(async function(firstErr) {
        tz2Log('strict requestGPS failed; trying fallback', firstErr);
        return await tz2GetCurrentPosition(TZ2_GPS_OPTIONS_FALLBACK);
      });

      if (!tz2HasValidCoords(pos)) throw { code: 0, message: 'Invalid GPS position' };
      tz2RememberPosition(pos);

      if (typeof applyResolvedStartLocation === 'function') {
        await applyResolvedStartLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }, true);
      } else if (tz2OriginalRequestGPS) {
        await tz2OriginalRequestGPS.apply(this, arguments);
      }

      tz2SetStartStatus(typeof t === 'function' ? t('gps_current') : 'Current location');
      try {
        if (typeof window.__clearRoadUxDiagGps === 'function') {
          window.__clearRoadUxDiagGps(true, { lat: pos.coords.latitude, lng: pos.coords.longitude, via: 'TZ2 requestGPS' });
        }
      } catch (_) {}
    } catch (err) {
      tz2Log('requestGPS', err);
      console.error('[Clear Road UX] TZ2 requestGPS failed', err);
      tz2SetStartStatus(tz2ErrorMessage(err));
      try {
        if (typeof window.__clearRoadUxDiagGps === 'function') {
          window.__clearRoadUxDiagGps(false, { code: err && err.code, message: tz2ErrorMessage(err), via: 'TZ2 requestGPS' });
        }
      } catch (_) {}
    } finally {
      tz2SetGpsLoading(false);
      try { setGpsResolving(false); } catch (_) {}
    }
  };

  const gpsBtn = tz2El('gps-btn');
  if (gpsBtn) gpsBtn.onclick = requestGPS;

  const tz2OriginalStartLiveDriveTracking = typeof startLiveDriveTracking === 'function' ? startLiveDriveTracking : null;
  startLiveDriveTracking = function() {
    if (!navigator.geolocation) {
      tz2SetDriveStatus('GPS not supported · route guidance active');
      return;
    }

    try {
      if (typeof stopLiveDriveTracking === 'function') stopLiveDriveTracking();
    } catch (e) { tz2Log('stop before GPS watch', e); }

    tz2SetDriveStatus('Waiting for GPS…');

    navigator.geolocation.getCurrentPosition(
      function(pos) {
        if (!tz2HasValidCoords(pos)) {
          tz2SetDriveStatus('GPS position invalid · route guidance active');
          return;
        }
        tz2RememberPosition(pos);
        try {
          if (typeof handleLiveDrivePosition === 'function') handleLiveDrivePosition(pos);
          tz2SetDriveStatus('GPS live');
        } catch (e) {
          tz2Log('initial handleLiveDrivePosition', e);
          tz2SetDriveStatus('GPS fallback · route guidance active');
        }
      },
      function(err) {
        tz2GpsErrorCount += 1;
        tz2Log('initial Drive GPS', err);
        if (!tz2UseLastKnownPosition('initial Drive GPS fallback')) {
          tz2SetDriveStatus(tz2ErrorMessage(err));
        }
      },
      TZ2_GPS_OPTIONS_STRICT
    );

    try {
      driveWatchId = navigator.geolocation.watchPosition(
        function(pos) {
          if (!tz2HasValidCoords(pos)) {
            tz2SetDriveStatus('GPS position invalid · route guidance active');
            return;
          }
          tz2RememberPosition(pos);
          try {
            if (typeof handleLiveDrivePosition === 'function') handleLiveDrivePosition(pos);
          } catch (e) {
            tz2Log('watch handleLiveDrivePosition', e);
            tz2SetDriveStatus('GPS fallback · route guidance active');
          }
        },
        function(err) {
          tz2GpsErrorCount += 1;
          tz2Log('watchPosition', err);
          if (!tz2UseLastKnownPosition('watchPosition fallback')) {
            tz2SetDriveStatus(tz2ErrorMessage(err));
          }
        },
        TZ2_WATCH_OPTIONS
      );
      tz2StartStaleMonitor();
    } catch (e) {
      tz2Log('startLiveDriveTracking', e);
      if (tz2OriginalStartLiveDriveTracking) {
        try { return tz2OriginalStartLiveDriveTracking.apply(this, arguments); }
        catch (fallbackErr) { tz2Log('original startLiveDriveTracking', fallbackErr); }
      }
      tz2SetDriveStatus('GPS watch unavailable · route guidance active');
    }
  };

  const tz2OriginalStopLiveDriveTracking = typeof stopLiveDriveTracking === 'function' ? stopLiveDriveTracking : null;
  if (tz2OriginalStopLiveDriveTracking) {
    stopLiveDriveTracking = function() {
      tz2StopStaleMonitor();
      return tz2OriginalStopLiveDriveTracking.apply(this, arguments);
    };
  }

  window.clearRoadTZ2Gps = {
    lastPosition: function() { return tz2LastPosition; },
    lastPositionAgeMs: function() { return tz2LastPositionAt ? Date.now() - tz2LastPositionAt : null; },
    errorCount: function() { return tz2GpsErrorCount; }
  };
})();
