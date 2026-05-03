// ТЗ-2 [v06] — якорь «ТЗ-4 — WHY GENERATOR»: WHY / trade-off тексты и применение к маршрутам.
// Порядок: внешний <script> сразу после cr-tz3-score-engine.js — до cr-ai-decision-layer.js
// (buildCanonicalDecisionState вызывает applyWhyToRoutes).
// Зависит от main: analyzedRoutes, getRouteSummaryName, window.buildRealDecision (если есть).
// Зависит от cr-tz1-tz2-decision-helpers.js: _tz1Minutes, _tz2Turns, _tz2TollCost, _tz1RouteName.

function _tz2CompareMetric(best, others, getter, direction) {
  if (!best || !others || !others.length) return null;
  const bestValue = getter(best);
  const values = others.map(getter).filter(Number.isFinite);
  if (!values.length) return null;
  const target = direction === "lower" ? Math.min.apply(null, values) : Math.max.apply(null, values);
  return { bestValue, target, diff: direction === "lower" ? target - bestValue : bestValue - target };
}

function _tz2BuildWhy(best, routes) {
  const r = routes || analyzedRoutes;
  return generateWhyLine(best, r, clearRoadOfficialBestRoute(r));
}

function _tz2BuildTradeOff(route, best, routes) {
  if (!route) return "";
  const others = (routes || []).filter(function(r) { return r && r.index !== route.index; });
  const fastest = (routes || []).slice().sort(function(a, b) { return _tz1Minutes(a) - _tz1Minutes(b); })[0];
  const lowestToll = (routes || []).slice().sort(function(a, b) { return _tz2TollCost(a) - _tz2TollCost(b); })[0];
  const simplest = (routes || []).slice().sort(function(a, b) { return _tz2Turns(a) - _tz2Turns(b); })[0];
  const currentMin = _tz1Minutes(route);

  if (fastest && route.index !== fastest.index) {
    const extra = currentMin - _tz1Minutes(fastest);
    if (extra > 0 && extra <= 5 && _tz2Turns(route) + 2 < _tz2Turns(fastest)) return "+" + extra + " min, but simpler drive";
    if (extra > 0 && _tz2TollCost(route) < _tz2TollCost(fastest)) return "+" + extra + " min, but lower tolls";
  }

  if (lowestToll && route.index === lowestToll.index && _tz2TollCost(route) === 0 && fastest && fastest.index !== route.index) {
    const extra = currentMin - _tz1Minutes(fastest);
    if (extra > 0) return "No tolls, but +" + extra + " min";
  }

  if (simplest && route.index === simplest.index && fastest && fastest.index !== route.index) {
    const extra = currentMin - _tz1Minutes(fastest);
    if (extra > 0 && extra <= 4) return "Slightly longer, but calmer";
  }

  if (best && route.index === best.index && others.length) {
    let second = null;
    if (typeof window.buildRealDecision === "function") {
      const alts = window.buildRealDecision(routes || []).alternatives;
      if (alts && alts[0]) second = alts[0];
    }
    if (!second) second = others.slice().sort(function(a, b) { return (a.score || 0) - (b.score || 0); })[0];
    if (second) {
      const diff = _tz1Minutes(route) - _tz1Minutes(second);
      if (diff < 0 && _tz2Turns(route) > _tz2Turns(second) + 2) return "Faster, but more turns";
      if (diff <= 1 && _tz2TollCost(route) > _tz2TollCost(second)) return "Best balance, but tolls apply";
    }
  }

  return "Balanced time, traffic and driving effort";
}

// ============================================================
//  ТЗ-4 — WHY GENERATOR
//  Generates clear, data-based reasons after ТЗ-3 score is ready.
// ============================================================
function tz4SafeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function tz4Minutes(route) {
  if (!route) return 0;
  if (Number.isFinite(route.durationMin)) return Math.round(route.durationMin);
  if (Number.isFinite(route.durationTrafficSec)) return Math.round(route.durationTrafficSec / 60);
  if (Number.isFinite(route.time)) return Math.round(route.time / 60);
  if (typeof _tz1Minutes === "function") return _tz1Minutes(route);
  return 0;
}

function tz4TrafficScore(route) {
  if (!route) return 0;
  if (Number.isFinite(route.trafficScore)) return route.trafficScore;
  if (route.scoreBreakdown && Number.isFinite(route.scoreBreakdown.trafficScore)) return route.scoreBreakdown.trafficScore;
  if (typeof _tz1TrafficRank === "function") return _tz1TrafficRank(route.traffic) / 3;
  return 0;
}

function tz4Stops(route) {
  if (!route) return 0;
  if (Number.isFinite(route.stopsCount)) return route.stopsCount;
  if (Number.isFinite(route.turnsCount)) return route.turnsCount;
  if (typeof _tz2Turns === "function") return _tz2Turns(route);
  return 0;
}

function tz4DelayMin(route) {
  if (!route) return 0;
  if (route.scoreBreakdown && Number.isFinite(route.scoreBreakdown.delayMin)) return Math.round(route.scoreBreakdown.delayMin);
  if (Number.isFinite(route.delayMinutes)) return Math.round(route.delayMinutes);
  if (Number.isFinite(route.durationTrafficSec) && Number.isFinite(route.durationSec)) {
    return Math.max(0, Math.round((route.durationTrafficSec - route.durationSec) / 60));
  }
  return 0;
}

function tz4RoadName(route) {
  if (typeof _tz1RouteName === "function") return _tz1RouteName(route);
  if (typeof getRouteSummaryName === "function") return getRouteSummaryName(route);
  return (route && route.summary) || (route && route.title) || "selected route";
}

/** TZ4 legacy sort by route.score — только подписи/сравнения текста; не использовать как выбор лучшего маршрута (SSOT: buildRealDecision). */
function tz4BestByScore(routes) {
  const safeRoutes = Array.isArray(routes) ? routes.filter(Boolean) : [];
  if (!safeRoutes.length) return null;
  return safeRoutes.slice().sort(function(a, b) {
    return tz4SafeNumber(a.score, 999999) - tz4SafeNumber(b.score, 999999);
  })[0];
}

function clearRoadOfficialBestRoute(routes) {
  const safe = Array.isArray(routes) ? routes.filter(Boolean) : [];
  if (!safe.length) return null;
  if (typeof window.buildRealDecision === "function") return window.buildRealDecision(safe).bestRoute;
  return tz4BestByScore(safe);
}

function generateWhy(route, bestRoute, allRoutes) {
  const r = route || null;
  const routes = Array.isArray(allRoutes) && allRoutes.length ? allRoutes : (Array.isArray(analyzedRoutes) ? analyzedRoutes : []);
  const best = bestRoute || clearRoadOfficialBestRoute(routes) || r;
  if (!r) return ["Route is being calculated"];

  const reasons = [];
  const isBest = best && r.index === best.index;
  const others = routes.filter(function(item) { return item && item.index !== r.index; });
  const road = tz4RoadName(r);

  if (isBest) {
    const second = others.slice().sort(function(a, b) {
      return tz4SafeNumber(a.score, 999999) - tz4SafeNumber(b.score, 999999);
    })[0];

    if (second) {
      const timeAdvantage = tz4Minutes(second) - tz4Minutes(r);
      const trafficAdvantage = tz4TrafficScore(second) - tz4TrafficScore(r);
      const stopsAdvantage = tz4Stops(second) - tz4Stops(r);
      const delayAdvantage = tz4DelayMin(second) - tz4DelayMin(r);
      const scoreAdvantage = Math.round(tz4SafeNumber(second.score, 0) - tz4SafeNumber(r.score, 0));

      if (timeAdvantage >= 2) reasons.push("Faster by " + timeAdvantage + " min");
      if (trafficAdvantage >= 0.12) reasons.push("Less traffic");
      if (delayAdvantage >= 2) reasons.push("Less delay by " + delayAdvantage + " min");
      if (stopsAdvantage >= 2) reasons.push("Fewer stops");
      if (!reasons.length && scoreAdvantage >= 3) reasons.push("Best score balance");
    }

    if (!reasons.length) {
      if (tz4DelayMin(r) <= 1 && tz4TrafficScore(r) <= 0.2) reasons.push("Stable traffic now");
      else if (tz4TrafficScore(r) <= 0.3) reasons.push("Balanced traffic and time");
      else reasons.push("Best overall balance");
    }
  } else if (best) {
    const timeDiff = tz4Minutes(r) - tz4Minutes(best);
    const trafficDiff = tz4TrafficScore(r) - tz4TrafficScore(best);
    const stopsDiff = tz4Stops(r) - tz4Stops(best);
    const delayDiff = tz4DelayMin(r) - tz4DelayMin(best);

    if (timeDiff < 0) reasons.push("Faster by " + Math.abs(timeDiff) + " min");
    else if (timeDiff > 0) reasons.push(timeDiff + " min slower than best");
    else reasons.push("Similar time to best");

    if (trafficDiff <= -0.12) reasons.push("Less traffic");
    else if (trafficDiff >= 0.12) reasons.push("More traffic");

    if (stopsDiff <= -2) reasons.push("Fewer stops");
    else if (stopsDiff >= 2) reasons.push("More stops");

    if (delayDiff <= -2) reasons.push("Less delay by " + Math.abs(delayDiff) + " min");
    else if (delayDiff >= 2) reasons.push("More delay by " + delayDiff + " min");
  }

  const unique = [];
  reasons.forEach(function(reason) {
    if (reason && unique.indexOf(reason) === -1) unique.push(reason);
  });

  if (!unique.length) unique.push("Route profile calculated");
  if (road && unique.length) unique[0] = unique[0] + " via " + road;
  return unique.slice(0, 3);
}

function generateWhyLine(route, allRoutes, bestRoute) {
  const routes = allRoutes || analyzedRoutes;
  const best = bestRoute || clearRoadOfficialBestRoute(routes);
  return generateWhy(route, best, routes).join(" · ");
}

function applyWhyToRoutes(routes, bestRoute) {
  if (!Array.isArray(routes)) return [];
  const best = bestRoute || clearRoadOfficialBestRoute(routes);
  return routes.map(function(route) {
    const points = generateWhy(route, best, routes);
    route.whyPoints = points;
    route.why = points.join(" · ");
    return route;
  });
}

function validateWhyRoutes(routes) {
  if (!Array.isArray(routes) || !routes.length) return { ok: false, message: "No WHY routes" };
  const invalid = routes.find(function(route) {
    return !route || !Array.isArray(route.whyPoints) || !route.whyPoints.length || typeof route.why !== "string" || !route.why.trim();
  });
  if (invalid) return { ok: false, message: "Invalid WHY route: " + ((invalid && invalid.id) || "unknown route") };
  return { ok: true, message: "OK" };
}
