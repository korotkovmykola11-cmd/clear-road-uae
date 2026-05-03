(function(){
  'use strict';

  const TZ1_TTS_VERSION = 'TZ1_ELEVENLABS_NATIVE_TTS_FINAL_2026_04_25';
  const SUPPORTED_TTS_LANGS = ['en', 'ru', 'ua', 'ar'];

  const DEFAULT_ELEVENLABS_VOICE_IDS = Object.freeze({
    en: '21m00Tcm4TlvDq8ikWAM',
    ru: 'EXAVITQu4vr4xnSDxMaL',
    ua: 'EXAVITQu4vr4xnSDxMaL',
    ar: 'ErXwobaYiN019PkySvjV'
  });

  const ELEVENLABS_LANG = Object.freeze({
    en: { code: 'en-US', label: 'English' },
    ru: { code: 'ru-RU', label: 'Русский' },
    ua: { code: 'uk-UA', label: 'Українська' },
    ar: { code: 'ar-AE', label: 'العربية' }
  });

  let activeAudio = null;
  let activeObjectUrl = null;
  let lastSpokenText = '';

  function getCurrentLang(){
    const raw = String(
      window.currentLang ||
      document.documentElement.getAttribute('lang') ||
      (document.body && document.body.getAttribute('data-lang')) ||
      localStorageGet('clearroad_lang') ||
      'en'
    ).toLowerCase();
    if (raw === 'uk') return 'ua';
    if (raw.startsWith('ar')) return 'ar';
    if (raw.startsWith('ru')) return 'ru';
    if (raw.startsWith('ua') || raw.startsWith('uk')) return 'ua';
    return SUPPORTED_TTS_LANGS.includes(raw) ? raw : 'en';
  }

  function localStorageGet(key){
    try { return window.localStorage ? localStorage.getItem(key) : null; } catch (_) { return null; }
  }

  function getElevenLabsKey(){
    return String(window.TTS_API_KEY || window.ELEVENLABS_API_KEY || window.CLEAR_ROAD_TTS_API_KEY || '').trim();
  }

  function getVoiceId(lang){
    const custom = window.TTS_VOICE_IDS || window.ELEVENLABS_VOICE_IDS || window.CLEAR_ROAD_TTS_VOICE_IDS || {};
    return String(custom[lang] || DEFAULT_ELEVENLABS_VOICE_IDS[lang] || DEFAULT_ELEVENLABS_VOICE_IDS.en).trim();
  }

  function getDecisionText(lang){
    try {
      if (window.clearRoadLanguageEngine && typeof window.clearRoadLanguageEngine.getAdvice === 'function') {
        const payload = window.clearRoadLanguageEngine.getAdvice({ lang });
        if (payload && (payload.voiceText || payload.text || payload.displayText)) return cleanVoiceText(payload.voiceText || payload.text || payload.displayText);
      }
    } catch (_) {}
    const selectors = ['.ai-advice-line', '.dh-route-line', '.decision-hero', '#drive-next-instruction', '#drive-ahead-text'];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const text = el ? cleanVoiceText(el.textContent || '') : '';
      if (text && text.length > 3) return text;
    }
    return defaultText(lang);
  }

  function defaultText(lang){
    const fallback = {
      en: 'The route is ready. Better to leave now.',
      ru: 'Маршрут готов. Лучше выехать сейчас.',
      ua: 'Маршрут готовий. Краще виїхати зараз.',
      ar: 'المسار جاهز. الأفضل الانطلاق الآن.'
    };
    return fallback[lang] || fallback.en;
  }

  function cleanVoiceText(text){
    return String(text || '')
      .replace(/AI\s*advice\s*:?/ig, '')
      .replace(/AI-совет\s*:?/ig, '')
      .replace(/AI-порада\s*:?/ig, '')
      .replace(/نصيحة الذكاء الاصطناعي\s*:?/g, '')
      .replace(/[★•]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 900);
  }

  function stopAllVoice(){
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
    try { if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; } } catch (_) {}
    if (activeObjectUrl) { try { URL.revokeObjectURL(activeObjectUrl); } catch (_) {} activeObjectUrl = null; }
    activeAudio = null;
  }

  async function speakWithElevenLabs(text, lang){
    const apiKey = getElevenLabsKey();
    if (!apiKey) throw new Error('Missing TTS_API_KEY');
    const voiceId = getVoiceId(lang);
    if (!voiceId) throw new Error('Missing ElevenLabs voice id for ' + lang);
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId), {
      method: 'POST',
      headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        text: text,
        model_id: window.TTS_MODEL_ID || 'eleven_multilingual_v2',
        voice_settings: {
          stability: typeof window.TTS_STABILITY === 'number' ? window.TTS_STABILITY : 0.48,
          similarity_boost: typeof window.TTS_SIMILARITY === 'number' ? window.TTS_SIMILARITY : 0.82,
          style: typeof window.TTS_STYLE === 'number' ? window.TTS_STYLE : 0.18,
          use_speaker_boost: true
        }
      })
    });
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch (_) {}
      throw new Error('ElevenLabs TTS failed: ' + response.status + ' ' + detail.slice(0, 140));
    }
    const blob = await response.blob();
    stopAllVoice();
    activeObjectUrl = URL.createObjectURL(blob);
    activeAudio = new Audio(activeObjectUrl);
    activeAudio.preload = 'auto';
    activeAudio.onended = function(){
      if (activeObjectUrl) { try { URL.revokeObjectURL(activeObjectUrl); } catch (_) {} activeObjectUrl = null; }
      activeAudio = null;
    };
    await activeAudio.play();
    return true;
  }

  function pickBrowserVoice(lang){
    if (!window.speechSynthesis || typeof window.speechSynthesis.getVoices !== 'function') return null;
    const wanted = (ELEVENLABS_LANG[lang] || ELEVENLABS_LANG.en).code.toLowerCase();
    const base = wanted.split('-')[0];
    const voices = window.speechSynthesis.getVoices() || [];
    return voices.find(v => String(v.lang || '').toLowerCase() === wanted) || voices.find(v => String(v.lang || '').toLowerCase().startsWith(base)) || null;
  }

  function speakWithBrowserFallback(text, lang){
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { notifyTTS('Voice unavailable. ' + text); return false; }
    stopAllVoice();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = (ELEVENLABS_LANG[lang] || ELEVENLABS_LANG.en).code;
    const voice = pickBrowserVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.rate = lang === 'ar' ? 0.88 : 0.94;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function notifyTTS(message){
    let el = document.getElementById('tz1-tts-notice');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tz1-tts-notice';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:14px;right:14px;bottom:calc(max(env(safe-area-inset-bottom),.75rem) + 78px);z-index:4000;padding:12px 14px;border-radius:16px;background:rgba(15,23,42,.96);color:white;border:1px solid rgba(245,158,11,.30);font:650 13px/1.35 Inter Tight,system-ui,sans-serif;box-shadow:0 18px 45px rgba(0,0,0,.38);opacity:0;transform:translateY(8px);transition:.18s ease;';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    clearTimeout(notifyTTS._timer);
    notifyTTS._timer = setTimeout(function(){ el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; }, 3800);
  }

  async function speakDecisionNative(){
    const lang = getCurrentLang();
    const text = getDecisionText(lang);
    lastSpokenText = text;
    try {
      await speakWithElevenLabs(text, lang);
      return { ok: true, engine: 'elevenlabs', lang: lang, text: text };
    } catch (err) {
      console.warn('[TZ1 TTS] ElevenLabs fallback:', err);
      const usedFallback = speakWithBrowserFallback(text, lang);
      if (!getElevenLabsKey()) notifyTTS('TTS_API_KEY not found. Browser fallback is used. Add window.TTS_API_KEY in your hidden last lines.');
      return { ok: usedFallback, engine: 'browser-fallback', lang: lang, text: text, error: String(err && err.message || err) };
    }
  }

  function installTZ1TTS(){
    window.clearRoadTZ1TTS = {
      version: TZ1_TTS_VERSION,
      supportedLanguages: SUPPORTED_TTS_LANGS.slice(),
      provider: 'ElevenLabs',
      keyMode: 'window.TTS_API_KEY / window.ELEVENLABS_API_KEY / window.CLEAR_ROAD_TTS_API_KEY',
      model: window.TTS_MODEL_ID || 'eleven_multilingual_v2',
      getCurrentLang: getCurrentLang,
      getDecisionText: getDecisionText,
      speak: speakDecisionNative,
      stop: stopAllVoice,
      hasApiKey: function(){ return !!getElevenLabsKey(); },
      getVoiceId: getVoiceId,
      lastText: function(){ return lastSpokenText; }
    };
    window.speakCurrentDecision = function(){
      try { if (typeof voiceEnabled !== "undefined") voiceEnabled = true; } catch (_) {}
      return speakDecisionNative();
    };
    window.clearRoadSpeakPremiumAdvice = window.speakCurrentDecision;
    if (window.clearRoadVoiceEngine && typeof window.clearRoadVoiceEngine === 'object') {
      window.clearRoadVoiceEngine.provider = 'ElevenLabs';
      window.clearRoadVoiceEngine.version = TZ1_TTS_VERSION;
      window.clearRoadVoiceEngine.speak = function(input){
        const rawLang = input && input.lang ? String(input.lang).toLowerCase() : getCurrentLang();
        const lang = rawLang.startsWith('uk') ? 'ua' : SUPPORTED_TTS_LANGS.includes(rawLang) ? rawLang : getCurrentLang();
        const text = cleanVoiceText(input && input.text ? input.text : getDecisionText(lang));
        return speakWithElevenLabs(text, lang).catch(function(err){ console.warn('[TZ1 TTS] voiceEngine fallback:', err); return speakWithBrowserFallback(text, lang); });
      };
    }
    document.documentElement.setAttribute('data-tz1-tts', TZ1_TTS_VERSION);
    console.info('[TZ1 TTS] installed', { version: TZ1_TTS_VERSION, hasApiKey: !!getElevenLabsKey(), supportedLanguages: SUPPORTED_TTS_LANGS });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installTZ1TTS, { once: true });
  else installTZ1TTS();
})();
