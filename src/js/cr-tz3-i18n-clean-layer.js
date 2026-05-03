(function(){
  "use strict";

  const CR_TZ3 = {
    en: {
      ai_voice_button:"AI Voice", menu_title:"Menu", gps_title:"Use my location",
      drive_navigating:"Navigating...", voice:"Voice", follow:"Follow", exit:"Exit",
      interchange_warn:"Complex interchange ahead — stay focused",
      next_action:"Next action", no_best_route:"No best route selected.",
      quick_start:"Quick Start", clear_recent:"Clear recent", set_home:"Set Home", set_work:"Set Work",
      home:"Home", work:"Work", saved:"Saved", recent:"Recent",
      same_as_best:"Same as best", best_route:"Best route", min_vs_best:"min vs best",
      faster_by:"Faster by", slower_than_best:"min slower than best",
      similar_time:"Similar time to best", less_traffic:"Less traffic", more_traffic:"More traffic",
      fewer_stops:"Fewer stops", more_stops:"More stops", less_delay_by:"Less delay by",
      more_delay_by:"More delay by", route_profile:"Route profile calculated",
      gps_live:"GPS live", gps_waiting:"Waiting for GPS…", gps_fallback:"GPS fallback · route guidance active",
      gps_invalid:"GPS position invalid · route guidance active", gps_not_supported:"GPS not supported · route guidance active",
      detecting_gps:"Detecting GPS…", invalid_gps:"Invalid GPS position",
      ai_best_route:"AI BEST ROUTE", live_traffic:"LIVE TRAFFIC", min:"min",
      start:"Start", go:"Go", details:"Details", try_route:"Try"
    },
    ru: {
      ai_voice_button:"AI голос", menu_title:"Меню", gps_title:"Использовать мою геолокацию",
      drive_navigating:"Навигация...", voice:"Голос", follow:"Следить", exit:"Выход",
      interchange_warn:"Сложная развязка впереди — будьте внимательны",
      next_action:"Следующее действие", no_best_route:"Лучший маршрут не выбран.",
      quick_start:"Быстрый старт", clear_recent:"Очистить недавние", set_home:"Задать дом", set_work:"Задать работу",
      home:"Дом", work:"Работа", saved:"Сохранено", recent:"Недавние",
      same_as_best:"Как лучший", best_route:"Лучший маршрут", min_vs_best:"мин к лучшему",
      faster_by:"Быстрее на", slower_than_best:"мин медленнее лучшего",
      similar_time:"Почти как лучший", less_traffic:"Меньше трафика", more_traffic:"Больше трафика",
      fewer_stops:"Меньше остановок", more_stops:"Больше остановок", less_delay_by:"Меньше задержка на",
      more_delay_by:"Больше задержка на", route_profile:"Профиль маршрута рассчитан",
      gps_live:"GPS активен", gps_waiting:"Ожидание GPS…", gps_fallback:"GPS fallback · навигация активна",
      gps_invalid:"GPS позиция некорректна · навигация активна", gps_not_supported:"GPS не поддерживается · навигация активна",
      detecting_gps:"Определяю GPS…", invalid_gps:"Некорректная GPS позиция",
      ai_best_route:"AI ЛУЧШИЙ МАРШРУТ", live_traffic:"ЖИВОЙ ТРАФИК", min:"мин",
      start:"Старт", go:"Ехать", details:"Детали", try_route:"Попробовать"
    },
    ua: {
      ai_voice_button:"AI голос", menu_title:"Меню", gps_title:"Використати мою геолокацію",
      drive_navigating:"Навігація...", voice:"Голос", follow:"Стежити", exit:"Вихід",
      interchange_warn:"Складна розв'язка попереду — будьте уважні",
      next_action:"Наступна дія", no_best_route:"Найкращий маршрут не вибрано.",
      quick_start:"Швидкий старт", clear_recent:"Очистити недавні", set_home:"Задати дім", set_work:"Задати роботу",
      home:"Дім", work:"Робота", saved:"Збережено", recent:"Недавні",
      same_as_best:"Як найкращий", best_route:"Найкращий маршрут", min_vs_best:"хв до найкращого",
      faster_by:"Швидше на", slower_than_best:"хв повільніше найкращого",
      similar_time:"Майже як найкращий", less_traffic:"Менше трафіку", more_traffic:"Більше трафіку",
      fewer_stops:"Менше зупинок", more_stops:"Більше зупинок", less_delay_by:"Менша затримка на",
      more_delay_by:"Більша затримка на", route_profile:"Профіль маршруту розраховано",
      gps_live:"GPS активний", gps_waiting:"Очікування GPS…", gps_fallback:"GPS fallback · навігація активна",
      gps_invalid:"GPS позиція некоректна · навігація активна", gps_not_supported:"GPS не підтримується · навігація активна",
      detecting_gps:"Визначаю GPS…", invalid_gps:"Некоректна GPS позиція",
      ai_best_route:"AI НАЙКРАЩИЙ МАРШРУТ", live_traffic:"ЖИВИЙ ТРАФІК", min:"хв",
      start:"Старт", go:"Їхати", details:"Деталі", try_route:"Спробувати"
    },
    ar: {
      ai_voice_button:"صوت AI", menu_title:"القائمة", gps_title:"استخدم موقعي",
      drive_navigating:"جاري الملاحة...", voice:"الصوت", follow:"تتبّع", exit:"خروج",
      interchange_warn:"تقاطع معقد أمامك — انتبه",
      next_action:"الإجراء التالي", no_best_route:"لم يتم اختيار أفضل مسار.",
      quick_start:"بدء سريع", clear_recent:"مسح الحديثة", set_home:"تعيين المنزل", set_work:"تعيين العمل",
      home:"المنزل", work:"العمل", saved:"محفوظ", recent:"حديثة",
      same_as_best:"مثل الأفضل", best_route:"أفضل مسار", min_vs_best:"دقيقة عن الأفضل",
      faster_by:"أسرع بـ", slower_than_best:"دقيقة أبطأ من الأفضل",
      similar_time:"وقت مشابه للأفضل", less_traffic:"ازدحام أقل", more_traffic:"ازدحام أكثر",
      fewer_stops:"توقفات أقل", more_stops:"توقفات أكثر", less_delay_by:"تأخير أقل بـ",
      more_delay_by:"تأخير أكثر بـ", route_profile:"تم حساب ملف المسار",
      gps_live:"GPS مباشر", gps_waiting:"انتظار GPS…", gps_fallback:"GPS احتياطي · التوجيه نشط",
      gps_invalid:"موقع GPS غير صالح · التوجيه نشط", gps_not_supported:"GPS غير مدعوم · التوجيه نشط",
      detecting_gps:"تحديد GPS…", invalid_gps:"موقع GPS غير صالح",
      ai_best_route:"AI أفضل مسار", live_traffic:"حركة مباشرة", min:"دقيقة",
      start:"ابدأ", go:"انطلق", details:"التفاصيل", try_route:"جرّب"
    }
  };

  function lang(){
    try {
      if (typeof currentLang !== "undefined" && CR_TZ3[currentLang]) return currentLang;
    } catch (_) {}
    const htmlLang = document.documentElement.getAttribute("lang");
    return CR_TZ3[htmlLang] ? htmlLang : "en";
  }

  function tx(key){
    const l = lang();
    return (CR_TZ3[l] && CR_TZ3[l][key]) || (CR_TZ3.en[key] || key);
  }

  function extendBaseI18n(){
    try {
      if (typeof i18n !== "object") return;
      Object.keys(CR_TZ3).forEach(function(l){
        i18n[l] = Object.assign({}, i18n[l] || {}, CR_TZ3[l]);
      });
    } catch (_) {}
  }

  function translateWhy(text){
    const l = lang();
    if (l === "en") return String(text || "");
    let out = String(text || "");

    out = out.replace(/^Faster by\s+(\d+)\s+min/i, function(_, n){ return tx("faster_by") + " " + n + " " + tx("min"); });
    out = out.replace(/^(\d+)\s+min slower than best/i, function(_, n){ return n + " " + tx("slower_than_best"); });
    out = out.replace(/^Similar time to best$/i, tx("similar_time"));
    out = out.replace(/^Less traffic$/i, tx("less_traffic"));
    out = out.replace(/^More traffic$/i, tx("more_traffic"));
    out = out.replace(/^Fewer stops$/i, tx("fewer_stops"));
    out = out.replace(/^More stops$/i, tx("more_stops"));
    out = out.replace(/^Less delay by\s+(\d+)\s+min/i, function(_, n){ return tx("less_delay_by") + " " + n + " " + tx("min"); });
    out = out.replace(/^More delay by\s+(\d+)\s+min/i, function(_, n){ return tx("more_delay_by") + " " + n + " " + tx("min"); });
    out = out.replace(/^Route profile calculated$/i, tx("route_profile"));
    out = out.replace(/^Best route$/i, tx("best_route"));
    out = out.replace(/^Same as best$/i, tx("same_as_best"));
    out = out.replace(/\bmin vs best\b/ig, tx("min_vs_best"));

    return out;
  }

  function translateTree(root){
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(node){
      const original = node.nodeValue;
      const translated = translateWhy(original)
        .replace(/\bAI BEST ROUTE\b/g, tx("ai_best_route"))
        .replace(/\bLIVE TRAFFIC\b/g, tx("live_traffic"))
        .replace(/\bQuick Start\b/g, tx("quick_start"))
        .replace(/\bClear recent\b/g, tx("clear_recent"))
        .replace(/\bSet Home\b/g, tx("set_home"))
        .replace(/\bSet Work\b/g, tx("set_work"))
        .replace(/\bHome\b/g, tx("home"))
        .replace(/\bWork\b/g, tx("work"))
        .replace(/\bAI Voice\b/g, tx("ai_voice_button"))
        .replace(/\bVoice\b/g, tx("voice"))
        .replace(/\bFollow\b/g, tx("follow"))
        .replace(/\bExit\b/g, tx("exit"))
        .replace(/\bNavigating\.\.\./g, tx("drive_navigating"))
        .replace(/Complex interchange ahead — stay focused/g, tx("interchange_warn"))
        .replace(/\bNext action\b/g, tx("next_action"))
        .replace(/No best route selected\./g, tx("no_best_route"));
      if (translated !== original) node.nodeValue = translated;
    });
  }

  function applyStatic(){
    extendBaseI18n();

    const l = lang();
    document.body.classList.toggle("rtl", l === "ar");
    document.body.classList.toggle("tz8-rtl-ar", l === "ar");
    document.documentElement.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", l);

    const menu = document.querySelector(".top-btn");
    if (menu) menu.setAttribute("title", tx("menu_title"));

    const gps = document.getElementById("gps-btn");
    if (gps) gps.setAttribute("title", tx("gps_title"));

    const aiBtn = document.querySelector(".ai-voice-btn");
    if (aiBtn) aiBtn.textContent = tx("ai_voice_button");

    const driveStatus = document.getElementById("drive-status");
    if (driveStatus && /Navigating|Навигац|Навігац|جاري/.test(driveStatus.textContent || "")) {
      driveStatus.textContent = tx("drive_navigating");
    }

    document.querySelectorAll("button").forEach(function(btn){
      const onclick = btn.getAttribute("onclick") || "";
      const text = (btn.textContent || "").trim();
      if (onclick.indexOf("toggleVoice") !== -1) btn.textContent = tx("voice");
      if (onclick.indexOf("toggleFollowMode") !== -1) btn.textContent = tx("follow");
      if (onclick.indexOf("exitDriveMode") !== -1) btn.textContent = tx("exit");
      if (onclick.indexOf("clearRoadTZ6QuickStart.clearRecents") !== -1) btn.textContent = tx("clear_recent");
      if (onclick.indexOf("clearRoadTZ6QuickStart.editSaved('Home')") !== -1) btn.textContent = tx("set_home");
      if (onclick.indexOf("clearRoadTZ6QuickStart.editSaved('Work')") !== -1) btn.textContent = tx("set_work");
      if (text === "AI Voice") btn.textContent = tx("ai_voice_button");
    });

    const inter = document.getElementById("drive-interchange-warn");
    if (inter) inter.textContent = tx("interchange_warn");

    const reality = document.getElementById("drive-reality-main");
    if (reality && /Next action|Следующее|Наступна|الإجراء/.test(reality.textContent || "")) reality.textContent = tx("next_action");

    ["results", "modal-content", "quick-access", "tz6-quickstart-panel", "drive-mode"].forEach(function(id){
      translateTree(document.getElementById(id));
    });

    try {
      if (typeof applyLangDom === "function") applyLangDom();
    } catch (_) {}
  }

  function installFunctionWrappers(){
    if (window.__crTz3WrappersInstalled) return;
    window.__crTz3WrappersInstalled = true;

    const oldSetLang = typeof setLang === "function" ? setLang : null;
    if (oldSetLang) {
      window.setLang = function(newLang){
        const result = oldSetLang.apply(this, arguments);
        setTimeout(applyStatic, 0);
        setTimeout(applyStatic, 80);
        return result;
      };
      try { setLang = window.setLang; } catch (_) {}
    }

    const oldOpenRouteDetails = typeof openRouteDetails === "function" ? openRouteDetails : null;
    if (oldOpenRouteDetails) {
      window.openRouteDetails = function(){
        const result = oldOpenRouteDetails.apply(this, arguments);
        setTimeout(applyStatic, 0);
        setTimeout(applyStatic, 80);
        return result;
      };
      try { openRouteDetails = window.openRouteDetails; } catch (_) {}
    }

    const oldStartDriveMode = typeof startDriveMode === "function" ? startDriveMode : null;
    if (oldStartDriveMode) {
      window.startDriveMode = function(){
        const result = oldStartDriveMode.apply(this, arguments);
        setTimeout(applyStatic, 0);
        setTimeout(applyStatic, 120);
        return result;
      };
      try { startDriveMode = window.startDriveMode; } catch (_) {}
    }

    const oldGenerateWhy = typeof generateWhy === "function" ? generateWhy : null;
    if (oldGenerateWhy) {
      window.generateWhy = function(){
        const result = oldGenerateWhy.apply(this, arguments);
        return Array.isArray(result) ? result.map(translateWhy) : result;
      };
      try { generateWhy = window.generateWhy; } catch (_) {}
    }

    const oldCrFormatEtaDiff = typeof crFormatEtaDiff === "function" ? crFormatEtaDiff : null;
    if (oldCrFormatEtaDiff) {
      window.crFormatEtaDiff = function(){
        const raw = oldCrFormatEtaDiff.apply(this, arguments);
        return translateWhy(raw);
      };
      try { crFormatEtaDiff = window.crFormatEtaDiff; } catch (_) {}
    }
  }

  function audit(){
    const checks = {
      dictionary: ["en","ru","ua","ar"].every(function(l){ return !!CR_TZ3[l] && !!CR_TZ3[l].drive_navigating && !!CR_TZ3[l].quick_start; }),
      staticDom: !!document.getElementById("gps-btn") && !!document.getElementById("drive-status"),
      rtl: true,
      coreFunctions: ["calculateRoutes","renderResults","startDriveMode","requestGPS","setLang"].every(function(fn){ return typeof window[fn] === "function" || typeof globalThis[fn] === "function"; })
    };
    checks.ok = Object.keys(checks).every(function(k){ return !!checks[k]; });
    window.clearRoadTZ3Audit = checks;
    return checks;
  }

  function boot(){
    extendBaseI18n();
    installFunctionWrappers();
    applyStatic();
    setTimeout(applyStatic, 100);
    setTimeout(applyStatic, 400);
    setTimeout(audit, 450);
  }

  window.clearRoadTZ3Apply = applyStatic;
  window.clearRoadTZ3Translate = translateWhy;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
