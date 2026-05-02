// ============================================================
//  ТЗ-8 — RTL ARABIC UI POLISH LAYER
//  Safe additive layer. Does not replace route engine or previous TZ layers.
// ============================================================
(function(){
  "use strict";

  function tz8CurrentLang() {
    try {
      return (typeof currentLang !== "undefined" && currentLang) || localStorage.getItem("clearroad_lang") || document.documentElement.getAttribute("lang") || "en";
    } catch (_) {
      return document.documentElement.getAttribute("lang") || "en";
    }
  }

  function tz8IsArabic() {
    return String(tz8CurrentLang()).toLowerCase() === "ar";
  }

  function tz8SetDirOnElement(el, isAr) {
    if (!el) return;
    el.setAttribute("dir", isAr ? "rtl" : "ltr");
    el.style.unicodeBidi = "plaintext";
  }

  function tz8ApplyRtlState() {
    const isAr = tz8IsArabic();
    document.body.classList.toggle("rtl", isAr);
    document.body.classList.toggle("tz8-rtl-ar", isAr);
    document.documentElement.setAttribute("dir", isAr ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", tz8CurrentLang());
    document.body.setAttribute("dir", isAr ? "rtl" : "ltr");

    document.querySelectorAll("#start,#end,.route-input,input,textarea").forEach(function(el){
      tz8SetDirOnElement(el, isAr);
    });

    document.querySelectorAll(".decision-hero,.other-routes,.modal-content,.drive-mode,.drive-panel,.drive-alert,.tz5-filter-panel,.tz6-quickstart-panel,.quick-section").forEach(function(el){
      el.setAttribute("dir", isAr ? "rtl" : "ltr");
    });

    document.querySelectorAll(".alt-card-p,.tz9-alt-card,.tz6-quick-card,.tz6-recent-row,.segment-item,.drive-next,.drive-lane-block").forEach(function(el){
      el.setAttribute("dir", isAr ? "rtl" : "ltr");
    });
  }

  function tz8InstallHooks() {
    if (window.clearRoadTZ8RTL && window.clearRoadTZ8RTL.installed) return;

    const oldSetLang = typeof setLang === "function" ? setLang : null;
    if (oldSetLang) {
      window.setLang = function(lang) {
        const result = oldSetLang.apply(this, arguments);
        setTimeout(tz8ApplyRtlState, 0);
        setTimeout(tz8ApplyRtlState, 80);
        setTimeout(tz8ApplyRtlState, 200);
        return result;
      };
      try { setLang = window.setLang; } catch (_) {}
    }

    const oldApplyLangDom = typeof applyLangDom === "function" ? applyLangDom : null;
    if (oldApplyLangDom) {
      window.applyLangDom = function() {
        const result = oldApplyLangDom.apply(this, arguments);
        setTimeout(tz8ApplyRtlState, 0);
        return result;
      };
      try { applyLangDom = window.applyLangDom; } catch (_) {}
    }

    const oldOpenRouteDetails = typeof openRouteDetails === "function" ? openRouteDetails : null;
    if (oldOpenRouteDetails) {
      openRouteDetails = function() {
        const result = oldOpenRouteDetails.apply(this, arguments);
        setTimeout(tz8ApplyRtlState, 0);
        setTimeout(tz8ApplyRtlState, 120);
        return result;
      };
    }

    const oldStartDriveMode = typeof startDriveMode === "function" ? startDriveMode : null;
    if (oldStartDriveMode) {
      startDriveMode = function() {
        const result = oldStartDriveMode.apply(this, arguments);
        setTimeout(tz8ApplyRtlState, 0);
        setTimeout(tz8ApplyRtlState, 120);
        return result;
      };
    }

    if (window.clearRoadTZ6QuickStart && typeof window.clearRoadTZ6QuickStart.render === "function") {
      const oldQSRender = window.clearRoadTZ6QuickStart.render;
      window.clearRoadTZ6QuickStart.render = function() {
        const result = oldQSRender.apply(this, arguments);
        setTimeout(tz8ApplyRtlState, 0);
        setTimeout(tz8ApplyRtlState, 120);
        return result;
      };
    }

    if (window.clearRoadTZ5Filters && typeof window.clearRoadTZ5Filters.apply === "function") {
      const oldTZ5Apply = window.clearRoadTZ5Filters.apply;
      window.clearRoadTZ5Filters.apply = function() {
        const result = oldTZ5Apply.apply(this, arguments);
        setTimeout(tz8ApplyRtlState, 0);
        return result;
      };
    }

    window.clearRoadTZ8RTL = {
      installed: true,
      apply: tz8ApplyRtlState,
      isArabic: tz8IsArabic
    };
  }

  tz8InstallHooks();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(tz8ApplyRtlState, 0);
      setTimeout(tz8ApplyRtlState, 150);
      setTimeout(tz8ApplyRtlState, 400);
    });
  } else {
    setTimeout(tz8ApplyRtlState, 0);
    setTimeout(tz8ApplyRtlState, 150);
    setTimeout(tz8ApplyRtlState, 400);
  }
})();
