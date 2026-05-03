(function(){
  'use strict';

  const TZ13_VERSION = 'TZ13_PREMIUM_MULTILANGUAGE_VOICE_2026_04_25';
  const SUPPORTED_LANGS = ['en', 'ru', 'ua', 'ar'];
  const VOICE_PROFILES = {
    en: { lang: 'en-US', label: 'English', premiumRequired: false, cloudVoice: 'en-US-Neural' },
    ru: { lang: 'ru-RU', label: 'Русский', premiumRequired: true, cloudVoice: 'ru-RU-Neural' },
    ua: { lang: 'uk-UA', label: 'Українська', premiumRequired: true, cloudVoice: 'uk-UA-Neural' },
    ar: { lang: 'ar-AE', label: 'Arabic', premiumRequired: false, cloudVoice: 'ar-AE-Neural' }
  };

  const TEXT = {
    en: {
      minute_one: 'minute', minute_many: 'minutes', km: 'km', dir: 'ltr',
      voice_unavailable: 'High-quality voice is not available for this language yet.',
      voice_cloud_needed: 'Premium voice required for this language. Text advice is shown instead.',
      route_ready: 'Route is ready.',
      go_now: 'Better to leave now — traffic may get worse in {time}.',
      wait_15: 'It is better to wait {time} — the route may become calmer.',
      traffic_ahead: 'Traffic is building ahead. Keep this route only if it remains faster.',
      no_toll: 'This route avoids tolls, but it may take {delay} longer.',
      salik_route: 'This route may include Salik, but it keeps the trip faster and more stable.',
      complex_interchange: 'Complex interchange ahead. Stay in the correct lane early.',
      stable_route: 'This is the most stable route right now.',
      faster_route: 'This route is faster by about {saving}.',
      gps_weak: 'GPS signal is weak. Navigation is using the last stable position.',
      no_difference: 'The routes are almost equal. Choose the calmer option.',
      ai_prefix: 'AI advice',
      voice_short_go: 'Better to leave now.',
      voice_short_wait: 'Better to wait a little.',
      voice_short_stable: 'This route is stable.'
    },
    ru: {
      minute_one: 'минута', minute_few: 'минуты', minute_many: 'минут', km: 'км', dir: 'ltr',
      voice_unavailable: 'Качественный голос для этого языка пока недоступен.',
      voice_cloud_needed: 'Для русского голоса нужен премиум-движок. Сейчас показан текстовый совет.',
      route_ready: 'Маршрут готов.',
      go_now: 'Лучше выехать сейчас — через {time} ситуация может стать хуже.',
      wait_15: 'Лучше подождать {time} — маршрут может стать спокойнее.',
      traffic_ahead: 'Впереди усиливается трафик. Оставляй этот маршрут только если он всё ещё быстрее.',
      no_toll: 'Этот маршрут без платных дорог, но он может быть дольше на {delay}.',
      salik_route: 'Маршрут может проходить через Salik, зато он быстрее и стабильнее.',
      complex_interchange: 'Впереди сложная развязка. Заранее держись нужной полосы.',
      stable_route: 'Сейчас это самый стабильный маршрут.',
      faster_route: 'Этот маршрут быстрее примерно на {saving}.',
      gps_weak: 'GPS-сигнал слабый. Навигация использует последнюю стабильную позицию.',
      no_difference: 'Маршруты почти равны. Лучше выбрать более спокойный вариант.',
      ai_prefix: 'AI-совет',
      voice_short_go: 'Лучше выехать сейчас.',
      voice_short_wait: 'Лучше немного подождать.',
      voice_short_stable: 'Этот маршрут сейчас стабильный.'
    },
    ua: {
      minute_one: 'хвилина', minute_few: 'хвилини', minute_many: 'хвилин', km: 'км', dir: 'ltr',
      voice_unavailable: 'Якісний голос для цієї мови поки недоступний.',
      voice_cloud_needed: 'Для українського голосу потрібен преміум-рушій. Зараз показано текстову пораду.',
      route_ready: 'Маршрут готовий.',
      go_now: 'Краще виїхати зараз — за {time} ситуація може погіршитися.',
      wait_15: 'Краще зачекати {time} — маршрут може стати спокійнішим.',
      traffic_ahead: 'Попереду посилюється трафік. Залишай цей маршрут лише якщо він досі швидший.',
      no_toll: 'Цей маршрут без платних доріг, але він може бути довшим на {delay}.',
      salik_route: 'Маршрут може проходити через Salik, зате він швидший і стабільніший.',
      complex_interchange: 'Попереду складна розв’язка. Заздалегідь тримайся потрібної смуги.',
      stable_route: 'Зараз це найстабільніший маршрут.',
      faster_route: 'Цей маршрут швидший приблизно на {saving}.',
      gps_weak: 'GPS-сигнал слабкий. Навігація використовує останню стабільну позицію.',
      no_difference: 'Маршрути майже рівні. Краще обрати спокійніший варіант.',
      ai_prefix: 'AI-порада',
      voice_short_go: 'Краще виїхати зараз.',
      voice_short_wait: 'Краще трохи зачекати.',
      voice_short_stable: 'Цей маршрут зараз стабільний.'
    },
    ar: {
      minute_one: 'دقيقة', minute_many: 'دقائق', km: 'كم', dir: 'rtl',
      voice_unavailable: 'الصوت عالي الجودة غير متاح لهذه اللغة حالياً.',
      voice_cloud_needed: 'يتطلب الصوت المميز محركاً عالي الجودة. سيتم عرض النص بدلاً من ذلك.',
      route_ready: 'المسار جاهز.',
      go_now: 'الأفضل الانطلاق الآن — قد تصبح الحركة أسوأ خلال {time}.',
      wait_15: 'الأفضل الانتظار {time} — قد يصبح المسار أهدأ.',
      traffic_ahead: 'تزداد الحركة أمامك. ابقَ على هذا المسار فقط إذا بقي الأسرع.',
      no_toll: 'هذا المسار يتجنب الرسوم، لكنه قد يستغرق {delay} أكثر.',
      salik_route: 'قد يشمل هذا المسار سالك، لكنه أسرع وأكثر استقراراً.',
      complex_interchange: 'توجد عقدة مرورية معقدة أمامك. التزم بالمسار الصحيح مبكراً.',
      stable_route: 'هذا هو المسار الأكثر استقراراً الآن.',
      faster_route: 'هذا المسار أسرع بحوالي {saving}.',
      gps_weak: 'إشارة GPS ضعيفة. يتم استخدام آخر موقع مستقر.',
      no_difference: 'المسارات متقاربة جداً. اختر المسار الأهدأ.',
      ai_prefix: 'نصيحة الذكاء الاصطناعي',
      voice_short_go: 'الأفضل الانطلاق الآن.',
      voice_short_wait: 'الأفضل الانتظار قليلاً.',
      voice_short_stable: 'هذا المسار مستقر الآن.'
    }
  };

  const SCENARIOS = Object.freeze({
    GO_NOW: 'go_now',
    WAIT_15: 'wait_15',
    TRAFFIC_AHEAD: 'traffic_ahead',
    NO_TOLL: 'no_toll',
    SALIK_ROUTE: 'salik_route',
    COMPLEX_INTERCHANGE: 'complex_interchange',
    STABLE_ROUTE: 'stable_route',
    FASTER_ROUTE: 'faster_route',
    GPS_WEAK: 'gps_weak',
    ROUTE_READY: 'route_ready',
    NO_DIFFERENCE: 'no_difference'
  });

  function currentLangSafe(){
    const raw = (typeof window.currentLang === 'string' && window.currentLang) ||
      document.documentElement.getAttribute('lang') ||
      (localStorageSafeGet('clearroad_lang') || 'en');
    return SUPPORTED_LANGS.includes(raw) ? raw : 'en';
  }

  function localStorageSafeGet(key){
    try { return window.localStorage ? localStorage.getItem(key) : null; } catch { return null; }
  }

  function n(value, fallback){
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function pluralMinute(lang, value){
    const num = Math.max(0, Math.round(n(value, 0)));
    if (lang === 'ru') {
      const mod10 = num % 10, mod100 = num % 100;
      if (mod10 === 1 && mod100 !== 11) return num + ' ' + TEXT.ru.minute_one;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return num + ' ' + TEXT.ru.minute_few;
      return num + ' ' + TEXT.ru.minute_many;
    }
    if (lang === 'ua') {
      const mod10 = num % 10, mod100 = num % 100;
      if (mod10 === 1 && mod100 !== 11) return num + ' ' + TEXT.ua.minute_one;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return num + ' ' + TEXT.ua.minute_few;
      return num + ' ' + TEXT.ua.minute_many;
    }
    if (lang === 'ar') return num + ' ' + (num === 1 ? TEXT.ar.minute_one : TEXT.ar.minute_many);
    return num + ' ' + (num === 1 ? TEXT.en.minute_one : TEXT.en.minute_many);
  }

  function normalizeParams(lang, params){
    const p = Object.assign({}, params || {});
    if (p.time == null) p.time = 15;
    if (p.delay == null) p.delay = p.time;
    if (p.saving == null) p.saving = p.delay;
    if (typeof p.time === 'number') p.time = pluralMinute(lang, p.time);
    if (typeof p.delay === 'number') p.delay = pluralMinute(lang, p.delay);
    if (typeof p.saving === 'number') p.saving = pluralMinute(lang, p.saving);
    if (!p.road) p.road = 'main route';
    return p;
  }

  function fillTemplate(template, params){
    return String(template || '').replace(/\{(\w+)\}/g, function(_, key){
      return params[key] != null ? String(params[key]) : '';
    }).replace(/\s+/g, ' ').trim();
  }

  function getScenarioText(lang, scenario, params){
    const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : 'en';
    const dict = TEXT[safeLang] || TEXT.en;
    const key = SCENARIOS[scenario] || scenario || SCENARIOS.ROUTE_READY;
    const template = dict[key] || TEXT.en[key] || TEXT.en.route_ready;
    return fillTemplate(template, normalizeParams(safeLang, params));
  }

  function getAdvicePayload(input){
    const lang = (input && input.lang) || currentLangSafe();
    const scenario = (input && input.scenario) || inferScenario((input && input.route) || getCurrentRoute());
    const params = Object.assign(defaultParamsFromRoute((input && input.route) || getCurrentRoute()), input && input.params);
    const text = getScenarioText(lang, scenario, params);
    return {
      lang,
      scenario,
      text,
      displayText: (TEXT[lang] && TEXT[lang].ai_prefix ? TEXT[lang].ai_prefix : TEXT.en.ai_prefix) + ': ' + text,
      voiceText: buildVoiceText(lang, scenario, params),
      params: normalizeParams(lang, params)
    };
  }

  function getCurrentRoute(){
    try {
      return (window.currentDecision && window.currentDecision.bestRoute) || window.selectedRoute || window._bestRoute || null;
    } catch { return null; }
  }

  function routeDurationMin(route){
    return Math.round(n(route && (route.duration_min || route.duration || route.time || route.minutes), 0));
  }

  function routeDelayMin(route){
    return Math.round(n(route && (route.trafficDelay || route.delay || route.delayMin || route.delay_min), 0));
  }

  function defaultParamsFromRoute(route){
    const delay = routeDelayMin(route);
    let saving = 0;
    try {
      const fastest = window._fastestRoute;
      if (fastest && route) saving = Math.max(0, routeDurationMin(route) - routeDurationMin(fastest));
    } catch {}
    return {
      time: 15,
      delay: delay || 5,
      saving: saving || delay || 5,
      road: (route && (route.name || route.summary || route.routeName)) || 'route'
    };
  }

  function inferScenario(route){
    const delay = routeDelayMin(route);
    const text = JSON.stringify(route || {}).toLowerCase();
    if (/gps.*weak|weak.*gps|gps.*lost|location.*lost/.test(text)) return 'GPS_WEAK';
    if (/interchange|exit|ramp|fork|lane/.test(text)) return 'COMPLEX_INTERCHANGE';
    if (/salik|toll/.test(text) && !/no.?toll|avoid.?toll/.test(text)) return 'SALIK_ROUTE';
    if (/no.?toll|avoid.?toll|without.?toll/.test(text)) return 'NO_TOLL';
    if (delay >= 8) return 'TRAFFIC_AHEAD';
    return 'STABLE_ROUTE';
  }

  function buildVoiceText(lang, scenario, params){
    const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : 'en';
    const key = SCENARIOS[scenario] || scenario || SCENARIOS.ROUTE_READY;
    const shortKey = key === 'go_now' ? 'voice_short_go' : key === 'wait_15' ? 'voice_short_wait' : 'voice_short_stable';
    const dict = TEXT[safeLang] || TEXT.en;
    return dict[shortKey] || getScenarioText(safeLang, scenario, params);
  }

  function findBestBrowserVoice(profile){
    if (!window.speechSynthesis || !profile) return null;
    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
    const lang = String(profile.lang || '').toLowerCase();
    return voices.find(v => String(v.lang || '').toLowerCase() === lang) ||
      voices.find(v => String(v.lang || '').toLowerCase().startsWith(lang.split('-')[0])) || null;
  }

  function showLanguageNotice(message){
    let el = document.getElementById('tz13-language-notice');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tz13-language-notice';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(showLanguageNotice._timer);
    showLanguageNotice._timer = setTimeout(() => el.classList.remove('visible'), 3200);
  }

  async function speakPremium(lang, text){
    const profile = VOICE_PROFILES[lang] || VOICE_PROFILES.en;
    const cloud = window.clearRoadCloudTTS;
    if (cloud && typeof cloud.speak === 'function') {
      await cloud.speak({ lang: profile.lang, voice: profile.cloudVoice, text });
      return true;
    }

    if (profile.premiumRequired) {
      showLanguageNotice((TEXT[lang] || TEXT.en).voice_cloud_needed);
      return false;
    }

    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      showLanguageNotice((TEXT[lang] || TEXT.en).voice_unavailable);
      return false;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = profile.lang;
    const voice = findBestBrowserVoice(profile);
    if (voice) utterance.voice = voice;
    try { window.speechSynthesis.cancel(); } catch {}
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function installTextHooks(){
    const originalSetLang = window.setLang;
    if (typeof originalSetLang === 'function' && !originalSetLang.__tz13Wrapped) {
      const wrappedSetLang = function(lang){
        const result = originalSetLang.apply(this, arguments);
        applyDirection(lang);
        setTimeout(refreshVisibleAdvice, 0);
        return result;
      };
      wrappedSetLang.__tz13Wrapped = true;
      window.setLang = wrappedSetLang;
    }
  }

  function applyDirection(lang){
    const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : currentLangSafe();
    document.documentElement.setAttribute('lang', safeLang);
    document.documentElement.setAttribute('dir', safeLang === 'ar' ? 'rtl' : 'ltr');
    if (document.body) {
      document.body.classList.toggle('rtl', safeLang === 'ar');
      document.body.classList.toggle('tz13-rtl', safeLang === 'ar');
    }
  }

  function refreshVisibleAdvice(){
    const lang = currentLangSafe();
    const payload = getAdvicePayload({ lang });
    const line = document.querySelector('.ai-advice-line');
    if (line && payload.displayText) {
      const prefix = (TEXT[lang] && TEXT[lang].ai_prefix) || TEXT.en.ai_prefix;
      line.innerHTML = '<span>' + escapeHtml(prefix) + '</span>' + escapeHtml(payload.text);
    }
    const voiceBtn = document.querySelector('.ai-voice-btn');
    if (voiceBtn) {
      voiceBtn.setAttribute('data-tz13-lang', lang);
      voiceBtn.title = VOICE_PROFILES[lang] && VOICE_PROFILES[lang].premiumRequired ?
        (TEXT[lang] || TEXT.en).voice_cloud_needed : 'AI Voice';
    }
  }

  function escapeHtml(value){
    return String(value || '').replace(/[&<>"']/g, function(ch){
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch];
    });
  }

  function installVoiceHooks(){
    window.speakCurrentDecision = function(){
      const lang = currentLangSafe();
      const payload = getAdvicePayload({ lang });
      refreshVisibleAdvice();
      return speakPremium(lang, payload.voiceText || payload.text);
    };

    window.clearRoadSpeakPremiumAdvice = window.speakCurrentDecision;

    window.buildDecisionVoiceText = function(routeObj){
      const lang = currentLangSafe();
      return getAdvicePayload({ lang, route: routeObj }).voiceText;
    };

    window.buildRerouteVoiceText = function(decision, altRoute){
      const lang = currentLangSafe();
      const gain = decision && Number.isFinite(Number(decision.gainMin)) ? Number(decision.gainMin) : routeDelayMin(altRoute) || 5;
      const scenario = gain > 0 ? 'FASTER_ROUTE' : 'NO_DIFFERENCE';
      return getAdvicePayload({ lang, route: altRoute, scenario, params: { saving: gain, delay: gain } }).voiceText;
    };
  }

  function audit(){
    const checks = {
      langEngine: typeof window.clearRoadLanguageEngine === 'object',
      voiceEngine: typeof window.clearRoadSpeakPremiumAdvice === 'function',
      templates: SUPPORTED_LANGS.every(l => !!TEXT[l] && !!TEXT[l].go_now && !!TEXT[l].traffic_ahead),
      grammarRU: pluralMinute('ru', 1).includes('минута') && pluralMinute('ru', 2).includes('минуты') && pluralMinute('ru', 5).includes('минут'),
      grammarUA: pluralMinute('ua', 1).includes('хвилина') && pluralMinute('ua', 2).includes('хвилини') && pluralMinute('ua', 5).includes('хвилин'),
      previousCore: ['calculateRoutes','renderResults','startDriveMode','requestGPS','setLang'].every(fn => typeof window[fn] === 'function')
    };
    checks.ok = Object.values(checks).every(Boolean);
    window.clearRoadTZ13Audit = checks;
    console.info('[TZ13]', checks.ok ? 'OK' : 'WARN', checks);
    return checks;
  }

  function install(){
    window.clearRoadLanguageEngine = {
      version: TZ13_VERSION,
      supportedLanguages: SUPPORTED_LANGS.slice(),
      scenarios: Object.assign({}, SCENARIOS),
      getAdvice: getAdvicePayload,
      getScenarioText,
      pluralMinute,
      voiceProfiles: JSON.parse(JSON.stringify(VOICE_PROFILES)),
      textDictionaries: TEXT
    };
    window.clearRoadVoiceEngine = {
      version: TZ13_VERSION,
      speak: speakPremium,
      profiles: VOICE_PROFILES,
      requiresPremiumVoice: function(lang){ return !!(VOICE_PROFILES[lang] && VOICE_PROFILES[lang].premiumRequired); }
    };
    document.documentElement.setAttribute('data-tz13', TZ13_VERSION);
    if (document.body) document.body.classList.add('tz13-premium-language');
    installTextHooks();
    installVoiceHooks();
    applyDirection(currentLangSafe());
    refreshVisibleAdvice();
    audit();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
