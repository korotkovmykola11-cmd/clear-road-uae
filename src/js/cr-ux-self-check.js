(function () {
  'use strict';
  window.__clearRoadRunUxSelfCheck = function (opts) {
    var rows = [];
    function row(name, pass, detail) {
      rows.push({ check: name, pass: !!pass, detail: detail || '' });
    }
    try {
      row('google.maps', !!(window.google && google.maps));
      row('google.maps.geometry', !!(google && google.maps && google.maps.geometry && google.maps.geometry.spherical));
      row('google.maps.places.Autocomplete', !!(google && google.maps && google.maps.places && google.maps.places.Autocomplete));
      row('map_instance', !!window.__CLEAR_ROAD_MAP_READY__, window.__CLEAR_ROAD_MAP_READY__ ? 'google.maps.Map created in initMap' : 'Map not constructed — initMap error or gm_authFailure');
      row('maps_js_gm_authFailure', !window.__CLEAR_ROAD_MAPS_AUTH_FAILED__, window.__CLEAR_ROAD_MAPS_AUTH_FAILED__ ? 'Key/referrer/API/billing — see [Clear Road UX] console error' : '');
      row('navigator.geolocation', !!navigator.geolocation);
      row('window.requestGPS', typeof window.requestGPS === 'function');
      row('places_autocomplete_ready', window.__CLEAR_ROAD_PLACES_AUTOCOMPLETE_READY__ === true, 'If false: Places did not bind — check legacy Places API + libraries=places');
      try {
        var d = window.__CLEAR_ROAD_UX_DIAG__;
        row('ux_strip_places', !(d && d.places === 'fail'), d ? ('diag places: ' + d.places) : 'diag n/a');
        row('ux_strip_gps_ok', true, d ? ('last GPS UX: ' + d.gpsLast) : 'GPS not tried yet');
      } catch (e2) {
        row('ux_diag_read', false, String(e2 && e2.message));
      }
    } catch (e) {
      row('self-check runner', false, (e && e.message) ? String(e.message) : 'error');
    }
    var criticalOk = rows.every(function (r) {
      if (r.check === 'places_autocomplete_ready') return true;
      return r.pass;
    });
    var allOk = rows.every(function (r) { return r.pass; });
    var src = (opts && opts.source) ? opts.source : 'manual';
    console.info('[Clear Road UAE] UX self-check (' + src + ') — critical:', criticalOk, 'full:', allOk);
    console.table(rows);
    return { criticalOk: criticalOk, allOk: allOk, rows: rows, source: src };
  };
  if (/\bcr_selfcheck=1\b/.test(location.search)) {
    window.addEventListener('load', function () {
      setTimeout(function () { window.__clearRoadRunUxSelfCheck({ source: 'query_cr_selfcheck=1' }); }, 2500);
    });
  }
  /* If Maps never calls initMap (e.g. blocked key), still emit a diagnostic table once. */
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (window.__CLEAR_ROAD_MAP_READY__) return;
      if (typeof window.__clearRoadRunUxSelfCheck === 'function') {
        window.__clearRoadRunUxSelfCheck({ source: 'load_no_initMap' });
      }
    }, 4000);
  });
  window.__clearRoadUxSelfCheck = window.__clearRoadRunUxSelfCheck;
})();
