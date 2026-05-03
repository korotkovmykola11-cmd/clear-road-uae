// ТЗ-2 [v08] — якорь «ТЗ-1 PATCH — ROUTE DECISION CORE LOCK» / «ТЗ-2: Decision Engine Strengthening».
// Порядок: внешний <script> сразу после cr-tz2-normalization-layer.js — до cr-tz1-drive-update-ui.js
// (_tz1Minutes / _tz2Turns и т.д. нужны скорингу, WHY, AI decision, TZ5/TZ6 слоям).
// Зависит от main: getRouteSummaryName, calculateDriveStress (опционально).

// ============================================================
//  ТЗ-1 PATCH — ROUTE DECISION CORE LOCK
//  Scope: no redesign, no CSS/layout changes. Logic only.
// ============================================================
// ============================================================
//  ТЗ-2: Decision Engine Strengthening
//  Scope: score + WHY + trade-off only. No redesign/CSS/layout changes.
// ============================================================
function _tz1Minutes(route) {
  if (!route) return 0;
  if (typeof route.durationMin === "number") return route.durationMin;
  if (typeof route.time === "number") return Math.round(route.time / 60);
  return 0;
}

function _tz1TrafficRank(level) {
  if (level === "low" || level === "stable") return 1;
  if (level === "medium" || level === "moderate") return 2;
  if (level === "high" || level === "heavy") return 3;
  return 2;
}

function _tz1EscapeHTML(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Short label / icon for drive-ahead chip: allows numeric entities (&#…;) and symbols, blocks tag injection */
function _tz1SanitizeAheadIcon(icon) {
  const s = String(icon == null ? "" : icon).replace(/[<>]/g, "").trim().slice(0, 96);
  return s || "&#9728;";
}

function _tz1RouteName(route) {
  try {
    return getRouteSummaryName(route);
  } catch (e) {
    return route && route.displayIndex ? "Route " + route.displayIndex : "route";
  }
}

function _tz2Number(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function _tz2Delay(route) {
  return Math.max(0, _tz2Number(route && route.delayMinutes, 0));
}

function _tz2Complexity(route) {
  return Math.max(0, _tz2Number(route && route.complexity, 0));
}

function _tz2Turns(route) {
  return Math.max(0, _tz2Number(route && (route.turnsCount || route.stopsCount || route.complexity), 0));
}

function _tz2TollCost(route) {
  return Math.max(0, _tz2Number(route && (route.tollCost || (route.hasToll ? 4 : 0)), 0));
}

function _tz2HighwayShare(route) {
  return Math.max(0, Math.min(1, _tz2Number(route && route.highwayShare, 0)));
}

function _tz2TrafficLabel(route) {
  const rank = _tz1TrafficRank(route && route.traffic);
  if (rank <= 1) return "light traffic";
  if (rank === 2) return "moderate traffic";
  return "heavy traffic";
}

function _tz2BuildScoreBreakdown(route) {
  const durationMin = _tz1Minutes(route);
  const trafficRank = _tz1TrafficRank(route && route.traffic);
  const delayMin = _tz2Delay(route);
  const turns = _tz2Turns(route);
  const complexity = _tz2Complexity(route);
  const tollCost = _tz2TollCost(route);
  const highwayShare = _tz2HighwayShare(route);
  const stressScore = typeof calculateDriveStress === "function" ? calculateDriveStress(route) : 0;

  const timeCost = durationMin;
  const trafficPenalty = trafficRank * 4 + delayMin * 1.7;
  const complexityPenalty = complexity * 1.35;
  const turnsPenalty = turns * 0.55;
  const tollPenalty = tollCost > 0 ? 4 + Math.min(8, tollCost * 0.45) : 0;
  const stressPenalty = stressScore ? stressScore * 0.65 : 0;
  const stabilityBonus = highwayShare >= 0.45 && trafficRank <= 2 ? -3 : highwayShare < 0.2 && complexity > 8 ? 2 : 0;

  const total = timeCost + trafficPenalty + complexityPenalty + turnsPenalty + tollPenalty + stressPenalty + stabilityBonus;
  const stabilityScore = Math.max(0, Math.min(100, Math.round(100 - trafficRank * 11 - delayMin * 2.2 - complexity * 1.6 - turns * 0.55 + highwayShare * 12)));

  return {
    timeCost,
    trafficPenalty,
    complexityPenalty,
    turnsPenalty,
    tollPenalty,
    stressPenalty,
    stabilityBonus,
    total,
    stabilityScore,
    durationMin,
    trafficRank,
    delayMin,
    turns,
    complexity,
    tollCost,
    highwayShare,
    stressScore
  };
}
