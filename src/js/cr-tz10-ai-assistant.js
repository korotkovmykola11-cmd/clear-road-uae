(function(){
  'use strict';
  if (window.__CLEAR_ROAD_TZ10_AI_ASSISTANT__) return;
  window.__CLEAR_ROAD_TZ10_AI_ASSISTANT__ = true;

  function lang(){
    try {
      return (typeof currentLang !== 'undefined' && currentLang) || localStorage.getItem('clearroad_lang') || document.documentElement.lang || 'en';
    } catch(e) { return 'en'; }
  }
  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>'"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];
    });
  }
  function clean(v){
    if (typeof stripHtml === 'function') return stripHtml(v);
    return String(v || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function tr(key){
    var L = lang();
    var dict = {
      en:{title:'AI route assistant',status:'ready',listen:'Voice answer',why:'Why',timing:'Timing',fallback:'Build a route first. Then I will explain the best option.',
          noSalik:'No clear Salik risk detected on this option.', salik:'Possible Salik / toll section on this route.', now:'Leaving now looks acceptable.', wait:'Waiting may improve the trip.'},
      ru:{title:'AI помощник маршрута',status:'готов',listen:'Голосовой ответ',why:'Почему',timing:'Когда ехать',fallback:'Сначала постройте маршрут. Потом я объясню лучший вариант.',
          noSalik:'Явного риска Salik на этом варианте не вижу.', salik:'На маршруте возможен Salik / платный участок.', now:'Сейчас ехать можно.', wait:'Небольшое ожидание может улучшить поездку.'},
      ua:{title:'AI помічник маршруту',status:'готово',listen:'Голосова відповідь',why:'Чому',timing:'Коли їхати',fallback:'Спочатку побудуйте маршрут. Потім я поясню найкращий варіант.',
          noSalik:'Явного ризику Salik на цьому варіанті не бачу.', salik:'На маршруті можливий Salik / платна ділянка.', now:'Зараз їхати можна.', wait:'Невелике очікування може покращити поїздку.'},
      ar:{title:'مساعد الطريق بالذكاء الاصطناعي',status:'جاهز',listen:'إجابة صوتية',why:'لماذا',timing:'التوقيت',fallback:'ابنِ المسار أولاً. بعد ذلك سأشرح أفضل خيار.',
          noSalik:'لا يظهر خطر واضح لرسوم سالك في هذا الخيار.', salik:'قد يحتوي هذا الطريق على سالك أو جزء برسوم.', now:'المغادرة الآن تبدو مناسبة.', wait:'الانتظار قليلاً قد يحسن الرحلة.'}
    };
    return (dict[L] && dict[L][key]) || dict.en[key] || key;
  }
  function bestRoute(){
    try {
      if (typeof currentDecision !== 'undefined' && currentDecision && currentDecision.bestRoute) return currentDecision.bestRoute;
      if (typeof selectedRoute !== 'undefined' && selectedRoute) return selectedRoute;
      if (typeof _bestRoute !== 'undefined' && _bestRoute) return _bestRoute;
      if (typeof analyzedRoutes !== 'undefined' && Array.isArray(analyzedRoutes) && analyzedRoutes.length) return analyzedRoutes[0];
    } catch(e) {}
    return null;
  }
  function minutes(r){
    try { if (typeof getDisplayMinutes === 'function') return getDisplayMinutes(r); } catch(e) {}
    try { if (typeof _tz1Minutes === 'function') return _tz1Minutes(r); } catch(e) {}
    return Math.round((r && (r.durationInTraffic || r.duration || r.minutes)) || 0);
  }
  function routeName(r){
    try { if (typeof getRouteSummaryName === 'function') return getRouteSummaryName(r); } catch(e) {}
    try { if (typeof _tz1RouteName === 'function') return _tz1RouteName(r); } catch(e) {}
    return (r && (r.name || r.summary || r.routeName)) || 'selected route';
  }
  function confidence(r){
    try {
      if (typeof currentDecision !== 'undefined' && currentDecision && currentDecision.confidence && currentDecision.confidence.level) return currentDecision.confidence.level;
      if (typeof calculateConfidence === 'function') return calculateConfidence(r, analyzedRoutes);
    } catch(e) {}
    return (r && r.confidence) || 'MEDIUM';
  }
  function hasSalik(r){
    try { if (typeof tz4EstimateSalik === 'function') return Number(tz4EstimateSalik(r) || 0) > 0; } catch(e) {}
    try { if (r && (r.tollCost || r.salikCost || r.salikGates)) return true; } catch(e) {}
    var text = JSON.stringify(r || {}).toLowerCase();
    return /salik|toll|darb/.test(text);
  }
  function timingLine(r){
    try {
      if (typeof generateTimeInsight === 'function') {
        var insight = clean(generateTimeInsight(r));
        if (insight) return insight;
      }
    } catch(e) {}
    return tr('now');
  }
  function fullText(mode){
    var r = bestRoute();
    if (!r) return tr('fallback');
    var L = lang();
    var name = routeName(r);
    var min = minutes(r);
    var conf = String(confidence(r) || 'MEDIUM').toUpperCase();
    var why = '';
    try { if (typeof getAIAdviceText === 'function') why = clean(getAIAdviceText(r)); } catch(e) {}
    if (!why) {
      try { if (typeof getRouteInsight === 'function') why = clean(getRouteInsight(r, r, r)); } catch(e) {}
    }
    var salik = hasSalik(r) ? tr('salik') : tr('noSalik');
    var timing = timingLine(r);
    if (mode === 'timing') return timing;
    if (mode === 'salik') return salik;
    if (mode === 'why' && why) return why;
    if (L === 'ru') return 'AI объяснение: лучший вариант сейчас — через ' + name + ', примерно ' + min + ' минут. ' + (why ? why + ' ' : '') + salik + ' Тайминг: ' + timing + ' Уверенность: ' + conf + '.';
    if (L === 'ua') return 'AI пояснення: найкращий варіант зараз — через ' + name + ', приблизно ' + min + ' хвилин. ' + (why ? why + ' ' : '') + salik + ' Таймінг: ' + timing + ' Впевненість: ' + conf + '.';
    if (L === 'ar') return 'شرح الذكاء الاصطناعي: أفضل خيار الآن عبر ' + name + '، حوالي ' + min + ' دقيقة. ' + (why ? why + ' ' : '') + salik + ' التوقيت: ' + timing + ' الثقة: ' + conf + '.';
    return 'AI explanation: the best option now is via ' + name + ', about ' + min + ' minutes. ' + (why ? why + ' ' : '') + salik + ' Timing: ' + timing + ' Confidence: ' + conf + '.';
  }

  window.tz10BuildAIAssistantText = fullText;
  window.tz10SpeakAIAssistant = function(mode){
    var text = fullText(mode || 'full');
    try {
      if (typeof voiceEnabled !== 'undefined') voiceEnabled = true;
      if (typeof speakText === 'function') { speakText(text, 'normal'); return; }
      if (!('speechSynthesis' in window)) { alert(text); return; }
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = (typeof voiceLang === 'function') ? voiceLang() : ({ru:'ru-RU',ua:'uk-UA',ar:'ar-AE'}[lang()] || 'en-US');
      u.rate = lang() === 'ar' ? 0.92 : 0.98;
      window.speechSynthesis.speak(u);
    } catch(e) { console.warn('TZ10 voice advice failed', e); alert(text); }
  };

  function renderPanel(){
    var hero = document.querySelector('.decision-hero');
    if (!hero) return;
    var old = document.getElementById('tz10-ai-assistant-panel');
    if (old) old.remove();
    var text = fullText('full');
    var panel = document.createElement('div');
    panel.id = 'tz10-ai-assistant-panel';
    panel.className = 'tz10-ai-assistant-panel';
    panel.innerHTML = '<div class="tz10-ai-head"><div class="tz10-ai-title">✦ ' + esc(tr('title')) + '</div><div class="tz10-ai-status">' + esc(tr('status')) + '</div></div>' +
      '<div class="tz10-ai-text" id="tz10-ai-assistant-text">' + esc(text) + '</div>' +
      '<div class="tz10-ai-actions">' +
      '<button type="button" class="tz10-ai-btn primary" onclick="tz10SpeakAIAssistant(\'full\')">🔊 ' + esc(tr('listen')) + '</button>' +
      '<button type="button" class="tz10-ai-btn" onclick="tz10SpeakAIAssistant(\'why\')">' + esc(tr('why')) + '</button>' +
      '<button type="button" class="tz10-ai-btn" onclick="tz10SpeakAIAssistant(\'timing\')">' + esc(tr('timing')) + '</button>' +
      '</div>';
    var anchor = hero.querySelector('.decision-actions') || hero.querySelector('.ai-advice-line') || hero.lastElementChild;
    if (anchor && anchor.parentNode === hero) anchor.insertAdjacentElement('afterend', panel);
    else hero.appendChild(panel);
  }
  window.tz10RenderAIAssistantPanel = renderPanel;

  var oldSpeak = window.speakCurrentDecision;
  window.speakCurrentDecision = function(){
    try { return window.tz10SpeakAIAssistant('full'); }
    catch(e) { if (typeof oldSpeak === 'function') return oldSpeak.apply(this, arguments); }
  };

})();
