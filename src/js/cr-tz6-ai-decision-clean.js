/* ===== ТЗ-6: AI Decision Engine Clean / product-safe AI text layer ===== */
(function clearRoadTZ6AIDecisionClean(){
  'use strict';
  if (window.__CLEAR_ROAD_TZ6_AI_DECISION_CLEAN__) return;
  window.__CLEAR_ROAD_TZ6_AI_DECISION_CLEAN__ = true;

  const TX = {
    en: {
      overline: 'AI ROUTE DECISION', go: 'GO NOW', wait: 'WAIT', via: 'via', min: 'min', same: 'almost the same as alternatives',
      reasonStable: 'stable flow', reasonStops: 'fewer stops', reasonFast: 'fastest option', reasonBalanced: 'best balance', toll: 'tolls may apply', noToll: 'no clear toll risk',
      noWait: 'no clear benefit from waiting 15 min', waitMayHelp: 'waiting may help', confidence: 'AI confidence',
      assistant: 'AI route assistant', ready: 'ready', voice: 'voice answer', why: 'why', timing: 'when to go',
      tradeLbl: 'Trade-off', whenLbl: 'When',
      decision: 'Decision', close: 'Close', breakdown: 'Route breakdown', actions: 'Key driving actions', highway: 'Highway section', note: 'Most important visible actions. Full turn-by-turn stays in Drive Mode.',
      tryRoute: 'Try', lowNote: 'Low confidence: compare alternatives before driving.', medNote: 'Medium confidence: route is acceptable.', highNote: 'High confidence: clear route choice.'
    },
    ru: {
      overline: 'AI РЕШЕНИЕ ПО МАРШРУТУ', go: 'ЕДЬ СЕЙЧАС', wait: 'ПОДОЖДАТЬ', via: 'через', min: 'мин', same: 'почти одинаково с альтернативами',
      reasonStable: 'стабильный поток', reasonStops: 'меньше остановок', reasonFast: 'самый быстрый вариант', reasonBalanced: 'лучший баланс', toll: 'возможен платный участок', noToll: 'явного риска платного участка нет',
      noWait: 'ждать 15 минут явного смысла нет', waitMayHelp: 'ожидание может помочь', confidence: 'уверенность AI',
      assistant: 'AI помощник маршрута', ready: 'готов', voice: 'голосовой ответ', why: 'почему', timing: 'когда ехать',
      tradeLbl: 'Компромисс', whenLbl: 'Когда',
      decision: 'Решение', close: 'Закрыть', breakdown: 'Разбор маршрута', actions: 'Ключевые действия', highway: 'Участок шоссе', note: 'Показаны главные действия. Полная навигация остаётся в режиме езды.',
      tryRoute: 'Попробовать', lowNote: 'Низкая уверенность: сравни альтернативы перед поездкой.', medNote: 'Средняя уверенность: маршрут нормальный.', highNote: 'Высокая уверенность: выбор маршрута очевидный.'
    },
    ua: {
      overline: 'AI РІШЕННЯ ПО МАРШРУТУ', go: 'ЇДЬ ЗАРАЗ', wait: 'ЗАЧЕКАТИ', via: 'через', min: 'хв', same: 'майже однаково з альтернативами',
      reasonStable: 'стабільний потік', reasonStops: 'менше зупинок', reasonFast: 'найшвидший варіант', reasonBalanced: 'найкращий баланс', toll: 'можлива платна ділянка', noToll: 'явного ризику платної ділянки немає',
      noWait: 'чекати 15 хвилин явного сенсу немає', waitMayHelp: 'очікування може допомогти', confidence: 'впевненість AI',
      assistant: 'AI помічник маршруту', ready: 'готово', voice: 'голосова відповідь', why: 'чому', timing: 'коли їхати',
      tradeLbl: 'Компроміс', whenLbl: 'Коли',
      decision: 'Рішення', close: 'Закрити', breakdown: 'Розбір маршруту', actions: 'Ключові дії', highway: 'Ділянка шосе', note: 'Показані головні дії. Повна навігація залишається в режимі їзди.',
      tryRoute: 'Спробувати', lowNote: 'Низька впевненість: порівняй альтернативи перед поїздкою.', medNote: 'Середня впевненість: маршрут нормальний.', highNote: 'Висока впевненість: вибір маршруту очевидний.'
    },
    ar: {
      overline: 'قرار الطريق بالذكاء الاصطناعي', go: 'انطلق الآن', wait: 'انتظر', via: 'عبر', min: 'دقيقة', same: 'تقريبًا مثل البدائل',
      reasonStable: 'تدفق مستقر', reasonStops: 'توقفات أقل', reasonFast: 'الخيار الأسرع', reasonBalanced: 'أفضل توازن', toll: 'قد توجد رسوم', noToll: 'لا يظهر خطر رسوم واضح',
      noWait: 'لا توجد فائدة واضحة من الانتظار 15 دقيقة', waitMayHelp: 'الانتظار قد يساعد', confidence: 'ثقة الذكاء الاصطناعي',
      assistant: 'مساعد الطريق', ready: 'جاهز', voice: 'إجابة صوتية', why: 'لماذا', timing: 'متى تنطلق',
      tradeLbl: 'المقايضة', whenLbl: 'متى',
      decision: 'القرار', close: 'إغلاق', breakdown: 'تفصيل الطريق', actions: 'إجراءات القيادة المهمة', highway: 'جزء طريق سريع', note: 'تم عرض أهم الإجراءات. الإرشاد الكامل يبقى في وضع القيادة.',
      tryRoute: 'جرّب', lowNote: 'ثقة منخفضة: قارن البدائل قبل القيادة.', medNote: 'ثقة متوسطة: الطريق مناسب.', highNote: 'ثقة عالية: الاختيار واضح.'
    }
  };

  function lang(){
    try { return (typeof currentLang !== 'undefined' && currentLang) || localStorage.getItem('clearroad_lang') || document.documentElement.lang || 'en'; } catch(_) { return 'en'; }
  }
  function tt(k){ const L = TX[lang()] ? lang() : 'en'; return (TX[L] && TX[L][k]) || TX.en[k] || k; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function cleanText(v){
    return String(v == null ? '' : v)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\bAI\s*(advice|explanation|совет|пояснення|объяснение)\s*:?/ig, '')
      .replace(/\bhigh stress\b/ig, '')
      .replace(/\bmedium stress\b/ig, '')
      .replace(/\blow stress\b/ig, '')
      .replace(/\bFewer stops via\b/ig, '')
      .replace(/-?\d+\.\d{5,}\s*(min|мин|хв)?/ig, function(m){
        const n = parseFloat(m.replace(',', '.'));
        if (!Number.isFinite(n) || Math.abs(n) < 1) return '';
        return String(Math.round(n)) + (m.match(/хв/) ? ' хв' : m.match(/мин/) ? ' мин' : ' min');
      })
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,;:])/g, '$1')
      .trim();
  }
  function routeList(){ try { return Array.isArray(analyzedRoutes) ? analyzedRoutes : []; } catch(_) { return []; } }
  function bestRoute(){
    try { if (typeof currentDecision !== 'undefined' && currentDecision && currentDecision.bestRoute) return currentDecision.bestRoute; } catch(_) {}
    try { if (typeof selectedRoute !== 'undefined' && selectedRoute) return selectedRoute; } catch(_) {}
    try { if (typeof _bestRoute !== 'undefined' && _bestRoute) return _bestRoute; } catch(_) {}
    return routeList()[0] || null;
  }
  function minutes(r){
    try { if (typeof getDisplayMinutes === 'function') return Math.round(Number(getDisplayMinutes(r))); } catch(_) {}
    try { if (typeof _tz1Minutes === 'function') return Math.round(Number(_tz1Minutes(r))); } catch(_) {}
    const raw = r && (r.durationInTraffic || r.duration || r.durationMin || r.minutes || r.timeMin || 0);
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n > 1000 ? n / 60 : n) : 0;
  }
  function fmtDuration(min){
    const m0 = Math.max(0, Math.round(Number(min) || 0));
    if (m0 < 60) return m0 + ' ' + tt('min');
    const h = Math.floor(m0 / 60), m = m0 % 60;
    return m ? (h + ' h ' + m + ' ' + tt('min')) : (h + ' h');
  }
  function routeName(r){
    try { if (typeof getRouteSummaryName === 'function') return cleanText(getRouteSummaryName(r)); } catch(_) {}
    try { if (typeof _tz1RouteName === 'function') return cleanText(_tz1RouteName(r)); } catch(_) {}
    return cleanText((r && (r.name || r.summary || r.routeName || r.via)) || 'route');
  }
  function hasToll(r){
    if (!r) return false;
    if (Number(r.tollCost || r.salikCost || 0) > 0) return true;
    const txt = JSON.stringify(r).toLowerCase();
    return /salik|toll|darb|paid/.test(txt);
  }
  function trafficWord(r){
    const txt = JSON.stringify(r || {}).toLowerCase();
    if (/heavy|high|severe|traffic_jam|jam|dense/.test(txt)) return 'heavy';
    if (/medium|moderate/.test(txt)) return 'medium';
    return 'stable';
  }
  function confInfo(){
    let pct = null;
    try { if (currentDecision && currentDecision.confidence && Number.isFinite(currentDecision.confidence.percent)) pct = currentDecision.confidence.percent; } catch(_) {}
    if (pct == null) {
      const el = document.querySelector('.dh-conf-pct');
      if (el) pct = parseFloat(el.textContent);
    }
    if (!Number.isFinite(pct)) pct = 70;
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    const level = pct >= 80 ? 'HIGH' : pct >= 60 ? 'MEDIUM' : 'LOW';
    const note = level === 'HIGH' ? tt('highNote') : level === 'MEDIUM' ? tt('medNote') : tt('lowNote');
    return { pct, level, note };
  }
  function decisionModel(){
    const r = bestRoute();
    if (!r) return null;
    const routes = routeList();
    const mins = minutes(r);
    const name = routeName(r);
    const otherMins = routes.filter(x => x && x !== r).map(minutes).filter(Number.isFinite).sort((a,b)=>a-b);
    const nearestDiff = otherMins.length ? Math.abs(otherMins[0] - mins) : 0;
    const reasons = [];
    const trf = trafficWord(r);
    if (trf === 'stable') reasons.push(tt('reasonStable'));
    const text = JSON.stringify(r || {}).toLowerCase();
    if (/fewer|less stops|few stops|stops/.test(text)) reasons.push(tt('reasonStops'));
    if (otherMins.length && mins <= otherMins[0]) reasons.push(tt('reasonFast'));
    if (!reasons.length) reasons.push(tt('reasonBalanced'));
    const trade = hasToll(r) ? tt('toll') : tt('noToll');
    const when = tt('noWait');
    const conf = confInfo();
    return { r, mins, name, nearestDiff, reasons: Array.from(new Set(reasons)).slice(0,2), trade, when, conf };
  }
  function lineHTML(label, value){ return '<span>' + esc(label) + '</span>' + esc(value); }
  function applyHeroAI(){
    const m = decisionModel();
    if (!m) return;
    const hero = document.querySelector('.decision-hero');
    if (!hero) return;
    const over = hero.querySelector('.dh-overline');
    if (over) over.textContent = tt('overline');
    const eta = hero.querySelector('.dh-eta');
    if (eta) eta.innerHTML = esc(String(m.mins)) + '<span class="dh-min">' + esc(tt('min')) + '</span>';
    const routeLine = hero.querySelector('.dh-route-line');
    if (routeLine) routeLine.textContent = tt('go') + ' · ' + tt('via') + ' ' + m.name;
    const advice = hero.querySelector('.ai-advice-line');
    if (advice) {
      advice.dataset.tz6Clean = '1';
      advice.innerHTML =
        lineHTML(tt('decision'), tt('go')) + '<br>' +
        lineHTML(tt('why'), m.reasons.join(' · ')) + '<br>' +
        lineHTML(tt('tradeLbl'), m.trade) + '<br>' +
        lineHTML(tt('whenLbl'), m.when);
    }
    const confLabel = hero.querySelector('.dh-conf-label');
    if (confLabel) confLabel.textContent = tt('confidence');
    const confLevel = hero.querySelector('.dh-conf-level');
    if (confLevel) { confLevel.textContent = m.conf.level; confLevel.className = 'dh-conf-level ' + m.conf.level.toLowerCase(); }
    const confPct = hero.querySelector('.dh-conf-pct');
    if (confPct) confPct.textContent = m.conf.pct + '%';
    const confFill = hero.querySelector('.dh-conf-fill');
    if (confFill) confFill.style.width = m.conf.pct + '%';
    const oldPanel = document.getElementById('tz10-ai-assistant-panel');
    if (oldPanel) {
      oldPanel.innerHTML =
        '<div class="tz10-ai-head"><div class="tz10-ai-title">✦ ' + esc(tt('assistant')) + '</div><div class="tz10-ai-status">' + esc(tt('ready')) + '</div></div>' +
        '<div class="tz10-ai-text" id="tz10-ai-assistant-text">' + esc(tt('decision') + ': ' + tt('go') + '. ' + tt('via') + ' ' + m.name + ' · ' + fmtDuration(m.mins) + '. ' + m.reasons.join(' · ') + '. ' + m.trade + '. ' + m.when + '. ' + m.conf.note) + '</div>' +
        '<div class="tz10-ai-actions">' +
        '<button type="button" class="tz10-ai-btn primary" onclick="speakCurrentDecision()">🔊 ' + esc(tt('voice')) + '</button>' +
        '<button type="button" class="tz10-ai-btn" data-tz6-why="1">' + esc(tt('why')) + '</button>' +
        '<button type="button" class="tz10-ai-btn" data-tz6-timing="1">' + esc(tt('timing')) + '</button>' +
        '</div>';
      oldPanel.querySelector('[data-tz6-why]')?.addEventListener('click', function(){ speakShort(m.reasons.join('. ') + '. ' + m.trade); });
      oldPanel.querySelector('[data-tz6-timing]')?.addEventListener('click', function(){ speakShort(m.when); });
    }
    document.querySelectorAll('.ai-advice-line, .tz10-ai-text').forEach(function(el){
      el.innerHTML = el.innerHTML.replace(/0\.09999999999999964|0\.10000000000000014|\d+\.\d{6,}/g, function(v){
        const n = parseFloat(v); return Math.abs(n) < 1 ? '' : String(Math.round(n));
      }).replace(/high stress/ig, '').replace(/\s+([.,;:])/g, '$1');
    });
  }
  function speakShort(text){
    const msg = cleanText(text || buildSpeech());
    try {
      if (typeof speakText === 'function') return speakText(msg, 'normal');
      if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(msg); u.lang = ({ru:'ru-RU',ua:'uk-UA',ar:'ar-AE'}[lang()] || 'en-US'); u.rate = 0.96; window.speechSynthesis.speak(u); }
      else alert(msg);
    } catch(_) { alert(msg); }
  }
  function buildSpeech(){
    const m = decisionModel();
    if (!m) return '';
    return tt('decision') + ': ' + tt('go') + '. ' + tt('via') + ' ' + m.name + '. ' + fmtDuration(m.mins) + '. ' + m.reasons.join('. ') + '. ' + m.trade + '. ' + m.when + '. ' + m.conf.note;
  }
  function applyDetailsClean(){
    const modal = document.getElementById('modal-content');
    if (!modal) return;
    const replacements = [
      [/^ROUTE BREAKDOWN$/i, tt('breakdown')], [/^KEY DRIVING ACTIONS$/i, tt('actions')], [/^Highway section$/i, tt('highway')],
      [/^These are the most important visible instructions.*$/i, tt('note')], [/^CLOSE$/i, tt('close')]
    ];
    const walker = document.createTreeWalker(modal, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(n){
      let v = n.nodeValue.trim();
      replacements.forEach(function(pair){ if (pair[0].test(v)) n.nodeValue = n.nodeValue.replace(pair[0], pair[1]); });
      n.nodeValue = n.nodeValue.replace(/0\.09999999999999964|0\.10000000000000014|\d+\.\d{6,}/g, function(x){ const num = parseFloat(x); return Math.abs(num) < 1 ? '' : String(Math.round(num)); });
    });
    modal.querySelectorAll('button').forEach(function(btn){
      const txt = cleanText(btn.textContent);
      if (/^TRY\s+/i.test(txt) || /^ПОПРОБОВАТЬ\s+/i.test(txt) || /^СПРОБУВАТИ\s+/i.test(txt)) {
        const m = decisionModel();
        if (m) btn.textContent = tt('tryRoute') + ' ' + m.name;
      }
    });
  }
  function applyAll(){
    try { applyHeroAI(); } catch(e) { console.warn('TZ6 AI hero clean failed', e); }
    try { applyDetailsClean(); } catch(e) { console.warn('TZ6 details clean failed', e); }
  }

  const oldOpen = window.openRouteDetails || (typeof openRouteDetails === 'function' ? openRouteDetails : null);
  if (typeof oldOpen === 'function' && !oldOpen.__tz6AICleanWrapped) {
    const wrappedOpen = function(){
      const out = oldOpen.apply(this, arguments);
      setTimeout(applyAll, 0); setTimeout(applyAll, 120); setTimeout(applyAll, 400);
      return out;
    };
    wrappedOpen.__tz6AICleanWrapped = true;
    window.openRouteDetails = wrappedOpen;
    try { openRouteDetails = wrappedOpen; } catch(_) {}
  }

  const oldSetLang = window.setLang || (typeof setLang === 'function' ? setLang : null);
  if (typeof oldSetLang === 'function' && !oldSetLang.__tz6AICleanWrapped) {
    const wrappedLang = function(){
      const out = oldSetLang.apply(this, arguments);
      setTimeout(applyAll, 0); setTimeout(applyAll, 150);
      return out;
    };
    wrappedLang.__tz6AICleanWrapped = true;
    window.setLang = wrappedLang;
    try { setLang = wrappedLang; } catch(_) {}
  }

  window.speakCurrentDecision = function(){
    try { if (typeof voiceEnabled !== "undefined") voiceEnabled = true; } catch (_) {}
    return speakShort(buildSpeech());
  };
  window.clearRoadTZ6AICleanApply = applyAll;
  window.clearRoadTZ6AICleanAudit = function(){
    return {
      marker: !!window.__CLEAR_ROAD_TZ6_AI_DECISION_CLEAN__,
      noLongFloatInAI: !/\d+\.\d{6,}/.test((document.querySelector('.ai-advice-line')||{}).textContent || ''),
      heroCleanerReady: typeof applyHeroAI === 'function',
      detailsCleanerReady: typeof applyDetailsClean === 'function',
      oldCorePresent: ['calculateRoutes','renderResults','startDriveMode','requestGPS','setLang'].every(function(fn){ return typeof window[fn] === 'function' || typeof globalThis[fn] === 'function'; })
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(applyAll, 0); });
  else setTimeout(applyAll, 0);
})();
