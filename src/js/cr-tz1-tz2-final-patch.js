(function crTZ1TZ2FinalPatch(){
  'use strict';
  const VERSION = 'TZ1_TZ2_FINAL_2026_04_25_v2';

  function esc(v){
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function toFiniteNumber(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function routeMinutes(route){
    if (!route) return 0;
    if (typeof route.durationMin === 'number' && Number.isFinite(route.durationMin)) return route.durationMin;
    if (typeof route.durationTrafficSec === 'number' && Number.isFinite(route.durationTrafficSec)) return route.durationTrafficSec / 60;
    if (typeof route.durationInTraffic === 'number' && Number.isFinite(route.durationInTraffic)) return route.durationInTraffic / 60;
    if (typeof route.time === 'number' && Number.isFinite(route.time)) return route.time / 60;
    if (typeof route.durationSec === 'number' && Number.isFinite(route.durationSec)) return route.durationSec / 60;
    return 0;
  }
  function crFormatDuration(value){
    const min = Math.max(0, Math.round(toFiniteNumber(value, 0)));
    if (min < 60) return min + ' min';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? (h + ' h ' + m + ' min') : (h + ' h');
  }
  function crFormatDurationCompact(value){
    const min = Math.max(0, Math.round(toFiniteNumber(value, 0)));
    if (min < 60) return String(min);
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? (h + ' h ' + m) : (h + ' h');
  }
  function crFormatEtaDiff(route, bestRoute){
    const diff = Math.round(routeMinutes(route) - routeMinutes(bestRoute));
    if (!Number.isFinite(diff) || Math.abs(diff) < 1) return 'Same as best';
    if (diff < 0) return 'Best route';
    return '+' + diff + ' min vs best';
  }
  function crIsDurationLike(text){ return /^\s*\d+(?:\.\d+)?\s*$/.test(String(text || '')); }
  function crHeroDurationHTML(value){
    const min = Math.max(0, Math.round(toFiniteNumber(value, 0)));
    if (min < 60) return esc(min) + '<span class="dh-min">min</span>';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return esc(m ? (h + ' h ' + m) : (h + ' h')) + '<span class="dh-min">min</span>';
  }

  window.crFormatDuration = crFormatDuration;
  window.crFormatEtaDiff = crFormatEtaDiff;

  const style = document.createElement('style');
  style.id = 'cr-tz1-tz2-final-style';
  style.textContent = `
    .cr-ac-panel{position:fixed;z-index:10050;max-height:260px;overflow:auto;background:hsl(220 12% 7%);border:1px solid hsl(220 10% 20%);border-radius:14px;box-shadow:0 18px 45px rgba(0,0,0,.55);padding:6px;display:none;color:hsl(30 10% 96%);font-family:inherit;}
    .cr-ac-item{display:flex;align-items:flex-start;gap:10px;width:100%;padding:10px 12px;border:0;border-radius:11px;background:transparent;color:inherit;text-align:left;font-family:inherit;cursor:pointer;}
    .cr-ac-item:hover,.cr-ac-item.active{background:hsla(72,96%,56%,.09);}
    .cr-ac-icon{width:24px;height:24px;display:grid;place-items:center;border-radius:999px;background:hsla(72,96%,56%,.13);color:hsl(72 96% 56%);flex:0 0 auto;font-size:12px;}
    .cr-ac-main{font-size:14px;font-weight:700;line-height:1.2;color:hsl(30 10% 96%);}
    .cr-ac-sub{font-size:12px;color:hsl(220 8% 56%);line-height:1.25;margin-top:2px;}
    body.rtl .cr-ac-item, body.tz8-rtl-ar .cr-ac-item{text-align:right;flex-direction:row-reverse;}
  `;
  document.head.appendChild(style);

  function crNormalizeDurationNode(root){
    if (!root) return;
    root.querySelectorAll('.dh-eta').forEach(function(el){
      if (el.dataset.crTz1Formatted === VERSION) return;
      const raw = (el.childNodes[0] && el.childNodes[0].nodeType === 3) ? el.childNodes[0].nodeValue : el.textContent;
      const n = parseFloat(String(raw || '').replace(',', '.'));
      if (Number.isFinite(n)) {
        el.innerHTML = crHeroDurationHTML(n);
        el.dataset.crTz1Formatted = VERSION;
      }
    });
    root.querySelectorAll('.tz9-route-time,.alt-end-time,.detail-value,.drive-eta-time').forEach(function(el){
      const txt = (el.textContent || '').trim();
      const m = txt.match(/^(\d+(?:\.\d+)?)\s*min$/i) || txt.match(/^(\d+(?:\.\d+)?)$/);
      if (m) {
        const n = parseFloat(m[1]);
        if (Number.isFinite(n) && n >= 60) el.textContent = crFormatDuration(n);
        else if (Number.isFinite(n) && /\.\d/.test(m[1])) el.textContent = crFormatDuration(n);
      }
    });
  }


  function patchDriveVM(){
    const oldVM = window.buildDriveViewModel || (typeof buildDriveViewModel === 'function' ? buildDriveViewModel : null);
    if (typeof oldVM !== 'function' || oldVM.__crTz12Patched) return;
    const wrapped = function buildDriveViewModelTZ1TZ2Final(){
      const vm = oldVM.apply(this, arguments) || {};
      if (Number.isFinite(Number(vm.eta))) vm.eta = crFormatDuration(Number(vm.eta));
      return vm;
    };
    wrapped.__crTz12Patched = true;
    window.buildDriveViewModel = wrapped;
    try { buildDriveViewModel = wrapped; } catch(_e) {}
  }

  function patchRouteDetails(){
    const oldOpen = window.openRouteDetails || (typeof openRouteDetails === 'function' ? openRouteDetails : null);
    if (typeof oldOpen === 'function' && !oldOpen.__crTz12Patched) {
      const wrappedOpen = function openRouteDetailsTZ1TZ2Final(index){
        const result = oldOpen.apply(this, arguments);
        setTimeout(function(){ crNormalizeDurationNode(document); }, 0);
        return result;
      };
      wrappedOpen.__crTz12Patched = true;
      window.openRouteDetails = wrappedOpen;
      try { openRouteDetails = wrappedOpen; } catch(_e) {}
    }
  }

  const UAE_PLACES = [
    {name:'Dubai Mall', address:'Dubai Mall, Downtown Dubai, Dubai, UAE', aliases:['dubai mall','dubai mol','dubai moll','дубай мол','дубай молл','дубай молл','дубай моль','дубай мол','дубай молл','дубайский молл','дубайський мол','дубай мол украина','дубаї мол','دبي مول','مول دبي']},
    {name:'Dubai Marina', address:'Dubai Marina, Dubai, UAE', aliases:['dubai marina','marina','дубай марина','марина','дубаї марина','دبي مارينا']},
    {name:'Dubai Terminal 2', address:'Dubai International Airport Terminal 2, Dubai, UAE', aliases:['dubai terminal 2','terminal 2','dxb terminal 2','терминал 2 дубай','термінал 2 дубай','مبنى 2 دبي']},
    {name:'Dubai Terminal 3', address:'Dubai International Airport Terminal 3, Dubai, UAE', aliases:['dubai terminal 3','terminal 3','dxb terminal 3','терминал 3 дубай','термінал 3 дубай','مبنى 3 دبي']},
    {name:'Sharjah Airport', address:'Sharjah International Airport, Sharjah, UAE', aliases:['sharjah airport','shj airport','аэропорт шарджа','шарджа аэропорт','аеропорт шаржа','مطار الشارقة']},
    {name:'Ajman City Centre', address:'City Centre Ajman, Ajman, UAE', aliases:['ajman city centre','ajman city center','city centre ajman','city center ajman','аджман сити центр','аджман сіті центр','سيتي سنتر عجمان']},
    {name:'Ajman', address:'Ajman, UAE', aliases:['ajman','аджман','عجمان']},
    {name:'Sharjah', address:'Sharjah, UAE', aliases:['sharjah','шарджа','шаржа','الشارقة']},
    {name:'AAL Group Ajman', address:'AAL GROUP - Ajman Nuamiya Tower, Ajman, UAE', aliases:['aal','aal group','aal group ajman','nuamiya tower','al nuaimiya','ал груп','аал груп','аал груп аджман']}
  ];
  function norm(s){
    return String(s || '').toLowerCase().trim()
      .replace(/[ё]/g,'е').replace(/[їі]/g,'и').replace(/[’']/g,'')
      .replace(/\s+/g,' ');
  }
  function localMatches(query){
    const q = norm(query);
    if (q.length < 2) return [];
    return UAE_PLACES.map(function(p){
      const pool = [p.name, p.address].concat(p.aliases || []).map(norm);
      let score = 0;
      pool.forEach(function(a){
        if (a === q) score = Math.max(score, 100);
        else if (a.startsWith(q)) score = Math.max(score, 80);
        else if (a.includes(q)) score = Math.max(score, 55);
      });
      return score ? Object.assign({score:score}, p) : null;
    }).filter(Boolean).sort(function(a,b){ return b.score-a.score; }).slice(0, 6);
  }
  function ensurePanel(input){
    let panel = document.getElementById('cr-ac-panel-' + input.id);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'cr-ac-panel-' + input.id;
      panel.className = 'cr-ac-panel';
      document.body.appendChild(panel);
    }
    return panel;
  }
  function positionPanel(input, panel){
    const r = input.getBoundingClientRect();
    panel.style.left = Math.max(8, r.left) + 'px';
    panel.style.top = (r.bottom + 8) + 'px';
    panel.style.width = Math.min(window.innerWidth - 16, Math.max(280, r.width + 80)) + 'px';
  }
  function hidePanel(input){
    const panel = document.getElementById('cr-ac-panel-' + input.id);
    if (panel) panel.style.display = 'none';
  }
  function chooseSuggestion(input, place){
    input.value = place.address || place.name;
    input.dataset.crResolvedName = place.name || '';
    input.dataset.crResolvedAddress = place.address || '';
    hidePanel(input);
    input.dispatchEvent(new Event('change', {bubbles:true}));
    const start = document.getElementById('start');
    const end = document.getElementById('end');
    if (start && end && start.value.trim() && end.value.trim() && typeof calculateRoutes === 'function') {
      setTimeout(function(){ try { calculateRoutes(); } catch(e){ console.warn('[TZ2] calculate after autocomplete skipped', e); } }, 60);
    }
  }
  function renderLocal(input){
    try {
      if (typeof window.__clearRoadUxDiagFallback === 'function') {
        window.__clearRoadUxDiagFallback('__CLEAR_ROAD_PLACES_AUTOCOMPLETE_READY__ is false or Places API unavailable — UAE local list');
      }
    } catch (_) {}
    const matches = localMatches(input.value);
    const panel = ensurePanel(input);
    positionPanel(input, panel);
    if (!matches.length) { panel.style.display = 'none'; return; }
    panel.innerHTML = matches.map(function(p, idx){
      return '<button type="button" class="cr-ac-item" data-idx="'+idx+'"><span class="cr-ac-icon">★</span><span><div class="cr-ac-main">'+esc(p.name)+'</div><div class="cr-ac-sub">'+esc(p.address)+'</div></span></button>';
    }).join('');
    panel.querySelectorAll('.cr-ac-item').forEach(function(btn){
      btn.addEventListener('mousedown', function(ev){ ev.preventDefault(); chooseSuggestion(input, matches[Number(btn.dataset.idx)]); });
    });
    panel.style.display = 'block';
  }
  function bindInputAssist(input){
    if (!input || input.dataset.crTz2Bound === VERSION) return;
    input.dataset.crTz2Bound = VERSION;
    let timer = null;
    input.setAttribute('autocomplete','off');
    function placesReady(){
      try {
        return window.__CLEAR_ROAD_PLACES_AUTOCOMPLETE_READY__ === true;
      } catch (_) { return false; }
    }
    input.addEventListener('input', function(){
      if (placesReady()) { hidePanel(input); return; }
      clearTimeout(timer);
      timer = setTimeout(function(){ renderLocal(input); }, 220);
    });
    input.addEventListener('focus', function(){
      if (placesReady()) return;
      renderLocal(input);
    });
    input.addEventListener('blur', function(){ setTimeout(function(){ hidePanel(input); }, 180); });
    input.addEventListener('keydown', function(ev){
      if (ev.key !== 'Enter') return;
      if (placesReady()) return;
      const matches = localMatches(input.value);
      if (matches.length) {
        ev.preventDefault();
        chooseSuggestion(input, matches[0]);
      }
    });
    window.addEventListener('resize', function(){ const p = document.getElementById('cr-ac-panel-' + input.id); if (p && p.style.display !== 'none') positionPanel(input, p); });
    window.addEventListener('scroll', function(){ const p = document.getElementById('cr-ac-panel-' + input.id); if (p && p.style.display !== 'none') positionPanel(input, p); }, true);
  }
  function installTZ2Autocomplete(){
    bindInputAssist(document.getElementById('start'));
    bindInputAssist(document.getElementById('end'));
    document.documentElement.setAttribute('data-cr-tz2-autocomplete', VERSION);
  }

  function installAll(){
    patchDriveVM();
    patchRouteDetails();
    installTZ2Autocomplete();
    crNormalizeDurationNode(document);
    document.documentElement.setAttribute('data-cr-tz1-time-format', VERSION);
  }

  const oldInitMap = window.initMap || (typeof initMap === 'function' ? initMap : null);
  if (typeof oldInitMap === 'function' && !oldInitMap.__crTz12Patched) {
    const wrappedInit = function initMapTZ1TZ2Final(){
      const result = oldInitMap.apply(this, arguments);
      setTimeout(installAll, 0);
      return result;
    };
    wrappedInit.__crTz12Patched = true;
    window.initMap = wrappedInit;
    try { initMap = wrappedInit; } catch(_e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installAll);
  else installAll();
  setTimeout(installAll, 500);
  console.info('[Clear Road UAE] TZ1+TZ2 final patch installed', VERSION);
})();
