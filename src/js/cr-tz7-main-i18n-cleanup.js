// ============================================================
//  ТЗ-7 — MULTILANGUAGE / I18N CLEANUP LAYER
//  Adds EN/RU/UA/AR translations for TZ5 Filters and TZ6 Quick Start.
//  Safe additive layer: does not replace GPS, Drive Mode, Prediction,
//  UAE/Salik, Filters, Saved Places, or routing logic.
// ============================================================
(function(){
  "use strict";

  const TZ7_I18N = {
    en: {
      tz5_pref_balanced: "Balanced",
      tz5_pref_fastest: "Fastest",
      tz5_pref_no_tolls: "No tolls",
      tz5_less_traffic: "Less traffic",
      tz5_stable_route: "Stable",
      tz5_fewer_stops: "Fewer stops",
      tz5_avoid_complex: "Easy junctions",
      tz5_avoid_highways: "Avoid highways",
      tz5_filter_badge: "FILTER",
      tz5_filter_active: "Filters active",
      tz5_pref_label: "Preference",
      tz5_fastest_active: "fastest preference active",
      tz5_toll_penalized: "toll route penalized",
      tz5_no_toll_preferred: "no-toll route preferred",
      tz5_traffic_weight: "traffic weight increased",
      tz5_stability_weight: "stability weight increased",
      tz5_stops_reduced: "stops/turns reduced",
      tz5_complex_avoided: "complex junctions avoided",
      tz5_highways_penalized: "highways penalized",
      tz5_turns_preferred: "fewer turns preferred",
      tz6_quick_start: "Quick Start",
      tz6_home: "Home",
      tz6_work: "Work",
      tz6_tap_save: "Tap to save address",
      tz6_recent_empty: "Recent places will appear after you build a route.",
      tz6_clear_recent: "Clear recent",
      tz6_set_home: "Set Home",
      tz6_set_work: "Set Work",
      tz6_prompt_home: "Enter Home address",
      tz6_prompt_work: "Enter Work address"
    },
    ru: {
      tz5_pref_balanced: "Оптимальный",
      tz5_pref_fastest: "Быстрейший",
      tz5_pref_no_tolls: "Без платных",
      tz5_less_traffic: "Меньше пробок",
      tz5_stable_route: "Стабильный",
      tz5_fewer_stops: "Меньше остановок",
      tz5_avoid_complex: "Проще развязки",
      tz5_avoid_highways: "Избегать шоссе",
      tz5_filter_badge: "ФИЛЬТР",
      tz5_filter_active: "Фильтры активны",
      tz5_pref_label: "Предпочтение",
      tz5_fastest_active: "включён приоритет быстрого маршрута",
      tz5_toll_penalized: "маршрут с платой получает штраф",
      tz5_no_toll_preferred: "предпочтение маршруту без оплаты",
      tz5_traffic_weight: "вес трафика увеличен",
      tz5_stability_weight: "вес стабильности увеличен",
      tz5_stops_reduced: "остановки/повороты снижены",
      tz5_complex_avoided: "сложные развязки избегаются",
      tz5_highways_penalized: "шоссе получают штраф",
      tz5_turns_preferred: "предпочтение меньшему числу поворотов",
      tz6_quick_start: "Быстрый старт",
      tz6_home: "Дом",
      tz6_work: "Работа",
      tz6_tap_save: "Нажмите, чтобы сохранить адрес",
      tz6_recent_empty: "Недавние места появятся после построения маршрута.",
      tz6_clear_recent: "Очистить недавние",
      tz6_set_home: "Задать дом",
      tz6_set_work: "Задать работу",
      tz6_prompt_home: "Введите адрес дома",
      tz6_prompt_work: "Введите адрес работы"
    },
    ua: {
      tz5_pref_balanced: "Оптимальний",
      tz5_pref_fastest: "Найшвидший",
      tz5_pref_no_tolls: "Без платних",
      tz5_less_traffic: "Менше заторів",
      tz5_stable_route: "Стабільний",
      tz5_fewer_stops: "Менше зупинок",
      tz5_avoid_complex: "Простіші розв'язки",
      tz5_avoid_highways: "Уникати трас",
      tz5_filter_badge: "ФІЛЬТР",
      tz5_filter_active: "Фільтри активні",
      tz5_pref_label: "Перевага",
      tz5_fastest_active: "увімкнено пріоритет найшвидшого маршруту",
      tz5_toll_penalized: "платний маршрут отримує штраф",
      tz5_no_toll_preferred: "перевага маршруту без оплати",
      tz5_traffic_weight: "вага трафіку збільшена",
      tz5_stability_weight: "вага стабільності збільшена",
      tz5_stops_reduced: "зупинки/повороти зменшені",
      tz5_complex_avoided: "складні розв'язки уникаються",
      tz5_highways_penalized: "траси отримують штраф",
      tz5_turns_preferred: "перевага меншій кількості поворотів",
      tz6_quick_start: "Швидкий старт",
      tz6_home: "Дім",
      tz6_work: "Робота",
      tz6_tap_save: "Натисніть, щоб зберегти адресу",
      tz6_recent_empty: "Недавні місця з'являться після побудови маршруту.",
      tz6_clear_recent: "Очистити недавні",
      tz6_set_home: "Задати дім",
      tz6_set_work: "Задати роботу",
      tz6_prompt_home: "Введіть адресу дому",
      tz6_prompt_work: "Введіть адресу роботи"
    },
    ar: {
      tz5_pref_balanced: "متوازن",
      tz5_pref_fastest: "الأسرع",
      tz5_pref_no_tolls: "بدون رسوم",
      tz5_less_traffic: "ازدحام أقل",
      tz5_stable_route: "مسار مستقر",
      tz5_fewer_stops: "توقفات أقل",
      tz5_avoid_complex: "تقاطعات أسهل",
      tz5_avoid_highways: "تجنب الطرق السريعة",
      tz5_filter_badge: "فلتر",
      tz5_filter_active: "الفلاتر مفعلة",
      tz5_pref_label: "التفضيل",
      tz5_fastest_active: "تفضيل الطريق الأسرع مفعل",
      tz5_toll_penalized: "تم تخفيض أولوية الطريق برسوم",
      tz5_no_toll_preferred: "تفضيل الطريق بدون رسوم",
      tz5_traffic_weight: "تمت زيادة وزن الازدحام",
      tz5_stability_weight: "تمت زيادة وزن الاستقرار",
      tz5_stops_reduced: "تقليل التوقفات/المنعطفات",
      tz5_complex_avoided: "تجنب التقاطعات المعقدة",
      tz5_highways_penalized: "تم تخفيض أولوية الطرق السريعة",
      tz5_turns_preferred: "تفضيل منعطفات أقل",
      tz6_quick_start: "بدء سريع",
      tz6_home: "المنزل",
      tz6_work: "العمل",
      tz6_tap_save: "اضغط لحفظ العنوان",
      tz6_recent_empty: "ستظهر الأماكن الأخيرة بعد إنشاء مسار.",
      tz6_clear_recent: "مسح الأخيرة",
      tz6_set_home: "تعيين المنزل",
      tz6_set_work: "تعيين العمل",
      tz6_prompt_home: "أدخل عنوان المنزل",
      tz6_prompt_work: "أدخل عنوان العمل"
    }
  };

  function tz7Lang() {
    try { return (typeof currentLang !== "undefined" && currentLang) || localStorage.getItem("clearroad_lang") || "en"; }
    catch (_) { return "en"; }
  }

  function tz7T(key) {
    const lang = tz7Lang();
    return (TZ7_I18N[lang] && TZ7_I18N[lang][key]) || TZ7_I18N.en[key] || key;
  }

  function tz7MergeBaseI18n() {
    try {
      if (typeof i18n !== "object" || !i18n) return;
      ["en", "ru", "ua", "ar"].forEach(function(lang){
        i18n[lang] = Object.assign({}, i18n[lang] || {}, TZ7_I18N[lang] || {});
      });
    } catch (_) {}
  }

  function tz7LocalizeFilterPanel() {
    const prefMap = { balanced:"tz5_pref_balanced", fastest:"tz5_pref_fastest", no_tolls:"tz5_pref_no_tolls" };
    const filterMap = {
      less_traffic:"tz5_less_traffic",
      stable_route:"tz5_stable_route",
      fewer_stops:"tz5_fewer_stops",
      avoid_complex:"tz5_avoid_complex",
      avoid_highways:"tz5_avoid_highways",
      fewer_turns:"filter_turns"
    };
    document.querySelectorAll(".tz5-pref-chip, .pref-btn").forEach(function(btn){
      const key = prefMap[btn.dataset && btn.dataset.pref];
      if (key) btn.textContent = tz7T(key);
    });
    document.querySelectorAll(".tz5-filter-chip, .filter-btn").forEach(function(btn){
      const key = filterMap[btn.dataset && btn.dataset.filter];
      if (key) btn.textContent = (typeof t === "function" && key === "filter_turns") ? t(key) : tz7T(key);
    });
    document.querySelectorAll(".ai-advice-line span").forEach(function(span){
      if (/FILTER|ФИЛЬТР|ФІЛЬТР|فلتر/i.test(span.textContent || "")) span.textContent = tz7T("tz5_filter_badge");
    });
  }

  function tz7LocalizeQuickStart() {
    const title = document.querySelector(".tz6-quickstart-title");
    if (title) title.textContent = tz7T("tz6_quick_start");
    document.querySelectorAll(".tz6-clear-recents").forEach(function(btn){ btn.textContent = tz7T("tz6_clear_recent"); });
    document.querySelectorAll(".tz6-quickstart-edit").forEach(function(btn){
      const call = btn.getAttribute("onclick") || "";
      if (call.indexOf("Home") >= 0) btn.textContent = tz7T("tz6_set_home");
      if (call.indexOf("Work") >= 0) btn.textContent = tz7T("tz6_set_work");
    });
    document.querySelectorAll(".tz6-quick-label").forEach(function(label){
      const raw = (label.textContent || "").trim().toLowerCase();
      if (raw === "home" || raw === "дом" || raw === "дім" || raw === "المنزل") label.textContent = tz7T("tz6_home");
      if (raw === "work" || raw === "работа" || raw === "робота" || raw === "العمل") label.textContent = tz7T("tz6_work");
    });
    document.querySelectorAll(".tz6-quick-address").forEach(function(addr){
      const raw = (addr.textContent || "").trim();
      if (!raw || raw === "Tap to save address" || raw === TZ7_I18N.en.tz6_tap_save || raw === TZ7_I18N.ru.tz6_tap_save || raw === TZ7_I18N.ua.tz6_tap_save || raw === TZ7_I18N.ar.tz6_tap_save) {
        addr.textContent = tz7T("tz6_tap_save");
      }
    });
    document.querySelectorAll(".tz6-recent-empty").forEach(function(el){ el.textContent = tz7T("tz6_recent_empty"); });
  }

  function tz7ApplyAll() {
    tz7MergeBaseI18n();
    try { if (typeof applyLangDom === "function") applyLangDom(); } catch (_) {}
    tz7LocalizeFilterPanel();
    tz7LocalizeQuickStart();
    document.body.classList.toggle("rtl", tz7Lang() === "ar");
    document.documentElement.setAttribute("lang", tz7Lang());
  }

  function tz7InstallHooks() {
    if (window.clearRoadTZ7I18n && window.clearRoadTZ7I18n.installed) return;

    const oldSetLang = typeof setLang === "function" ? setLang : null;
    if (oldSetLang) {
      window.setLang = function(lang) {
        const result = oldSetLang.apply(this, arguments);
        setTimeout(tz7ApplyAll, 0);
        setTimeout(tz7ApplyAll, 80);
        return result;
      };
      try { setLang = window.setLang; } catch (_) {}
    }

    if (window.clearRoadTZ6QuickStart && typeof window.clearRoadTZ6QuickStart.render === "function") {
      const oldQSRender = window.clearRoadTZ6QuickStart.render;
      window.clearRoadTZ6QuickStart.render = function() {
        const result = oldQSRender.apply(this, arguments);
        setTimeout(tz7ApplyAll, 0);
        return result;
      };
    }

    const oldPrompt = window.prompt;
    window.prompt = function(message, defaultValue) {
      let msg = message;
      if (String(message || "").indexOf("Home") >= 0) msg = tz7T("tz6_prompt_home");
      if (String(message || "").indexOf("Work") >= 0) msg = tz7T("tz6_prompt_work");
      return oldPrompt.call(window, msg, defaultValue);
    };

    window.clearRoadTZ7I18n = {
      installed: true,
      apply: tz7ApplyAll,
      t: tz7T,
      dictionary: TZ7_I18N
    };
  }

  tz7MergeBaseI18n();
  tz7InstallHooks();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(tz7ApplyAll, 0); setTimeout(tz7ApplyAll, 150); });
  } else {
    setTimeout(tz7ApplyAll, 0);
    setTimeout(tz7ApplyAll, 150);
  }
})();
