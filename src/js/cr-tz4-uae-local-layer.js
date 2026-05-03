// ============================================================
//  ТЗ-4 — UAE-ONLY LOCAL LOGIC / SALIK / PEAK PATTERNS
//  Scope: additive safety layer only. Does not replace GPS, Drive Mode,
//  Predictive Engine, route cards, or core UI rendering.
// ============================================================
(function() {
  function tz4uaeSafeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Dubai-local Salik price per gate (AED). Mon–Sat peak 06:00–10:00 & 16:00–20:00 = 6; night 01:00–06:00 = 0; else 4. */
  function tz4uaeGetSalikPricePerGate(at) {
    const d = at && at instanceof Date ? at : new Date();
    let hour = 0;
    let minute = 0;
    let wd = "";
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Dubai",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        weekday: "short"
      }).formatToParts(d);
      const hP = parts.find(function(p) { return p.type === "hour"; });
      const mP = parts.find(function(p) { return p.type === "minute"; });
      const wP = parts.find(function(p) { return p.type === "weekday"; });
      hour = hP ? Number(hP.value) : d.getUTCHours();
      minute = mP ? Number(mP.value) : 0;
      wd = wP ? String(wP.value) : "";
    } catch (_) {
      hour = d.getHours();
      minute = d.getMinutes();
      wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    }
    const h = hour + minute / 60;
    const isSun = wd === "Sun";
    const monSat = !isSun;

    if (h >= 1 && h < 6) return 0;

    if (monSat) {
      if (h >= 6 && h < 10) return 6;
      if (h >= 16 && h < 20) return 6;
    }
    return 4;
  }

  function tz4uaeApplySalikPricingToRoute(route, at) {
    if (!route || typeof route !== "object") return route;
    const when = at instanceof Date ? at : new Date();
    const cnt = tz4uaeSafeNumber(
      route.salikCount != null ? route.salikCount : route.tollCount,
      0
    );
    route.salikCount = Math.max(0, Math.round(cnt));
    const ppg = tz4uaeGetSalikPricePerGate(when);
    route.salikPricePerGate = ppg;
    const raw = route.salikCount * ppg;
    route.salikCost = Math.round(raw * 100) / 100;
    route.tollCount = route.salikCount;
    route.tollCost = route.salikCost;
    route.hasToll = route.salikCost > 0;
    route.tolls = route.salikCost > 0;
    return route;
  }

  const TZ4_DARB_FALLBACK_PER_GATE = 4;

  function tz4uaeNormalizeTrip(s) {
    return String(s || "").toLowerCase();
  }

  function tz4uaeReadTripEndpoints() {
    try {
      const s = document.getElementById("start");
      const e = document.getElementById("end");
      return {
        start: s && s.value ? String(s.value) : "",
        end: e && e.value ? String(e.value) : ""
      };
    } catch (_) {
      return { start: "", end: "" };
    }
  }

  /** Dubai road Salik gates only (named). */
  function tz4uaeEndpointEmirates(startText, endText) {
    const a = tz4uaeNormalizeTrip(startText);
    const b = tz4uaeNormalizeTrip(endText);
    const dubai =
      /\bdubai\b|(?:^|\s)dxb\b|\bdeira\b|bur dubai|jumeirah|dubai marina|downtown dubai|business bay|internet city|media city|dubailand|silicon oasis|discovery gardens|arabian ranches|motor city|\bdsc\b|sports city|palm jumeirah|jebel ali village/;
    const abuDhabi =
      /\babu dhabi\b|\bal ain\b|saadiyat|yas island|khalifa city|musaffah|mussafah|rabdan|maqta|ghantoot|sas al nakhl|al raha|al reef|corniche|al qurm|khor al maqta/;
    const north =
      /\bsharjah\b|\bajman\b|umm al quwain|\buaq\b|ras al khaimah|\brak\b|fujairah|kalba|khor fakkan|dibba/;
    return {
      startDubai: dubai.test(a),
      endDubai: dubai.test(b),
      startAbuDhabi: abuDhabi.test(a),
      endAbuDhabi: abuDhabi.test(b),
      startNorth: north.test(a),
      endNorth: north.test(b),
      anyDubai: dubai.test(a) || dubai.test(b),
      anyAbuDhabi: abuDhabi.test(a) || abuDhabi.test(b),
      anyNorth: north.test(a) || north.test(b)
    };
  }

  /**
   * Northern-emirates-only trips (e.g. Ajman ↔ Sharjah): no Dubai road Salik unless a named Dubai gate appears in route text.
   */
  function tz4uaeSuppressDubaiRoadSalikDefault(ctx) {
    if (ctx.anyAbuDhabi || ctx.anyDubai) return false;
    if (ctx.startNorth && ctx.endNorth) return true;
    return false;
  }

  function tz4uaeDetectSalikRoad(text, route, ctx) {
    const s = String(text || "").toLowerCase();
    const gates = [];
    const add = function(id, label) {
      if (!gates.some(function(g) {
        return g.id === id;
      })) gates.push({
        id: id,
        label: label
      });
    };

    if (/al\s+barsha/.test(s)) add("al-barsha", "Al Barsha");
    if (/al\s+safa/.test(s)) add("al-safa", "Al Safa");
    if (/al\s+garhoud|garhoud\s+bridge/.test(s)) add("al-garhoud", "Al Garhoud Bridge");
    if (/al\s+maktoum|maktoum\s+bridge/.test(s)) add("al-maktoum", "Al Maktoum Bridge");
    if (/airport\s+tunnel/.test(s)) add("airport-tunnel", "Airport Tunnel");
    if (/al\s+mamzar\s+north/.test(s)) add("al-mamzar-n", "Al Mamzar North");
    if (/al\s+mamzar\s+south/.test(s)) add("al-mamzar-s", "Al Mamzar South");
    if (/al\s+mamzar/.test(s) && !/al\s+mamzar\s+(north|south)/.test(s)) add("al-mamzar", "Al Mamzar");
    if (/jebel\s+ali/.test(s)) add("jebel-ali", "Jebel Ali");
    if (/business\s+bay\s+crossing|business\s+bay\s+bridge/.test(s)) add("business-bay", "Business Bay Crossing");

    const suppress = tz4uaeSuppressDubaiRoadSalikDefault(ctx);
    if (suppress && !gates.length) {
      return {
        gates: [],
        count: 0,
        confidence: "high",
        source: "northern-emirates-no-dubai-gates"
      };
    }

    const onlyOuterFree = /\be311\b|sheikh mohammed bin zayed|\be611\b|emirates road/.test(s) && !(/\be11\b|sheikh zayed|al\s+safa|al\s+barsha|al\s+mamzar|garhoud|maktoum|airport tunnel|business bay|jebel ali/.test(s));
    if (onlyOuterFree && !gates.length) {
      return {
        gates: [],
        count: 0,
        confidence: "high",
        source: "free-corridor"
      };
    }

    const count = gates.length;
    return {
      gates: gates.slice(),
      count: count,
      confidence: count ? "medium" : "high",
      source: count ? "dubai-road-gate" : "no-dubai-road-salik"
    };
  }

  function tz4uaeDetectDarb(text, ctx) {
    const s = String(text || "").toLowerCase();
    const gates = [];
    const add = function(id, label) {
      if (!gates.some(function(g) {
        return g.id === id;
      })) gates.push({
        id: id,
        label: label
      });
    };

    const adRelevant = ctx.anyAbuDhabi || /ghantoot|maqta|musaffah|saadiyat|rabdan|al qurm|darb/.test(s);
    if (!adRelevant) {
      return {
        gates: [],
        count: 0,
        confidence: "high",
        source: "no-darb-context"
      };
    }

    if (/al\s+maqta|maqta\s+bridge/.test(s)) add("maqta", "Al Maqta Bridge");
    if (/musaffah|mussaffah|rabdan/.test(s)) add("musaffah", "Musaffah / Rabdan");
    if (/sheikh\s+zayed\s+bridge|sas\s+al\s+nakhl/.test(s)) add("szb", "Sheikh Zayed Bridge / Sas Al Nakhl");
    if (/sheikh\s+khalifa\s+bridge|al\s+saadiyat/.test(s)) add("skb", "Sheikh Khalifa Bridge / Al Saadiyat");
    if (/ghantoot/.test(s)) add("ghantoot", "Ghantoot Toll Gate");
    if (/al\s+qurm|qurm\s+toll/.test(s)) add("qurm", "Al Qurm Toll Gate");

    const count = gates.length;
    return {
      gates: gates.slice(),
      count: count,
      confidence: count ? "low" : (ctx.anyAbuDhabi ? "low" : "high"),
      source: count ? "darb-text" : ctx.anyAbuDhabi ? "abu-dhabi-destination-maybe" : "no-darb-gate-named"
    };
  }

  /** Paid parking may use Salik/Parkonic — not road toll. Destination-only. */
  function tz4uaeDetectDestParkingSalik(endText) {
    const s = tz4uaeNormalizeTrip(endText);
    if (!s) return {
      level: "none",
      key: null
    };
    const patterns =
      /dubai\s+mall|golden\s+mile|galleria|nakheel\s+mall|west\s+palm|palm\s+jumeirah|the\s+town\s+mall|dubai\s+investment|(?:^|\s)dip(?:\s|,|$)|dubai\s+sports\s+city|palm\s+monorail|parkonic|jebel\s+ali\s+town|sharjah.*beach|beach.*sharjah|al\s+khan|al\s+majaz/;
    if (patterns.test(s)) return {
      level: "salik_parking_possible", key: "uae_parking_salik_parkonic_line"
    };
    if (/\bmall\b|multi\s*storey|multistorey|paid\s+parking/.test(s)) return {
      level: "paid_unknown", levelRaw: "possible", key: "uae_parking_may_be_paid_dest"
    };
    return {
      level: "none",
      key: null
    };
  }

  function tz4uaeApplyDarbPricingToRoute(route, at) {
    if (!route || typeof route !== "object") return route;
    const when = at instanceof Date ? at : new Date();
    const cnt = tz4uaeSafeNumber(route.darbCount, 0);
    route.darbCount = Math.max(0, Math.round(cnt));
    const ppg = TZ4_DARB_FALLBACK_PER_GATE;
    route.darbPricePerGate = ppg;
    const raw = route.darbCount * ppg;
    route.darbCost = Math.round(raw * 100) / 100;
    route.darbEstimateUncertain = route.darbCount > 0 || route.uaeDarbPossible === true;
    return route;
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
    const ppg = tz4uaeGetSalikPricePerGate(new Date());
    const sc = tz4uaeSafeNumber(meta.salik.count, 0) * ppg;
    const dc = tz4uaeSafeNumber(route && route.darbCost, 0);
    let tollPart = "no Dubai road Salik";
    if (sc > 0) tollPart = Math.round(sc * 100) / 100 + " AED Dubai road Salik";
    if (dc > 0) tollPart += (sc > 0 ? " · " : "") + Math.round(dc * 100) / 100 + " AED Darb (estimate)";
    else if (route && route.uaeDarbPossible) tollPart += (tollPart.indexOf("AED") === -1 ? "" : " · ") + "Darb may apply (Abu Dhabi)";
    const peakPart = meta.pattern.peakWindow.active
      ? meta.pattern.peakWindow.label + ", " + meta.pattern.peakLabel + " local risk"
      : meta.pattern.peakLabel + " local risk now";
    const corridor = meta.pattern.corridors[0] ? meta.pattern.corridors[0].label : meta.pattern.personality;
    return corridor + " · " + tollPart + " · " + peakPart;
  }

  function tz4uaeEnrichRoute(route) {
    if (!route || typeof route !== "object") return route;
    const trip = tz4uaeReadTripEndpoints();
    const ctx = tz4uaeEndpointEmirates(trip.start, trip.end);
    const text = tz4uaeRouteText(route);
    const salik = tz4uaeDetectSalikRoad(text, route, ctx);
    const darbRaw = tz4uaeDetectDarb(text, ctx);
    const parking = tz4uaeDetectDestParkingSalik(trip.end);

    route.uaeTripEmirates = ctx;
    route.uaeDestParking = parking;
    route.uaeDestAbuDhabi = ctx.endAbuDhabi;
    route.uaeDarbPossible = darbRaw.source === "abu-dhabi-destination-maybe" && darbRaw.count === 0;

    route.darbCount = Math.max(0, Math.round(tz4uaeSafeNumber(darbRaw.count, 0)));
    route.darbMeta = {
      confidence: darbRaw.confidence,
      source: darbRaw.source,
      gates: darbRaw.gates || []
    };

    route.salikCount = Math.max(0, Math.round(tz4uaeSafeNumber(salik.count, 0)));
    route.salikRoadGates = salik.gates || [];
    route.salikMeta = {
      confidence: salik.confidence,
      source: salik.source,
      gateCount: route.salikCount,
      kind: "dubai_road"
    };
    route.salikEstimateUncertain = false;

    tz4uaeApplySalikPricingToRoute(route, new Date());
    tz4uaeApplyDarbPricingToRoute(route, new Date());

    const totalRoad = tz4uaeSafeNumber(route.salikCost, 0) + tz4uaeSafeNumber(route.darbCost, 0);
    route.tollCost = Math.round(totalRoad * 100) / 100;
    route.hasToll = totalRoad > 0.005;
    route.tolls = route.hasToll;
    route.tollCount = route.salikCount;

    const pattern = tz4uaeDetectLocalPattern(text, route);
    const meta = {
      salik: salik,
      darb: darbRaw,
      parking: parking,
      pattern: pattern,
      textFingerprint: text.slice(0, 240),
      updatedAt: Date.now()
    };
    route.uaeLocal = meta;

    route.uaePeakRisk = pattern.peakRisk;
    route.uaePeakLabel = pattern.peakLabel;
    route.uaeRoutePersonality = pattern.personality;
    route.uaeAdvice = tz4uaeBuildAdvice(meta, route);

    if (route.scoreBreakdown) {
      route.scoreBreakdown.tollCost = route.tollCost;
      route.scoreBreakdown.tollPenalty = route.tollCost > 0 ? 6 : 0;
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
    detectSalik: function(route) {
      const trip = tz4uaeReadTripEndpoints();
      const ctx = tz4uaeEndpointEmirates(trip.start, trip.end);
      return tz4uaeDetectSalikRoad(tz4uaeRouteText(route), route, ctx);
    },
    detectPattern: function(route) { return tz4uaeDetectLocalPattern(tz4uaeRouteText(route), route); },
    peakWindow: tz4uaePeakWindow,
    getSalikPricePerGate: tz4uaeGetSalikPricePerGate,
    applySalikPricingToRoute: tz4uaeApplySalikPricingToRoute,
    refreshRoutesSalikPricing: function(routes, at) {
      if (!Array.isArray(routes)) return routes;
      const when = at instanceof Date ? at : new Date();
      routes.forEach(function(r) {
        if (!r) return;
        tz4uaeApplySalikPricingToRoute(r, when);
        tz4uaeApplyDarbPricingToRoute(r, when);
        const total = tz4uaeSafeNumber(r.salikCost, 0) + tz4uaeSafeNumber(r.darbCost, 0);
        r.tollCost = Math.round(total * 100) / 100;
        r.hasToll = total > 0.005;
        r.tolls = r.hasToll;
      });
      return routes;
    }
  }; } catch (_) {}
  try {
    window.getSalikPriceUAE = function(currentTime) {
      return tz4uaeGetSalikPricePerGate(currentTime || new Date());
    };
  } catch (_) {}
})();
