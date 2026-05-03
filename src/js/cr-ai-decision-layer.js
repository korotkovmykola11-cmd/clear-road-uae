// ТЗ-2 [v05] — якорь «ТЗ-5 — AI DECISION LAYER» (buildAIDecision, buildCanonicalDecisionState, …).
// Порядок: внешний <script> сразу после cr-tz4-why-generator.js — до cr-tz1-drive-voice-ai-advice.js
// (нужен для buildCanonicalDecisionState в TZ7 live, TZ2 integrity, TZ7+TZ8 bundle).
// Зависит от cr-tz2-normalization-layer.js: normalizeRoutes, validateNormalizedRoutes, applyClearRoadRouteSanityMarks.
// Зависит от cr-tz4-why-generator.js: applyWhyToRoutes, clearRoadOfficialBestRoute.
// Зависит от cr-tz3-score-engine.js: scoreRoutes, validateScoredRoutes.
// Зависит от cr-tz1-tz2-decision-helpers.js: _tz1Minutes, _tz2Turns.
// От main: getUserPreference, userFilters, getRouteRole,
// window.buildRealDecision (если задан), currentDecision (в calculateConfidence).
// ============================================================
//  ТЗ-5 — AI DECISION LAYER
//  Builds one official decision object without changing the UI contract.
// ============================================================
function tz5PreferencePenalty(route) {
  const pref = typeof getUserPreference === "function" ? getUserPreference() : "balanced";
  if (pref === "fastest") return _tz1Minutes(route) * 0.7;
  if (pref === "no_tolls" && route && route.tolls) return 18;
  return 0;
}

function tz5FilterPenalty(route) {
  const safeFilters = typeof userFilters === "object" && userFilters ? userFilters : {};
  return (safeFilters.avoid_highways && route && route.highway ? 8 : 0) +
         (safeFilters.fewer_turns ? _tz2Turns(route) * 0.8 : 0);
}

function calculateDecisionConfidence(bestRoute, alternatives) {
  const routes = [bestRoute].concat(Array.isArray(alternatives) ? alternatives : []).filter(Boolean);
  return buildAIDecision(routes).confidence;
}

function buildAIDecision(routes) {
  if (typeof window.buildRealDecision === "function") return window.buildRealDecision(routes);
  const safe = Array.isArray(routes) ? routes.filter(Boolean) : [];
  const fastestRoute =
    safe.slice().sort(function(a, b) {
      return _tz1Minutes(a) - _tz1Minutes(b);
    })[0] || safe[0] || null;
  const bestRoute = safe[0] || null;
  const alternatives = bestRoute ? safe.filter(function(route) {
    return route && route.index !== bestRoute.index;
  }) : [];
  return {
    bestRoute,
    alternatives,
    rankedRoutes: safe,
    confidence: { level: "LOW", percent: 55, margin: 0, reason: "Bootstrap · awaiting SSOT engine" },
    selectedRouteId: bestRoute ? bestRoute.id : null,
    selectedRouteIndex: bestRoute ? bestRoute.index : null,
    fastestRoute: fastestRoute || bestRoute,
    generatedAt: new Date().toISOString()
  };
}

function validateAIDecision(decision) {
  if (!decision || !decision.bestRoute) return { ok: false, message: "AI decision has no best route" };
  if (!Array.isArray(decision.alternatives)) return { ok: false, message: "AI decision alternatives are missing" };
  if (!decision.confidence || typeof decision.confidence.level !== "string" || !Number.isFinite(decision.confidence.percent)) {
    return { ok: false, message: "AI decision confidence is invalid" };
  }
  return { ok: true, message: "OK" };
}

function selectBestRouteDecision(routes) {
  return buildAIDecision(routes);
}

function selectBestRoute(routes) {
  return buildAIDecision(routes).bestRoute;
}

function buildCanonicalDecisionState(routesInput, options) {
  const opts = options || {};
  let normalized = normalizeRoutes(Array.isArray(routesInput) ? routesInput : []);
  applyClearRoadRouteSanityMarks(normalized);
  normalized = normalized.filter(function(route){ return route && !route.invalidRoute; });
  if (!normalized.length) throw new Error("Route data looks incorrect. Please choose a more specific destination.");
  const alreadyScored = !!opts.assumeScored && normalized.every(function(route) {
    return Number.isFinite(route && route.score) && !!(route && route.scoreBreakdown);
  });
  const scored = alreadyScored ? normalized : scoreRoutes(normalized);
  const scoreCheck = validateScoredRoutes(scored);
  if (!scoreCheck.ok) throw new Error(scoreCheck.message);

  const firstDecision = selectBestRouteDecision(scored);
  const decisionCheck = validateAIDecision(firstDecision);
  if (!decisionCheck.ok) throw new Error(decisionCheck.message);

  const best = firstDecision.bestRoute;
  const fastest = scored.slice().sort(function(a, b) { return _tz1Minutes(a) - _tz1Minutes(b); })[0] || best || null;
  const withWhy = applyWhyToRoutes(scored, best);
  const withRoles = withWhy.map(function(route, index) {
    route.role = getRouteRole(route, best, fastest, withWhy);
    route.decisionRank = Number.isFinite(route.decisionRank) ? route.decisionRank : (index + 1);
    route.decisionScore = Number.isFinite(route.decisionScore)
      ? Math.round(route.decisionScore * 10) / 10
      : Math.round((Number.isFinite(route && route.score) ? Number(route.score) : 0) * 10) / 10;
    return route;
  });

  // SSOT этап 1: один вызов buildRealDecision на scored; withRoles — те же объекты маршрутов
  return {
    routes: withRoles,
    decision: firstDecision,
    bestRoute: best,
    fastestRoute: fastest
  };
}

function calculateConfidence(best, allRoutes) {
  if (!best) return "HIGH";

  if (typeof currentDecision !== "undefined" && currentDecision && currentDecision.bestRoute && currentDecision.confidence) {
    const dbr = currentDecision.bestRoute;
    if (Number(best.index) !== Number(dbr.index)) return "LOW";
    const lvl = String(currentDecision.confidence.level || "HIGH").toUpperCase();
    if (dbr.tooSlow || dbr.notRecommended) return "LOW";
    return lvl;
  }

  if (!Array.isArray(allRoutes) || allRoutes.length < 2) return "HIGH";

  let decision = null;
  if (typeof window.buildRealDecision === "function") {
    decision = window.buildRealDecision(allRoutes);
  } else {
    decision = buildAIDecision(allRoutes);
  }

  if (!decision || !decision.bestRoute) return "HIGH";

  if (Number(best.index) !== Number(decision.bestRoute.index)) return "LOW";

  const br = decision.bestRoute;
  const fr = decision.fastestRoute || br;

  if (br.tooSlow || br.notRecommended) return "LOW";

  const gapBestVsFastest = Math.round(_tz1Minutes(br) - _tz1Minutes(fr));
  const alts = Array.isArray(decision.alternatives) ? decision.alternatives : [];
  const hasAlternatives = alts.length > 0;
  let strongAlternative = false;
  if (hasAlternatives && alts[0]) {
    strongAlternative =
      Math.abs(_tz1Minutes(alts[0]) - _tz1Minutes(br)) <= 12;
  }

  if (gapBestVsFastest > 22) return "LOW";
  if (!hasAlternatives) return "HIGH";
  if (strongAlternative || gapBestVsFastest > 8) return "MEDIUM";
  return "HIGH";
}

function _tz1ConfidencePercent(level) {
  if (level === "HIGH") return 90;
  if (level === "MEDIUM") return 70;
  return 55;
}
