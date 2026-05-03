/* ===== ТЗ-6B: AI + TIME FINAL SAFETY PATCH ===== */
(function clearRoadTZ6BFinalFix(){
  'use strict';
  if (window.__CLEAR_ROAD_TZ6B_FINAL_FIX__) return;
  window.__CLEAR_ROAD_TZ6B_FINAL_FIX__ = true;

  const DICT = {
    en:{aiDecision:'AI ROUTE DECISION',go:'GO NOW',wait:'WAIT',similar:'ALMOST SAME',via:'via',why:'Why',trade:'Trade-off',when:'When',voice:'Voice answer',confidence:'AI confidence',min:'min',now:'go now',noWait:'You can go now — almost no difference.',stable:'stable flow',fast:'fastest option',stops:'fewer stops',balance:'best balance',toll:'tolls may apply',noToll:'no clear toll risk',assistant:'AI route assistant',ready:'ready',low:'Low confidence: compare alternatives before driving.',medium:'Medium confidence: route is acceptable.',high:'High confidence: clear route choice.',close:'Close',try:'Try'},
    ru:{aiDecision:'AI РЕШЕНИЕ ПО МАРШРУТУ',go:'ЕДЬ СЕЙЧАС',wait:'ПОДОЖДАТЬ',similar:'ПОЧТИ ОДИНАКОВО',via:'через',why:'Почему',trade:'Компромисс',when:'Когда',voice:'Голосовой ответ',confidence:'уверенность AI',min:'мин',now:'ехать сейчас',noWait:'Можно ехать сейчас — разницы почти нет',stable:'стабильный поток',fast:'самый быстрый вариант',stops:'меньше остановок',balance:'лучший баланс',toll:'возможен платный участок',noToll:'явного риска платного участка нет',assistant:'AI помощник маршрута',ready:'готов',low:'Низкая уверенность: сравни альтернативы перед поездкой.',medium:'Средняя уверенность: маршрут нормальный.',high:'Высокая уверенность: выбор маршрута очевидный.',close:'Закрыть',try:'Попробовать'},
    ua:{aiDecision:'AI РІШЕННЯ ПО МАРШРУТУ',go:'ЇДЬ ЗАРАЗ',wait:'ЗАЧЕКАТИ',similar:'МАЙЖЕ ОДНАКОВО',via:'через',why:'Чому',trade:'Компроміс',when:'Коли',voice:'Голосова відповідь',confidence:'впевненість AI',min:'хв',now:'їхати зараз',noWait:'Можна їхати зараз — різниця майже нуль',stable:'стабільний потік',fast:'найшвидший варіант',stops:'менше зупинок',balance:'найкращий баланс',toll:'можлива платна ділянка',noToll:'явного ризику платної ділянки немає',assistant:'AI помічник маршруту',ready:'готово',low:'Низька впевненість: порівняй альтернативи перед поїздкою.',medium:'Середня впевненість: маршрут нормальний.',high:'Висока впевненість: вибір маршруту очевидний.',close:'Закрити',try:'Спробувати'},
    ar:{aiDecision:'قرار الطريق بالذكاء الاصطناعي',go:'انطلق الآن',wait:'انتظر',similar:'تقريبًا نفس الشيء',via:'عبر',why:'السبب',trade:'المقايضة',when:'متى',voice:'إجابة صوتية',confidence:'ثقة الذكاء الاصطناعي',min:'دقيقة',now:'انطلق الآن',noWait:'يمكنك الانطلاق الآن — الفرق ضئيل',stable:'تدفق مستقر',fast:'الخيار الأسرع',stops:'توقفات أقل',balance:'أفضل توازن',toll:'قد توجد رسوم',noToll:'لا يظهر خطر رسوم واضح',assistant:'مساعد الطريق',ready:'جاهز',low:'ثقة منخفضة: قارن البدائل قبل القيادة.',medium:'ثقة متوسطة: الطريق مناسب.',high:'ثقة عالية: الاختيار واضح.',close:'إغلاق',try:'جرّب'}
  };
  function lang(){
    try { return (typeof currentLang !== 'undefined' && currentLang) || localStorage.getItem('clearroad_lang') || document.documentElement.lang || 'en'; } catch(_) { return 'en'; }
  }
  function tr(k){ const L = DICT[lang()] ? lang() : 'en'; return (DICT[L] && DICT[L][k]) || DICT.en[k] || k; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function num(v, fallback){
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : (fallback || 0);
  }
  function minutesFromRoute(route){
    if (!route) return 0;
    const minuteFields = ['durationMin','minutes','timeMin','etaMin','duration_min'];
    for (const k of minuteFields) if (Number.isFinite(num(route[k], NaN))) return Math.max(0, Math.round(num(route[k], 0)));
    const secondFields = ['durationInTraffic','durationTrafficSec','duration_in_traffic','durationSec','duration','time','etaSec'];
    for (const k of secondFields) {
      const v = num(route[k], NaN);
      if (Number.isFinite(v) && v > 0) return Math.max(0, Math.round(v > 240 ? v / 60 : v));
    }
    return 0;
  }
  function fmtMinutes(value){
    const m = Math.max(0, Math.round(num(value, 0)));
    if (m < 60) return m + ' ' + tr('min');
    const h = Math.floor(m / 60), rest = m % 60;
    return rest ? (h + ' h ' + rest + ' ' + tr('min')) : (h + ' h');
  }
  function cleanRawText(value){
    return String(value == null ? '' : value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\bAI\s*(advice|explanation|совет|пояснення|объяснение)\s*:?/ig, '')
      .replace(/\b(high|medium|low)\s+stress\b/ig, '')
      .replace(/\bFewer stops via\b/ig, '')
      .replace(/-?\d+\.\d{5,}\s*(min|mins|мин|хв)?/ig, function(m){
        const n = parseFloat(m.replace(',', '.'));
        if (!Number.isFinite(n) || Math.abs(n) < 1) return '';
        if (/хв/i.test(m)) return Math.round(n) + ' хв';
        if (/мин/i.test(m)) return Math.round(n) + ' мин';
        return Math.round(n) + ' min';
      })
      .replace(/(\d+)\.(\d+)\s*(min|mins|мин|хв)\b/ig, function(_, a, b, unit){
        const rounded = Math.round(parseFloat(a + '.' + b));
        return rounded + ' ' + unit;
      })
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,;:])/g, '$1')
      .trim();
  }
  function getRoutes(){
    try { if (Array.isArray(analyzedRoutes) && analyzedRoutes.length) return analyzedRoutes; } catch(_) {}
    try { if (Array.isArray(allRoutes) && allRoutes.length) return allRoutes; } catch(_) {}
    return [];
  }
  function getBest(){
    try { if (currentDecision && currentDecision.bestRoute) return currentDecision.bestRoute; } catch(_) {}
    try { if (selectedRoute) return selectedRoute; } catch(_) {}
    const routes = getRoutes();
    return routes[0] || null;
  }
  function routeName(route){
    try { if (typeof getRouteSummaryName === 'function') return cleanRawText(getRouteSummaryName(route)); } catch(_) {}
    try { if (typeof _tz1RouteName === 'function') return cleanRawText(_tz1RouteName(route)); } catch(_) {}
    return cleanRawText(route && (route.name || route.summary || route.routeName || route.via || route.mainRoad || 'route'));
  }
  function hasToll(route){
    if (!route) return false;
    if (num(route.tollCost || route.salikCost || route.tolls, 0) > 0) return true;
    try { return /salik|toll|darb|paid|платн|رسوم/.test(JSON.stringify(route).toLowerCase()); } catch(_) { return false; }
  }
  function routeSignal(route){
    const txt = (() => { try { return JSON.stringify(route || {}).toLowerCase(); } catch(_) { return ''; } })();
    const reasons = [];
    if (/fewer|less stops|few stops|stops|зупинок|останов/.test(txt)) reasons.push(tr('stops'));
    if (/stable|low|smooth|стаб/.test(txt)) reasons.push(tr('stable'));
    if (!reasons.length) reasons.push(tr('balance'));
    return Array.from(new Set(reasons)).slice(0, 2);
  }
  function confidence(){
    let pct = NaN;
    try { if (currentDecision && currentDecision.confidence) pct = num(currentDecision.confidence.percent, NaN); } catch(_) {}
    if (!Number.isFinite(pct)) {
      const el = document.querySelector('.dh-conf-pct');
      if (el) pct = num(el.textContent, NaN);
    }
    if (!Number.isFinite(pct)) pct = 70;
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    const level = pct >= 80 ? 'HIGH' : pct >= 60 ? 'MEDIUM' : 'LOW';
    const note = level === 'HIGH' ? tr('high') : level === 'MEDIUM' ? tr('medium') : tr('low');
    return {pct, level, note};
  }
  function model(){
    const route = getBest();
    if (!route) return null;
    const minutes = minutesFromRoute(route);
    const name = routeName(route);
    const reasons = routeSignal(route);
    const trade = hasToll(route) ? tr('toll') : tr('noToll');
    const conf = confidence();
    return {route, minutes, name, reasons, trade, conf, decision: tr('go'), when: tr('noWait')};
  }
  function shortSpeech(){
    const m = model();
    if (!m) return '';
    return [m.decision, tr('via') + ' ' + m.name, fmtMinutes(m.minutes), m.reasons.join('. '), m.trade, m.when, m.conf.note].filter(Boolean).join('. ');
  }
  function applyHero(){
    const m = model();
    const hero = document.querySelector('.decision-hero');
    if (!m || !hero) return;
    const over = hero.querySelector('.dh-overline');
    if (over) over.textContent = tr('aiDecision');
    const eta = hero.querySelector('.dh-eta');
    if (eta) eta.innerHTML = esc(String(m.minutes)) + '<span class="dh-min">' + esc(tr('min')) + '</span>';
    const line = hero.querySelector('.dh-route-line');
    if (line) line.textContent = m.decision + ' · ' + tr('via') + ' ' + m.name;
    const advice = hero.querySelector('.ai-advice-line');
    if (advice) {
      advice.dataset.tz6b = 'clean';
      advice.innerHTML = '<span>AI</span> ' + esc(m.decision) + '<br>' +
        '<span>' + esc(tr('why')) + '</span> ' + esc(m.reasons.join(' · ')) + '<br>' +
        '<span>' + esc(tr('trade')) + '</span> ' + esc(m.trade) + '<br>' +
        '<span>' + esc(tr('when')) + '</span> ' + esc(m.when);
    }
    const confLabel = hero.querySelector('.dh-conf-label');
    if (confLabel) confLabel.textContent = tr('confidence');
    const confLevel = hero.querySelector('.dh-conf-level');
    if (confLevel) { confLevel.textContent = m.conf.level; confLevel.className = 'dh-conf-level ' + m.conf.level.toLowerCase(); }
    const confPct = hero.querySelector('.dh-conf-pct');
    if (confPct) confPct.textContent = m.conf.pct + '%';
    const confFill = hero.querySelector('.dh-conf-fill');
    if (confFill) confFill.style.width = m.conf.pct + '%';
  }
  function applyAssistant(){
    const m = model();
    if (!m) return;
    const panel = document.getElementById('tz10-ai-assistant-panel');
    if (!panel) return;
    panel.innerHTML = '<div class="tz10-ai-head"><div class="tz10-ai-title">✦ ' + esc(tr('assistant')) + '</div><div class="tz10-ai-status">' + esc(tr('ready')) + '</div></div>' +
      '<div class="tz10-ai-text" id="tz10-ai-assistant-text">' + esc(shortSpeech()) + '</div>' +
      '<div class="tz10-ai-actions"><button type="button" class="tz10-ai-btn primary" onclick="speakCurrentDecision()">🔊 ' + esc(tr('voice')) + '</button></div>';
  }
  function sanitizeTextNode(node){
    if (!node || !node.nodeValue) return;
    let v = node.nodeValue;
    v = v.replace(/(\d+)\.(\d+)\s*(min|mins|мин|хв)\b/ig, function(_, a, b, unit){ return Math.round(parseFloat(a + '.' + b)) + ' ' + unit; });
    v = v.replace(/-?\d+\.\d{5,}\s*(min|mins|мин|хв)?/ig, function(match){
      const n = parseFloat(match.replace(',', '.'));
      if (!Number.isFinite(n) || Math.abs(n) < 1) return '';
      return String(Math.round(n));
    });
    v = v.replace(/\bhigh stress\b|\bmedium stress\b|\blow stress\b/ig, '');
    v = v.replace(/\s+([.,;:])/g, '$1').replace(/\s{2,}/g, ' ');
    node.nodeValue = v;
  }
  function sanitizeContainers(){
    const selectors = ['.decision-hero', '#tz10-ai-assistant-panel', '.modal-content', '.drive-alert', '.other-routes'];
    selectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(root){
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(sanitizeTextNode);
      });
    });
  }
  function applyDetails(){
    const modal = document.getElementById('modal-content');
    if (!modal) return;
    modal.querySelectorAll('button').forEach(function(btn){
      const t = cleanRawText(btn.textContent);
      if (/^close$/i.test(t) || /^закрыть$/i.test(t) || /^закрити$/i.test(t)) btn.textContent = tr('close');
      if (/^(try|попробовать|спробувати)\b/i.test(t)) {
        const m = model();
        if (m) btn.textContent = tr('try') + ' ' + m.name;
      }
    });
  }
  function applyAll(){
    try { applyHero(); } catch(e) { console.warn('[TZ6B] hero failed', e); }
    try { applyAssistant(); } catch(e) { console.warn('[TZ6B] assistant failed', e); }
    try { applyDetails(); } catch(e) { console.warn('[TZ6B] details failed', e); }
    try { sanitizeContainers(); } catch(e) { console.warn('[TZ6B] sanitize failed', e); }
  }
  function schedule(){ [0, 50, 150, 350, 800].forEach(t => setTimeout(applyAll, t)); }
  window.clearRoadTZ6bScheduleApplyAll = schedule;

  window.formatClearRoadMinutes = fmtMinutes;
  window.getDisplayMinutes = function(route){ return minutesFromRoute(route); };
  window.getDisplayDiff = function(a,b){
    const d = minutesFromRoute(a) - minutesFromRoute(b);
    return Math.abs(d) < 1 ? 0 : Math.round(d);
  };
  window.getAIAdviceText = function(route){
    const r = route || getBest();
    const m = r ? {minutes: minutesFromRoute(r), name: routeName(r), reasons: routeSignal(r), trade: hasToll(r) ? tr('toll') : tr('noToll')} : null;
    if (!m) return '';
    return tr('go') + ' · ' + tr('via') + ' ' + m.name + '. ' + fmtMinutes(m.minutes) + '. ' + m.reasons.join(' · ') + '. ' + m.trade + '.';
  };
  window.buildDecisionVoiceText = function(){ return shortSpeech(); };
  window.speakCurrentDecision = function(){
    try { if (typeof voiceEnabled !== 'undefined') voiceEnabled = true; } catch (_) {}
    const text = shortSpeech();
    try {
      if (typeof speakText === 'function') return speakText(text, 'normal');
      if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = ({ru:'ru-RU',ua:'uk-UA',ar:'ar-AE'}[lang()] || 'en-US'); u.rate = 0.96; window.speechSynthesis.speak(u); }
      else alert(text);
    } catch(_) { alert(text); }
  };

  const wrap = function(name){
    const original = window[name] || (typeof globalThis[name] === 'function' ? globalThis[name] : null);
    if (typeof original !== 'function' || original.__tz6bWrapped) return;
    const fn = function(){ const out = original.apply(this, arguments); schedule(); return out; };
    fn.__tz6bWrapped = true;
    window[name] = fn;
    try { globalThis[name] = fn; } catch(_) {}
  };
  ['renderResults','openRouteDetails','setLang','setUserPreference','toggleFilter'].forEach(wrap);

  const obs = new MutationObserver(function(){
    clearTimeout(window.__tz6bMutationTimer);
    window.__tz6bMutationTimer = setTimeout(applyAll, 60);
  });
  if (document.body) obs.observe(document.body, {childList:true, subtree:true, characterData:true});
  else document.addEventListener('DOMContentLoaded', function(){ obs.observe(document.body, {childList:true, subtree:true, characterData:true}); schedule(); });

  window.clearRoadTZ6BAudit = function(){
    const txt = document.body ? document.body.innerText : '';
    return {
      marker: !!window.__CLEAR_ROAD_TZ6B_FINAL_FIX__,
      noLongFloat: !/\d+\.\d{5,}/.test(txt),
      minutesIntegerFormatter: fmtMinutes(12.3) === ('12 ' + tr('min')),
      adviceOverride: typeof window.getAIAdviceText === 'function',
      voiceOverride: typeof window.speakCurrentDecision === 'function',
      oldCorePresent: ['calculateRoutes','renderResults','startDriveMode','requestGPS','setLang'].every(function(fn){ return typeof window[fn] === 'function' || typeof globalThis[fn] === 'function'; })
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule); else schedule();
})();
