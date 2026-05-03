// ============================================================
//  ТЗ-5 — FILTERS / PREFERENCES STABILITY LAYER
//  Adds visible route preferences and decision-score filters.
//  Does not replace ТЗ-1 / ТЗ-2 / ТЗ-3 / ТЗ-4 layers.
// ============================================================
(function(){
  "use strict";

  const TZ5_FILTER_DEFAULTS = {
    avoid_highways: false,
    fewer_turns: false,
    less_traffic: false,
    fewer_stops: false,
    stable_route: false,
    avoid_complex: false
  };

  const TZ5_PREFS = ["balanced", "fastest", "no_tolls"];

  function tz5fltSafeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (Number.isFinite(fallback) ? fallback : 0);
  }

  function tz5fltRound(value, decimals) {
    const factor = Math.pow(10, Number.isFinite(decimals) ? decimals : 1);
    return Math.round(tz5fltSafeNumber(value, 0) * factor) / factor;
  }

  function tz5fltRouteMinutes(route) {
    if (typeof _tz1Minutes === "function") return tz5fltSafeNumber(_tz1Minutes(route), 0);
    return tz5fltSafeNumber(route && route.durationMin, tz5fltSafeNumber(route && route.durationTrafficSec, 0) / 60);
  }

  function tz5fltRouteText(route) {
    if (!route) return "";
    const parts = [route.summary, route.routeTitle, route.title, route.name, route.why, route.tradeOff, route.uaeAdvice, route.uaePattern, route.drivePersonality];
    if (Array.isArray(route.whyPoints)) parts.push(route.whyPoints.join(" "));
    if (Array.isArray(route.legs)) {
      route.legs.forEach(function(leg){
        if (leg && leg.start_address) parts.push(leg.start_address);
        if (leg && leg.end_address) parts.push(leg.end_address);
      });
    }
    if (Array.isArray(route.steps)) {
      route.steps.forEach(function(step){
        if (step && step.instructions) parts.push(step.instructions);
      });
    }
    return parts.filter(Boolean).join(" ").toLowerCase();
  }

  function tz5fltTraffic(route) {
    const sb = route && route.scoreBreakdown ? route.scoreBreakdown : {};
    const trafficScore = tz5fltSafeNumber(route && route.trafficScore, tz5fltSafeNumber(sb.trafficScore, 0));
    const delayMin = tz5fltSafeNumber(route && route.delayMin, tz5fltSafeNumber(sb.delayMin, 0));
    const trafficLevel = tz5fltSafeNumber(route && (route.trafficLevel || route.trafficRank), tz5fltSafeNumber(sb.trafficRank, 1));
    return Math.max(0, trafficScore * 18 + delayMin * 0.9 + Math.max(0, trafficLevel - 1) * 3);
  }

  function tz5fltStops(route) {
    const sb = route && route.scoreBreakdown ? route.scoreBreakdown : {};
    return Math.max(0, Math.round(tz5fltSafeNumber(route && (route.stopsCount || route.turnsCount), tz5fltSafeNumber(sb.stopsCount, tz5fltSafeNumber(sb.turns, 0)))));
  }

  function tz5fltComplexity(route) {
    const sb = route && route.scoreBreakdown ? route.scoreBreakdown : {};
    const text = tz5fltRouteText(route);
    let complexity = tz5fltSafeNumber(route && route.complexityScore, tz5fltSafeNumber(sb.complexityScore, 0)) * 12;
    complexity += tz5fltStops(route) * 0.45;
    if (/interchange|merge|ramp|exit|flyover|junction|roundabout|развяз|съезд|слияние/.test(text)) complexity += 4;
    if (route && route.uaePattern && String(route.uaePattern).toLowerCase().includes("cross-emirate")) complexity += 2;
    return Math.max(0, complexity);
  }

  function tz5fltHighway(route) {
    const text = tz5fltRouteText(route);
    const share = tz5fltSafeNumber(route && route.highwayShare, tz5fltSafeNumber(route && route.highwayPct, 0) / 100);
    return !!(route && route.highway) || share >= 0.45 || /e11|e311|e611|sheikh zayed|emirates road|mohammed bin zayed|highway|motorway/.test(text);
  }

  function tz5fltTolls(route) {
    const sb = route && route.scoreBreakdown ? route.scoreBreakdown : {};
    return !!(route && (route.tolls || route.hasTolls || route.salikDetected || route.uaeSalik || route.salikCost > 0 || route.uaeTollCost > 0 || route.tollCost > 0 || sb.tollCost > 0));
  }

  function tz5fltActiveFilters() {
    try {
      window.userFilters = Object.assign({}, TZ5_FILTER_DEFAULTS, (typeof userFilters === "object" && userFilters) ? userFilters : {});
      try { localStorage.setItem("clearRoadUAE.filters.v1", JSON.stringify(window.userFilters)); } catch (_) {}
      return window.userFilters;
    } catch (_) {
      return Object.assign({}, TZ5_FILTER_DEFAULTS);
    }
  }

  function tz5fltPreference() {
    try {
      const pref = typeof getUserPreference === "function" ? getUserPreference() : (localStorage.getItem("clearRoadUAE.pref") || "balanced");
      return TZ5_PREFS.includes(pref) ? pref : "balanced";
    } catch (_) { return "balanced"; }
  }

  function tz5fltPreferencePenalty(route) {
    const pref = tz5fltPreference();
    if (pref === "fastest") {
      return tz5fltRound(tz5fltRouteMinutes(route) * 0.25 + tz5fltTraffic(route) * 0.15, 1);
    }
    if (pref === "no_tolls") {
      return tz5fltTolls(route) ? 32 : -2;
    }
    return 0;
  }

  function tz5fltFilterPenalty(route) {
    const filters = tz5fltActiveFilters();
    let penalty = 0;
    if (filters.avoid_highways && tz5fltHighway(route)) penalty += 12;
    if (filters.fewer_turns) penalty += tz5fltStops(route) * 1.0;
    if (filters.less_traffic) penalty += tz5fltTraffic(route) * 1.25;
    if (filters.fewer_stops) penalty += tz5fltStops(route) * 1.4;
    if (filters.stable_route) penalty += Math.max(0, 100 - tz5fltSafeNumber(route && route.stabilityScore, 75)) * 0.22 + tz5fltTraffic(route) * 0.55;
    if (filters.avoid_complex) penalty += tz5fltComplexity(route) * 1.15;
    return tz5fltRound(penalty, 1);
  }

  function tz5fltExplain(route) {
    const filters = tz5fltActiveFilters();
    const notes = [];
    const pref = tz5fltPreference();
    if (pref === "fastest") notes.push("fastest preference active");
    if (pref === "no_tolls") notes.push(tz5fltTolls(route) ? "toll route penalized" : "no-toll route preferred");
    if (filters.less_traffic) notes.push("traffic weight increased");
    if (filters.stable_route) notes.push("stability weight increased");
    if (filters.fewer_stops) notes.push("stops/turns reduced");
    if (filters.avoid_complex) notes.push("complex junctions avoided");
    if (filters.avoid_highways) notes.push("highways penalized");
    if (filters.fewer_turns) notes.push("fewer turns preferred");
    return notes.slice(0, 4).join(" · ");
  }

  const tz5fltOriginalPreferencePenalty = typeof tz5PreferencePenalty === "function" ? tz5PreferencePenalty : null;
  window.tz5PreferencePenalty = function(route) {
    const base = tz5fltOriginalPreferencePenalty ? tz5fltSafeNumber(tz5fltOriginalPreferencePenalty(route), 0) : 0;
    return tz5fltRound(base + tz5fltPreferencePenalty(route), 1);
  };
  try { tz5PreferencePenalty = window.tz5PreferencePenalty; } catch (_) {}

  const tz5fltOriginalFilterPenalty = typeof tz5FilterPenalty === "function" ? tz5FilterPenalty : null;
  window.tz5FilterPenalty = function(route) {
    const base = tz5fltOriginalFilterPenalty ? tz5fltSafeNumber(tz5fltOriginalFilterPenalty(route), 0) : 0;
    return tz5fltRound(base + tz5fltFilterPenalty(route), 1);
  };
  try { tz5FilterPenalty = window.tz5FilterPenalty; } catch (_) {}

  const tz5fltOriginalScoreRoute = typeof scoreRoute === "function" ? scoreRoute : null;
  if (tz5fltOriginalScoreRoute) {
    scoreRoute = function(route, allRoutes) {
      const scored = tz5fltOriginalScoreRoute.apply(this, arguments);
      const prefPenalty = tz5fltPreferencePenalty(scored);
      const filterPenalty = tz5fltFilterPenalty(scored);
      scored.preferencePenalty = prefPenalty;
      scored.filterPenalty = filterPenalty;
      scored.filterDecisionScore = tz5fltRound(tz5fltSafeNumber(scored.score, 0) + prefPenalty + filterPenalty, 1);
      scored.filterExplanation = tz5fltExplain(scored);
      if (scored.scoreBreakdown) {
        scored.scoreBreakdown.preferencePenalty = prefPenalty;
        scored.scoreBreakdown.filterPenalty = filterPenalty;
        scored.scoreBreakdown.filterDecisionScore = scored.filterDecisionScore;
      }
      return scored;
    };
  }

  const tz5fltOriginalSetUserPreference = typeof setUserPreference === "function" ? setUserPreference : null;
  window.setUserPreference = function(value) {
    if (!TZ5_PREFS.includes(value)) return;
    try { localStorage.setItem("clearRoadUAE.pref", value); } catch (_) {}
    tz5fltSyncUI();
    if (typeof calculateRoutes === "function") calculateRoutes();
  };
  try { setUserPreference = window.setUserPreference; } catch (_) {}

  window.toggleFilter = function(key) {
    const filters = tz5fltActiveFilters();
    if (!(key in filters)) return;
    filters[key] = !filters[key];
    try {
      window.userFilters = filters;
      localStorage.setItem("clearRoadUAE.filters.v1", JSON.stringify(filters));
    } catch (_) {}
    tz5fltSyncUI();
    if (typeof calculateRoutes === "function") calculateRoutes();
  };
  try { toggleFilter = window.toggleFilter; } catch (_) {}

  function tz5fltEnsurePanel() {
    if (document.getElementById("tz5-preference-panel")) return;
    const anchor = document.getElementById("top-utility-bar") || document.querySelector(".hero-section");
    if (!anchor || !anchor.parentNode) return;
    const panel = document.createElement("div");
    panel.id = "tz5-preference-panel";
    panel.className = "tz5-preference-panel";
    panel.innerHTML = `
      <div class="tz5-pref-row" aria-label="Route preferences">
        <button type="button" class="tz5-pref-chip" data-pref="balanced" onclick="setUserPreference('balanced')">Balanced</button>
        <button type="button" class="tz5-pref-chip" data-pref="fastest" onclick="setUserPreference('fastest')">Fastest</button>
        <button type="button" class="tz5-pref-chip" data-pref="no_tolls" onclick="setUserPreference('no_tolls')">No tolls</button>
      </div>
      <div class="tz5-filter-row" aria-label="Route filters">
        <button type="button" class="tz5-filter-chip" data-filter="less_traffic" onclick="toggleFilter('less_traffic')">Less traffic</button>
        <button type="button" class="tz5-filter-chip" data-filter="stable_route" onclick="toggleFilter('stable_route')">Stable</button>
        <button type="button" class="tz5-filter-chip" data-filter="fewer_stops" onclick="toggleFilter('fewer_stops')">Fewer stops</button>
        <button type="button" class="tz5-filter-chip" data-filter="avoid_complex" onclick="toggleFilter('avoid_complex')">Easy junctions</button>
        <button type="button" class="tz5-filter-chip" data-filter="avoid_highways" onclick="toggleFilter('avoid_highways')">Avoid highways</button>
      </div>
    `;
    anchor.parentNode.insertBefore(panel, anchor.nextSibling);
  }

  function tz5fltInjectCSS() {
    if (document.getElementById("tz5-filter-style")) return;
    const style = document.createElement("style");
    style.id = "tz5-filter-style";
    style.textContent = `
      .tz5-preference-panel {
        position: relative;
        z-index: 29;
        margin: -2px 14px 10px;
        padding: 10px;
        border-radius: 18px;
        background: hsla(220,11%,10%,.62);
        border: 1px solid hsla(220,10%,20%,.45);
        backdrop-filter: blur(16px) saturate(130%);
        -webkit-backdrop-filter: blur(16px) saturate(130%);
      }
      .tz5-pref-row, .tz5-filter-row { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; }
      .tz5-filter-row { margin-top:7px; }
      .tz5-pref-row::-webkit-scrollbar, .tz5-filter-row::-webkit-scrollbar { display:none; }
      .tz5-pref-chip, .tz5-filter-chip {
        flex: 0 0 auto;
        border: 1px solid hsla(220,10%,24%,.75);
        background: hsla(220,10%,14%,.72);
        color: var(--text2);
        border-radius: 999px;
        padding: 7px 10px;
        font-family: inherit;
        font-size: 10px;
        font-weight: 750;
        letter-spacing: .08em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .tz5-pref-chip.active {
        background: var(--green);
        border-color: var(--green);
        color: #090e1a;
      }
      .tz5-filter-chip.active {
        background: hsla(38,95%,58%,.16);
        border-color: hsla(38,95%,58%,.42);
        color: var(--amber);
      }
      .tz5-filter-note {
        display:block;
        margin-top: 8px;
        font-size: 11px;
        line-height: 1.3;
        color: var(--text2);
      }
      .tz5-filter-note strong { color: var(--green); font-weight: 800; }
      body.rtl .tz5-pref-row, body.rtl .tz5-filter-row { flex-direction: row-reverse; }
    `;
    document.head.appendChild(style);
  }

  function tz5fltSyncUI() {
    const filters = tz5fltActiveFilters();
    const pref = tz5fltPreference();
    document.querySelectorAll(".pref-btn, .tz5-pref-chip").forEach(function(btn){
      if (btn && btn.dataset) btn.classList.toggle("active", btn.dataset.pref === pref);
    });
    document.querySelectorAll(".filter-btn, .tz5-filter-chip").forEach(function(btn){
      if (btn && btn.dataset) btn.classList.toggle("active", !!filters[btn.dataset.filter]);
    });
  }

  function tz5fltAppendDecisionNote() {
    try {
      const advice = document.getElementById("ai-advice-line") || document.querySelector(".ai-advice-line");
      const best = (typeof _bestRoute !== "undefined" && _bestRoute) || (typeof selectedRoute !== "undefined" && selectedRoute) || null;
      if (!advice || !best || advice.dataset.tz5filtersApplied === "1") return;
      const filters = tz5fltActiveFilters();
      const active = Object.keys(filters).filter(function(k){ return !!filters[k]; });
      const pref = tz5fltPreference();
      if (pref === "balanced" && !active.length) return;
      const note = best.filterExplanation || tz5fltExplain(best) || (pref !== "balanced" ? ("Preference: " + pref) : "Filters active");
      advice.innerHTML += `<br><span>FILTER</span>${String(note).replace(/[&<>"']/g, function(ch){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]; })}`;
      advice.dataset.tz5filtersApplied = "1";
    } catch (e) {
      try { console.warn("[TZ5 Filters] decision note skipped", e); } catch (_) {}
    }
  }

  function tz5fltBoot() {
    tz5fltInjectCSS();
    tz5fltEnsurePanel();
    tz5fltSyncUI();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tz5fltBoot);
  else tz5fltBoot();

  try { window.clearRoadTZ5Filters = {
    activeFilters: tz5fltActiveFilters,
    preference: tz5fltPreference,
    filterPenalty: tz5fltFilterPenalty,
    preferencePenalty: tz5fltPreferencePenalty,
    explain: tz5fltExplain,
    hasTolls: tz5fltTolls,
    hasHighway: tz5fltHighway
  }; } catch (_) {}
})();
