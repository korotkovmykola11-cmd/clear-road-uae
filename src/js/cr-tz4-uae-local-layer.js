// ============================================================
//  ТЗ-4 — UAE-ONLY LOCAL LOGIC / SALIK / PEAK PATTERNS
//  Scope: additive safety layer only. Does not replace GPS, Drive Mode,
//  Predictive Engine, route cards, or core UI rendering.
// ============================================================
(function() {
  const TZ4_SALIK_AED_PER_GATE = 4;

  function tz4uaeSafeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function tz4uaeEscape(value) {
    if (typeof _tz1EscapeHTML === "function") return _tz1EscapeHTML(value);
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function tz4uaeStepText(step) {
    if (!step) return "";
    return [
      step.instruction,
      step.instructions,
      step.maneuver,
      step.roadName,
      step.road,
      step.html_instructions
    ].filter(Boolean).join(" ");
  }

  function tz4uaeRouteText(route) {
    if (!route) return "";
    const parts = [route.title, route.summary, route.name, route.routeName];
    if (route.route && route.route.summary) parts.push(route.route.summary);
    if (route.extractedRoute && route.extractedRoute.summary) parts.push(route.extractedRoute.summary);
    const steps = Array.isArray(route.steps) ? route.steps : [];
    steps.forEach(function(step) { parts.push(tz4uaeStepText(step)); });
    const legs = Array.isArray(route.legs) ? route.legs : [];
    legs.forEach(function(leg) {
      if (leg.start_address) parts.push(leg.start_address);
      if (leg.end_address) parts.push(leg.end_address);
      if (Array.isArray(leg.steps)) leg.steps.forEach(function(step) { parts.push(tz4uaeStepText(step)); });
    });
    return parts.filter(Boolean).join(" ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  function tz4uaeDetectCorridors(text) {
    const s = String(text || "").toLowerCase();
    const corridors = [];
    const add = function(id, label) {
      if (!corridors.some(function(c) { return c.id === id; })) corridors.push({ id: id, label: label });
    };

    if (/\be11\b|sheikh zayed|szr/.test(s)) add("e11", "E11 / Sheikh Zayed Road");
    if (/\be311\b|sheikh mohammed bin zayed|mbz/.test(s)) add("e311", "E311 / Sheikh Mohammed Bin Zayed Road");
    if (/\be611\b|emirates road/.test(s)) add("e611", "E611 / Emirates Road");
    if (/\be44\b|al khail/.test(s)) add("e44", "E44 / Al Khail Road");
    if (/\be66\b|dubai[\s-]*al[\s-]*ain|al ain road/.test(s)) add("e66", "E66 / Dubai-Al Ain Road");
    if (/\be88\b|beirut street/.test(s)) add("e88", "E88 / Beirut Street");
    if (/\be89\b|airport road/.test(s)) add("e89", "E89 / Airport Road");
    if (/\be311\b|\be611\b|\be11\b|\be44\b|\be66\b|\be88\b|\be89\b/.test(s) === false && /highway|motorway|freeway/.test(s)) add("highway", "UAE highway corridor");
    return corridors;
  }

  function tz4uaeDetectSalik(text, route) {
    const s = String(text || "").toLowerCase();
    const gates = [];
    const add = function(id, label) {
      if (!gates.some(function(g) { return g.id === id; })) gates.push({ id: id, label: label });
    };

    // Strong named-gate patterns first.
    if (/al\s+safa/.test(s)) add("al-safa", "Al Safa Salik");
    if (/al\s+barsha/.test(s)) add("al-barsha", "Al Barsha Salik");
    if (/al\s+mamzar/.test(s)) add("al-mamzar", "Al Mamzar Salik");
    if (/al\s+garhoud|garhoud bridge/.test(s)) add("al-garhoud", "Al Garhoud Salik");
    if (/al\s+maktoum|maktoum bridge/.test(s)) add("al-maktoum", "Al Maktoum Salik");
    if (/airport tunnel/.test(s)) add("airport-tunnel", "Airport Tunnel Salik");
    if (/business bay crossing|business bay bridge/.test(s)) add("business-bay", "Business Bay Crossing Salik");
    if (/jebel ali/.test(s)) add("jebel-ali", "Jebel Ali Salik");

    // Generic E11/SZR fallback: probable Salik only when the route text clearly uses Dubai E11/SZR.
    if (!gates.length && (/\be11\b|sheikh zayed|szr/.test(s)) && /dubai|jumeirah|marina|downtown|business bay|jebel ali|barsha|safa/.test(s)) {
      add("e11-generic", "Dubai E11 / Sheikh Zayed Salik area");
    }

    // Avoid false positives on common free outer corridors unless a named Salik gate was detected.
    const onlyOuterFree = /\be311\b|sheikh mohammed bin zayed|\be611\b|emirates road/.test(s) && !(/\be11\b|sheikh zayed|al\s+safa|al\s+barsha|al\s+mamzar|garhoud|maktoum|airport tunnel|business bay|jebel ali/.test(s));
    if (onlyOuterFree) return { gates: [], count: 0, cost: 0, confidence: "high", source: "free-corridor" };

    const previousCost = tz4uaeSafeNumber(route && route.tollCost, 0);
    const previousCount = tz4uaeSafeNumber(route && route.tollCount, 0);
    let count = gates.length;

    if (count === 0 && previousCost > 0) {
      count = Math.max(1, Math.round(previousCost / TZ4_SALIK_AED_PER_GATE));
      gates.push({ id: "estimated", label: "Estimated Salik area" });
    } else if (count === 0 && previousCount > 0) {
      count = previousCount;
      gates.push({ id: "estimated", label: "Estimated Salik area" });
    }

    const cost = count * TZ4_SALIK_AED_PER_GATE;
    return {
      gates: gates.slice(0, Math.max(0, count)),
      count: count,
      cost: cost,
      confidence: gates.length && gates[0].id !== "estimated" ? "medium" : (cost > 0 ? "low" : "high"),
      source: gates.length && gates[0].id !== "estimated" ? "route-text" : (cost > 0 ? "existing-estimate" : "no-salik")
    };
  }

  function tz4uaePeakWindow() {
    const d = new Date();
    const day = d.getDay();
    const h = d.getHours() + d.getMinutes() / 60;
    const weekday = day >= 1 && day <= 5;
    if (weekday && h >= 6.5 && h <= 9.5) return { active: true, label: "morning peak", weight: 1.15 };
    if (weekday && h >= 16.5 && h <= 20.0) return { active: true, label: "evening peak", weight: 1.20 };
    if (day === 5 && h >= 11.0 && h <= 14.5) return { active: true, label: "Friday midday movement", weight: 1.10 };
    return { active: false, label: "normal local window", weight: 1.0 };
  }

  function tz4uaeDetectLocalPattern(text, route) {
    const s = String(text || "").toLowerCase();
    const corridors = tz4uaeDetectCorridors(text);
    const peak = tz4uaePeakWindow();
    const highwayShare = Math.max(0, Math.min(1, tz4uaeSafeNumber(route && route.highwayShare, 0)));
    const complexity = tz4uaeSafeNumber(route && (route.complexity || (route.scoreBreakdown && route.scoreBreakdown.complexityScore)), 0);
    const delay = tz4uaeSafeNumber(route && (route.delayMinutes || (route.scoreBreakdown && route.scoreBreakdown.delayMin)), 0);

    let personality = "local balanced route";
    if (/\be311\b|sheikh mohammed bin zayed/.test(s)) personality = "outer bypass corridor";
    else if (/\be611\b|emirates road/.test(s)) personality = "long outer bypass corridor";
    else if (/\be11\b|sheikh zayed|szr/.test(s)) personality = "central Dubai corridor";
    else if (/\be44\b|al khail/.test(s)) personality = "Dubai city bypass corridor";
    else if (highwayShare >= 0.55) personality = "highway-first route";
    else if (highwayShare <= 0.25) personality = "city-street route";

    const peakRisk = peak.active ? Math.round((delay + complexity * 3 + highwayShare * 4) * peak.weight) : Math.round(delay + complexity * 2);
    let peakLabel = "low";
    if (peakRisk >= 12) peakLabel = "high";
    else if (peakRisk >= 6) peakLabel = "medium";

    return {
      corridors: corridors,
      personality: personality,
      peakWindow: peak,
      peakRisk: peakRisk,
      peakLabel: peakLabel
    };
  }

  function tz4uaeBuildAdvice(meta, route) {
    const tollPart = meta.salik.cost > 0 ? (meta.salik.cost + " AED Salik estimate") : "no Salik detected";
    const peakPart = meta.pattern.peakWindow.active ? (meta.pattern.peakWindow.label + ", " + meta.pattern.peakLabel + " local risk") : (meta.pattern.peakLabel + " local risk now");
    const corridor = meta.pattern.corridors[0] ? meta.pattern.corridors[0].label : meta.pattern.personality;
    return corridor + " · " + tollPart + " · " + peakPart;
  }

  function tz4uaeEnrichRoute(route) {
    if (!route || typeof route !== "object") return route;
    const text = tz4uaeRouteText(route);
    const salik = tz4uaeDetectSalik(text, route);
    const pattern = tz4uaeDetectLocalPattern(text, route);
    const meta = {
      salik: salik,
      pattern: pattern,
      textFingerprint: text.slice(0, 240),
      updatedAt: Date.now()
    };

    route.uaeLocal = meta;
    route.tollCount = salik.count;
    route.tollCost = salik.cost;
    route.hasToll = salik.cost > 0;
    route.tolls = salik.cost > 0;
    route.uaePeakRisk = pattern.peakRisk;
    route.uaePeakLabel = pattern.peakLabel;
    route.uaeRoutePersonality = pattern.personality;
    route.uaeAdvice = tz4uaeBuildAdvice(meta, route);

    if (route.scoreBreakdown) {
      route.scoreBreakdown.tollCost = salik.cost;
      route.scoreBreakdown.tollPenalty = salik.cost > 0 ? 6 : 0;
      route.scoreBreakdown.uaePeakRisk = pattern.peakRisk;
      route.scoreBreakdown.uaePeakLabel = pattern.peakLabel;
    }
    return route;
  }

  function tz4uaeEnrichRoutes(routes) {
    if (!Array.isArray(routes)) return routes;
    routes.forEach(tz4uaeEnrichRoute);
    return routes;
  }

  function tz4uaeAppendDecision() {
    try {
      const advice = document.querySelector(".ai-advice-line");
      const best = (typeof _bestRoute !== "undefined" && _bestRoute) || (typeof selectedRoute !== "undefined" && selectedRoute) || null;
      if (!advice || !best) return;
      tz4uaeEnrichRoute(best);
      if (advice.dataset.tz4uaeApplied === "1") return;
      const local = best.uaeAdvice || "UAE local route check ready";
      advice.innerHTML += `<br><span>UAE</span>${tz4uaeEscape(local)}`;
      advice.dataset.tz4uaeApplied = "1";
    } catch (e) {
      try { console.warn("[TZ4 UAE] decision render skipped", e); } catch (_) {}
    }
  }

  const tz4uaeOriginalScoreRoutes = typeof scoreRoutes === "function" ? scoreRoutes : null;
  if (tz4uaeOriginalScoreRoutes) {
    scoreRoutes = function(routes) {
      tz4uaeEnrichRoutes(routes);
      const scored = tz4uaeOriginalScoreRoutes.apply(this, arguments);
      tz4uaeEnrichRoutes(scored);
      return scored;
    };
  }

  try { window.clearRoadTZ4UAE = {
    enrichRoute: tz4uaeEnrichRoute,
    enrichRoutes: tz4uaeEnrichRoutes,
    detectSalik: function(route) { return tz4uaeDetectSalik(tz4uaeRouteText(route), route); },
    detectPattern: function(route) { return tz4uaeDetectLocalPattern(tz4uaeRouteText(route), route); },
    peakWindow: tz4uaePeakWindow
  }; } catch (_) {}
})();
