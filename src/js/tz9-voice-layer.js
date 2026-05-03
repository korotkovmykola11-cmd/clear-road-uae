(function(){
  'use strict';
  if (window.clearRoadTZ9VoiceInput && window.clearRoadTZ9VoiceInput.installed) return;

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let activeRecognition = null;
  let activeTarget = null;
  let statusTimer = null;

  function addI18n() {
    if (typeof i18n !== 'object' || !i18n) return;
    const pack = {
      en: {
        voice_start_title: 'Speak start point',
        voice_end_title: 'Speak destination',
        voice_listening_start: 'Listening for start point…',
        voice_listening_end: 'Listening for destination…',
        voice_not_supported: 'Voice input is not supported in this browser. Type the address manually.',
        voice_no_match: 'I did not catch the address. Try again or type it manually.',
        voice_error: 'Voice input error. Type the address manually or try again.',
        voice_set_start: 'Start point set by voice',
        voice_set_end: 'Destination set by voice',
        voice_mic_denied: 'Microphone access denied. Allow microphone permission and try again.'
      },
      ru: {
        voice_start_title: 'Голосом: откуда',
        voice_end_title: 'Голосом: куда',
        voice_listening_start: 'Слушаю точку отправления…',
        voice_listening_end: 'Слушаю пункт назначения…',
        voice_not_supported: 'Голосовой ввод не поддерживается в этом браузере. Введите адрес вручную.',
        voice_no_match: 'Адрес не распознан. Попробуйте ещё раз или введите вручную.',
        voice_error: 'Ошибка голосового ввода. Введите адрес вручную или попробуйте ещё раз.',
        voice_set_start: 'Точка отправления введена голосом',
        voice_set_end: 'Пункт назначения введён голосом',
        voice_mic_denied: 'Доступ к микрофону запрещён. Разрешите микрофон и попробуйте снова.'
      },
      ua: {
        voice_start_title: 'Голосом: звідки',
        voice_end_title: 'Голосом: куди',
        voice_listening_start: 'Слухаю точку відправлення…',
        voice_listening_end: 'Слухаю пункт призначення…',
        voice_not_supported: 'Голосове введення не підтримується в цьому браузері. Введіть адресу вручну.',
        voice_no_match: 'Адресу не розпізнано. Спробуйте ще раз або введіть вручну.',
        voice_error: 'Помилка голосового введення. Введіть адресу вручну або спробуйте ще раз.',
        voice_set_start: 'Точку відправлення введено голосом',
        voice_set_end: 'Пункт призначення введено голосом',
        voice_mic_denied: 'Доступ до мікрофона заборонено. Дозвольте мікрофон і спробуйте знову.'
      },
      ar: {
        voice_start_title: 'إدخال نقطة البداية بالصوت',
        voice_end_title: 'إدخال الوجهة بالصوت',
        voice_listening_start: 'أستمع إلى نقطة البداية…',
        voice_listening_end: 'أستمع إلى الوجهة…',
        voice_not_supported: 'الإدخال الصوتي غير مدعوم في هذا المتصفح. أدخل العنوان يدويًا.',
        voice_no_match: 'لم ألتقط العنوان. حاول مرة أخرى أو أدخله يدويًا.',
        voice_error: 'خطأ في الإدخال الصوتي. أدخل العنوان يدويًا أو حاول مرة أخرى.',
        voice_set_start: 'تم تعيين نقطة البداية بالصوت',
        voice_set_end: 'تم تعيين الوجهة بالصوت',
        voice_mic_denied: 'تم رفض الوصول إلى الميكروفون. اسمح بالميكروفون وحاول مرة أخرى.'
      }
    };
    Object.keys(pack).forEach(lang => {
      i18n[lang] = Object.assign({}, i18n[lang] || {}, pack[lang]);
    });
  }

  function tr(key) {
    try { return typeof t === 'function' ? t(key) : key; } catch { return key; }
  }

  function getVoiceLang() {
    try {
      if (typeof voiceLang === 'function') return voiceLang();
      const map = { en: 'en-US', ru: 'ru-RU', ua: 'uk-UA', ar: 'ar-AE' };
      return map[window.currentLang] || 'en-US';
    } catch { return 'en-US'; }
  }

  function ensureStatusEl() {
    let el = document.getElementById('tz9-voice-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tz9-voice-status';
      el.className = 'tz9-voice-status';
      document.body.appendChild(el);
    }
    return el;
  }

  function showVoiceStatus(message, type = 'good', timeout = 2400) {
    const el = ensureStatusEl();
    el.textContent = message;
    el.className = 'tz9-voice-status visible ' + type;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => el.classList.remove('visible'), timeout);
  }

  function stopActiveRecognition() {
    try { if (activeRecognition) activeRecognition.stop(); } catch {}
    document.querySelectorAll('.tz9-voice-btn.listening').forEach(btn => btn.classList.remove('listening'));
    activeRecognition = null;
    activeTarget = null;
  }

  function triggerRouteIfReady() {
    try {
      const start = document.getElementById('start');
      const end = document.getElementById('end');
      if (start && end && start.value.trim() && end.value.trim() && typeof calculateRoutes === 'function') {
        calculateRoutes();
      }
    } catch (err) {
      console.warn('TZ9 voice route trigger skipped:', err);
    }
  }

  function setInputValue(target, text) {
    const input = document.getElementById(target === 'start' ? 'start' : 'end');
    if (!input) return;
    input.value = String(text || '').trim();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    if (target === 'end') triggerRouteIfReady();
  }

  function startVoiceInput(target) {
    if (!SpeechRecognitionCtor) {
      showVoiceStatus(tr('voice_not_supported'), 'warn', 4200);
      return;
    }
    if (activeRecognition) stopActiveRecognition();

    const btn = document.querySelector('.tz9-voice-btn[data-voice-target="' + target + '"]');
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = getVoiceLang();
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;

    activeRecognition = recognition;
    activeTarget = target;
    if (btn) btn.classList.add('listening');
    showVoiceStatus(tr(target === 'start' ? 'voice_listening_start' : 'voice_listening_end'), 'good', 5000);

    recognition.onresult = function(event) {
      const results = event && event.results && event.results[0] ? event.results[0] : null;
      const transcript = results && results[0] ? results[0].transcript : '';
      if (!transcript || !String(transcript).trim()) {
        showVoiceStatus(tr('voice_no_match'), 'warn', 3200);
        return;
      }
      setInputValue(target, transcript);
      showVoiceStatus(tr(target === 'start' ? 'voice_set_start' : 'voice_set_end') + ': ' + transcript, 'good', 3200);
    };

    recognition.onerror = function(event) {
      const err = event && event.error ? event.error : '';
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        showVoiceStatus(tr('voice_mic_denied'), 'bad', 4500);
      } else if (err === 'no-speech' || err === 'audio-capture') {
        showVoiceStatus(tr('voice_no_match'), 'warn', 3500);
      } else {
        showVoiceStatus(tr('voice_error'), 'bad', 3500);
      }
    };

    recognition.onend = function() {
      if (btn) btn.classList.remove('listening');
      if (activeRecognition === recognition) {
        activeRecognition = null;
        activeTarget = null;
      }
    };

    try { recognition.start(); }
    catch (err) {
      console.warn('TZ9 voice start failed:', err);
      if (btn) btn.classList.remove('listening');
      activeRecognition = null;
      activeTarget = null;
      showVoiceStatus(tr('voice_error'), 'bad', 3500);
    }
  }

  function makeVoiceButton(target) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tz9-voice-btn';
    btn.dataset.voiceTarget = target;
    btn.setAttribute('aria-label', tr(target === 'start' ? 'voice_start_title' : 'voice_end_title'));
    btn.title = tr(target === 'start' ? 'voice_start_title' : 'voice_end_title');
    btn.textContent = '🎙';
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      startVoiceInput(target);
    });
    return btn;
  }

  function installButtons() {
    const start = document.getElementById('start');
    const end = document.getElementById('end');
    if (start && !document.querySelector('.tz9-voice-btn[data-voice-target="start"]')) {
      start.insertAdjacentElement('afterend', makeVoiceButton('start'));
    }
    if (end && !document.querySelector('.tz9-voice-btn[data-voice-target="end"]')) {
      end.insertAdjacentElement('afterend', makeVoiceButton('end'));
    }
  }

  function refreshVoiceLabels() {
    document.querySelectorAll('.tz9-voice-btn').forEach(btn => {
      const target = btn.dataset.voiceTarget === 'start' ? 'start' : 'end';
      const key = target === 'start' ? 'voice_start_title' : 'voice_end_title';
      btn.title = tr(key);
      btn.setAttribute('aria-label', tr(key));
    });
  }

  addI18n();
  installButtons();

  const oldSetLang = typeof setLang === 'function' ? setLang : null;
  if (oldSetLang && !oldSetLang.__tz9VoiceWrapped) {
    const wrapped = function(lang) {
      const result = oldSetLang.apply(this, arguments);
      addI18n();
      installButtons();
      refreshVoiceLabels();
      return result;
    };
    wrapped.__tz9VoiceWrapped = true;
    window.setLang = wrapped;
    try { setLang = wrapped; } catch {}
  }

  document.addEventListener('DOMContentLoaded', function(){
    addI18n();
    installButtons();
    refreshVoiceLabels();
  });

  window.clearRoadTZ9VoiceInput = {
    installed: true,
    supported: !!SpeechRecognitionCtor,
    start: startVoiceInput,
    stop: stopActiveRecognition,
    refresh: function(){ addI18n(); installButtons(); refreshVoiceLabels(); }
  };
})();
