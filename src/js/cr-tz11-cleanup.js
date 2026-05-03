(function(){
  'use strict';
  const TZ11_VERSION = 'TZ11_CLEANUP_STABILITY_2026_04_25';

  function log(status, name, detail){
    const fn = status === 'ok' ? console.log : console.warn;
    fn('[TZ11]', status.toUpperCase(), name, detail || '');
  }

  function safeGet(id){
    try { return document.getElementById(id); } catch (_) { return null; }
  }

  function ensureBodyClass(){
    if (!document.body) return;
    document.body.classList.add('tz11-stabilized');
    document.documentElement.setAttribute('data-tz11', TZ11_VERSION);
  }

  function protectFunction(name, fallback){
    if (typeof window[name] !== 'function') {
      window[name] = fallback || function(){
        log('warn', name, 'Fallback called because original function is missing.');
      };
      return false;
    }
    return true;
  }

  function safeCall(name, args){
    try {
      if (typeof window[name] === 'function') return window[name].apply(window, args || []);
    } catch (err) {
      log('warn', name, err && err.message ? err.message : err);
    }
    return null;
  }

  function installSafeWrappers(){
    ['startDriveMode','exitDriveMode','requestGPS','calculateRoutes','renderResults','setLang','speakCurrentDecision','startRouteVoiceInput']
      .forEach(name => protectFunction(name));

    const wrapList = ['renderResults','setLang','speakCurrentDecision','startRouteVoiceInput','requestGPS','startDriveMode'];
    wrapList.forEach(name => {
      const original = window[name];
      if (typeof original !== 'function' || original.__tz11Wrapped) return;
      const wrapped = function(){
        try {
          return original.apply(this, arguments);
        } catch (err) {
          log('warn', name, err && err.message ? err.message : err);
          return null;
        }
      };
      wrapped.__tz11Wrapped = true;
      wrapped.__tz11Original = original;
      window[name] = wrapped;
    });
  }

  function stabilizeDom(){
    ensureBodyClass();
    const requiredIds = ['start','end','results','drive-mode','drive-status','drive-map','modal-overlay','modal-content'];
    requiredIds.forEach(id => {
      if (safeGet(id)) log('ok', 'DOM #' + id);
      else log('warn', 'DOM #' + id, 'missing');
    });

    document.querySelectorAll('[data-i18n], [data-i18n-ph]').forEach(el => {
      if (!el.getAttribute('data-tz11-i18n-checked')) el.setAttribute('data-tz11-i18n-checked', 'true');
    });

    const lang = (window.currentLang || localStorage.getItem('clearRoadLang') || document.documentElement.lang || 'en').toLowerCase();
    if (lang === 'ar') {
      document.body.classList.add('rtl','tz8-rtl-ar');
      document.documentElement.setAttribute('dir','rtl');
      document.documentElement.setAttribute('lang','ar');
    }
  }

  function normalizeStorage(){
    const keys = ['clearRoadSavedPlaces','clearRoadRecentPlaces','clearRoadUserPreference','clearRoadFilters','clearRoadLang'];
    keys.forEach(k => {
      try { localStorage.getItem(k); log('ok', 'localStorage ' + k); }
      catch (err) { log('warn', 'localStorage ' + k, err && err.message ? err.message : err); }
    });
  }

  function auditLayers(){
    const source = document.documentElement.innerHTML;
    const markers = [
      'Drive Mode Reality Fix',
      'GPS STABILITY LAYER',
      'PREDICTIVE ENGINE STABILITY LAYER',
      'UAE-ONLY LOCAL LOGIC',
      'FILTERS / PREFERENCES',
      'SAVED PLACES / QUICK START',
      'MULTILANGUAGE / I18N',
      'RTL ARABIC UI POLISH',
      'VOICE INPUT / SPEECH RECOGNITION',
      'AI ASSISTANT / VOICE ADVICE'
    ];
    const result = {};
    markers.forEach((m, i) => {
      const ok = source.indexOf(m) !== -1;
      result['TZ' + (i + 1)] = ok;
      log(ok ? 'ok' : 'warn', 'ТЗ-' + (i + 1), m);
    });
    window.clearRoadTZ11Audit = result;
    return result;
  }

  function run(){
    installSafeWrappers();
    stabilizeDom();
    normalizeStorage();
    auditLayers();
    window.clearRoadTZ11 = { version: TZ11_VERSION, runAudit: auditLayers, safeCall };
    log('ok', 'ТЗ-11 stabilization loaded', TZ11_VERSION);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once:true });
  else run();
})();
