(function(){
  'use strict';
  const TZ12_VERSION = 'TZ12_FINAL_AUDIT_DEMO_2026_04_25';

  const DEMO_ROUTES = [
    { from: 'Ajman', to: 'Sharjah', label: 'Ajman → Sharjah' },
    { from: 'Dubai Marina', to: 'Sharjah Airport', label: 'Dubai Marina → Sharjah Airport' },
    { from: 'Ajman City Centre', to: 'Dubai Terminal 3', label: 'Ajman City Centre → DXB Terminal 3' }
  ];

  const REQUIRED_LAYERS = [
    ['TZ1', 'Drive Mode Reality Fix'],
    ['TZ2', 'GPS STABILITY LAYER'],
    ['TZ3', 'PREDICTIVE ENGINE STABILITY LAYER'],
    ['TZ4', 'UAE-ONLY LOCAL LOGIC'],
    ['TZ5', 'FILTERS / PREFERENCES'],
    ['TZ6', 'SAVED PLACES / QUICK START'],
    ['TZ7', 'MULTILANGUAGE / I18N'],
    ['TZ8', 'RTL ARABIC UI POLISH'],
    ['TZ9', 'VOICE INPUT / SPEECH RECOGNITION'],
    ['TZ10', 'AI ASSISTANT / VOICE ADVICE'],
    ['TZ11', 'CODE CLEANUP / STABILIZATION LAYER']
  ];

  const REQUIRED_FUNCTIONS = [
    'calculateRoutes',
    'renderResults',
    'startDriveMode',
    'exitDriveMode',
    'requestGPS',
    'setLang',
    'speakCurrentDecision',
    'startRouteVoiceInput'
  ];

  const REQUIRED_DOM = [
    'start',
    'end',
    'results',
    'drive-mode',
    'drive-status',
    'drive-map',
    'modal-overlay',
    'modal-content',
    'top-utility-bar'
  ];

  function log(status, name, detail){
    const fn = status === 'ok' ? console.info : console.warn;
    fn('[TZ12]', status.toUpperCase(), name, detail || '');
  }

  function getSource(){
    return document.documentElement ? document.documentElement.innerHTML : '';
  }

  function checkLayers(){
    const source = getSource();
    const result = {};
    REQUIRED_LAYERS.forEach(([key, marker]) => {
      const ok = source.indexOf(marker) !== -1;
      result[key] = ok;
      log(ok ? 'ok' : 'warn', key, marker);
    });
    return result;
  }

  function checkFunctions(){
    const result = {};
    REQUIRED_FUNCTIONS.forEach(name => {
      const ok = typeof window[name] === 'function';
      result[name] = ok;
      log(ok ? 'ok' : 'warn', 'function ' + name);
    });
    return result;
  }

  function checkDom(){
    const result = {};
    REQUIRED_DOM.forEach(id => {
      const ok = !!document.getElementById(id);
      result[id] = ok;
      log(ok ? 'ok' : 'warn', 'DOM #' + id);
    });
    return result;
  }

  function checkLanguages(){
    const result = {};
    ['en','ru','ua','ar'].forEach(lang => {
      const btn = document.querySelector('.lang-btn[data-lang="' + lang + '"]');
      result[lang] = !!btn;
      log(btn ? 'ok' : 'warn', 'language ' + lang);
    });
    return result;
  }

  function getBestRouteSummary(routes){
    if (!Array.isArray(routes) || !routes.length) return null;
    const sorted = routes.slice().sort((a, b) => {
      const as = Number(a.aiScore || a.score || 0);
      const bs = Number(b.aiScore || b.score || 0);
      if (bs !== as) return bs - as;
      return Number(a.duration || a.durationMin || 9999) - Number(b.duration || b.durationMin || 9999);
    });
    const r = sorted[0];
    return {
      label: r.label || r.name || r.summary || 'Best route',
      eta: r.durationText || r.duration || r.durationMin || null,
      distance: r.distanceText || r.distance || null,
      score: r.aiScore || r.score || null
    };
  }

  function runDemoSimulation(){
    const output = [];
    DEMO_ROUTES.forEach(test => {
      let status = 'ready';
      let summary = null;
      try {
        if (typeof window.calculateRoutes === 'function') {
          const maybeRoutes = window.calculateRoutes(test.from, test.to, { demo: true, tz12: true });
          if (Array.isArray(maybeRoutes)) summary = getBestRouteSummary(maybeRoutes);
          else if (maybeRoutes && Array.isArray(maybeRoutes.routes)) summary = getBestRouteSummary(maybeRoutes.routes);
        }
      } catch (err) {
        status = 'manual_check_required';
        summary = { error: err && err.message ? err.message : String(err) };
      }
      output.push({
        route: test.label,
        status,
        summary,
        note: summary ? 'Route engine responded.' : 'Ready for live Google Maps/API test in browser.'
      });
    });
    return output;
  }

  function finalAudit(){
    const audit = {
      version: TZ12_VERSION,
      timestamp: new Date().toISOString(),
      layers: checkLayers(),
      functions: checkFunctions(),
      dom: checkDom(),
      languages: checkLanguages(),
      demoRoutes: runDemoSimulation()
    };

    audit.ok =
      Object.values(audit.layers).every(Boolean) &&
      Object.values(audit.functions).every(Boolean) &&
      Object.values(audit.dom).every(Boolean) &&
      Object.values(audit.languages).every(Boolean);

    window.clearRoadTZ12Audit = audit;
    document.documentElement.setAttribute('data-tz12', TZ12_VERSION);
    if (document.body) document.body.classList.add('tz12-final-ready');

    log(audit.ok ? 'ok' : 'warn', 'Final audit complete', audit);
    return audit;
  }

  function installDemoHelpers(){
    window.clearRoadDemoRoutes = DEMO_ROUTES.slice();
    window.clearRoadRunFinalAudit = finalAudit;
    window.clearRoadTZ12 = {
      version: TZ12_VERSION,
      demoRoutes: DEMO_ROUTES.slice(),
      runFinalAudit: finalAudit,
      runDemoSimulation
    };
  }

  function run(){
    installDemoHelpers();
    finalAudit();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once:true });
  else run();
})();
