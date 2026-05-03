// ТЗ-2 [v10] — якорь «ТЗ-2: NORMALIZATION LAYER» (монолит): стабильный формат маршрута Google → поля для Score Engine.
// Порядок: после cr-tz1-drive-voice-nav-turns.js — до cr-tz1-tz2-decision-helpers.js
// (cr-tz3-score-engine вызывает normalizeRoute; main — normalizeRoutes / validateNormalizedRoutes / applyClearRoadRouteSanityMarks).
// Зависимостей от main нет (чистые утилиты + объекты маршрутов).

// ============================================================
//  ТЗ-2: NORMALIZATION LAYER
//  Converts extracted Google route data into one stable format
//  without removing old fields used by the existing UI.
// ============================================================
function tz2ToNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function tz2Clamp(value, min, max) {
  const n = tz2ToNumber(value, min);
  return Math.min(max, Math.max(min, n));
}

function tz2Round(value, digits = 1) {
  const factor = Math.pow(10, digits);
  return Math.round(tz2ToNumber(value, 0) * factor) / factor;
}

function tz2StripHtml(value) {
  const text = String(value || "");
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function tz2GetStepDistance(step) {
  if (!step) return 0;
  if (Number.isFinite(step.distance)) return step.distance;
  if (step.distance && Number.isFinite(step.distance.value)) return step.distance.value;
  if (step.rawStep && step.rawStep.distance && Number.isFinite(step.rawStep.distance.value)) return step.rawStep.distance.value;
  return 0;
}

function tz2GetStepDuration(step) {
  if (!step) return 0;
  if (Number.isFinite(step.duration)) return step.duration;
  if (step.duration && Number.isFinite(step.duration.value)) return step.duration.value;
  if (step.rawStep && step.rawStep.duration && Number.isFinite(step.rawStep.duration.value)) return step.rawStep.duration.value;
  return 0;
}

function tz2GetStepInstruction(step) {
  if (!step) return "";
  return tz2StripHtml(step.instruction || step.instructions || (step.rawStep && step.rawStep.instructions) || "");
}

function tz2NormalizeStep(step, index) {
  const maneuver = (step && (step.maneuver || (step.rawStep && step.rawStep.maneuver))) || "straight";
  return {
    index,
    instruction: tz2GetStepInstruction(step),
    maneuver,
    distance: tz2GetStepDistance(step),
    duration: tz2GetStepDuration(step),
    startLocation: (step && step.startLocation) || null,
    endLocation: (step && step.endLocation) || null,
    rawStep: (step && step.rawStep) || step || null
  };
}

function tz2CalculateStopsCount(steps) {
  if (!Array.isArray(steps)) return 0;
  return steps.filter(function(step) {
    const instruction = (step.instruction || "").toLowerCase();
    const maneuver = String(step.maneuver || "").toLowerCase();
    return /turn|left|right|roundabout|exit|ramp|merge|fork|u-turn|uturn|keep/.test(maneuver + " " + instruction);
  }).length;
}

function tz2CalculateTrafficScore(durationSec, durationTrafficSec) {
  const base = Math.max(1, tz2ToNumber(durationSec, 0));
  const traffic = Math.max(base, tz2ToNumber(durationTrafficSec, base));
  const delayRatio = Math.max(0, (traffic - base) / base);
  return tz2Round(tz2Clamp(delayRatio, 0, 1), 2);
}

function tz2CalculateComplexityScore(steps, distanceKm) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  const km = Math.max(1, tz2ToNumber(distanceKm, 0));
  const stops = tz2CalculateStopsCount(safeSteps);
  const exits = safeSteps.filter(function(step) {
    const joined = String(step.maneuver || "") + " " + String(step.instruction || "");
    return /exit|ramp|merge|fork|roundabout/i.test(joined);
  }).length;
  const rawScore = (stops / km) * 0.55 + exits * 0.18;
  return tz2Round(tz2Clamp(rawScore, 0, 1), 2);
}

function normalizeRoute(route, index = 0) {
  const normalizedIndex = Number.isFinite(route && route.index) ? route.index : index;
  const durationSec = tz2ToNumber(route && (route.durationSec ?? route.duration), 0);
  const durationTrafficSec = tz2ToNumber(route && (route.durationTrafficSec ?? route.duration_in_traffic ?? route.durationInTraffic ?? route.time), durationSec);
  const distanceMeters = tz2ToNumber(route && (route.distanceMeters ?? route.distance), 0);
  const distanceKm = tz2Round(distanceMeters / 1000, 1);
  const steps = Array.isArray(route && route.steps) ? route.steps.map(tz2NormalizeStep) : [];
  const legs = Array.isArray(route && route.legs) ? route.legs : [];
  const stopsCount = tz2CalculateStopsCount(steps);
  const trafficScore = tz2CalculateTrafficScore(durationSec, durationTrafficSec);
  const complexityScore = tz2CalculateComplexityScore(steps, distanceKm);

  return {
    ...route,
    id: (route && route.id) || `route-${normalizedIndex + 1}`,
    index: normalizedIndex,
    displayIndex: normalizedIndex + 1,
    summary: (route && route.summary) || `Route ${normalizedIndex + 1}`,

    // Stable ТЗ-2 fields for the next Score Engine step
    durationSec,
    durationTrafficSec,
    distanceMeters,
    distanceKm,
    legs,
    steps,
    stopsCount,
    trafficScore,
    complexityScore,

    // Compatibility aliases for the existing UI and old scoring logic
    duration: tz2ToNumber(route && route.duration, durationSec),
    duration_in_traffic: tz2ToNumber(route && route.duration_in_traffic, durationTrafficSec),
    distance: tz2ToNumber(route && route.distance, distanceMeters),
    time: tz2ToNumber(route && route.time, durationTrafficSec),
    baseTime: tz2ToNumber(route && route.baseTime, durationSec),
    turnsCount: tz2ToNumber(route && route.turnsCount, stopsCount),
    normalizedRoute: true
  };
}

function normalizeRoutes(routes) {
  if (!Array.isArray(routes)) return [];
  return routes.map(function(route, index) {
    return normalizeRoute(route, index);
  });
}

function clearRoadDurSecTrafficForSanity(route) {
  if (!route) return 0;
  var t = tz2ToNumber(route.durationTrafficSec ?? route.time ?? route.duration_in_traffic ?? route.durationInTraffic, 0);
  if (!(Number.isFinite(t) && t > 0)) t = tz2ToNumber(route.durationSec ?? route.duration, 0);
  return Number.isFinite(t) && t > 0 ? t : 0;
}

function clearRoadDistanceKmForSanity(route) {
  if (!route) return 0;
  if (Number.isFinite(route.distanceKm) && route.distanceKm > 0) return route.distanceKm;
  var m = tz2ToNumber(route.distanceMeters ?? route.distance, 0);
  return m > 0 ? m / 1000 : 0;
}

function applyClearRoadRouteSanityMarks(routes) {
  var list = Array.isArray(routes) ? routes.filter(Boolean) : [];
  if (!list.length) return;

  var dbg = false;
  try {
    dbg = window.__CLEAR_ROAD_ROUTE_DEBUG__ === true;
  } catch (e) {
    dbg = false;
  }

  list.forEach(function(route) {
    route.invalidRoute = false;
    delete route.invalidReason;

    var raw = route.rawRoute || route.route;
    var legCount = Array.isArray(route.legs) ? route.legs.length : 0;
    if (!legCount && raw && Array.isArray(raw.legs)) legCount = raw.legs.length;

    var durSec = clearRoadDurSecTrafficForSanity(route);
    var dM = tz2ToNumber(route.distanceMeters ?? route.distance, 0);
    if (!(dM > 0)) {
      var kmFallback = clearRoadDistanceKmForSanity(route);
      if (Number.isFinite(kmFallback) && kmFallback > 0) dM = kmFallback * 1000;
    }

    var reason = null;
    if (!legCount) reason = "no_legs";
    else if (!Number.isFinite(durSec) || durSec <= 0) reason = "no_duration_or_nan";
    else if (!Number.isFinite(dM) || dM <= 0) reason = "no_distance_or_nan";

    if (reason) {
      route.invalidRoute = true;
      route.invalidReason = reason;
      if (dbg) console.warn("[ROUTE REJECT]", reason, { summary: route.summary, durSec: durSec, distanceM: dM, legs: legCount });
    } else if (dbg) {
      console.log("[ROUTE KEEP]", route);
    }
  });
}

function validateNormalizedRoutes(routes) {
  if (!Array.isArray(routes) || routes.length === 0) {
    return { ok: false, message: "No normalized routes" };
  }

  const invalid = routes.find(function(route) {
    if (!route || !route.normalizedRoute) return true;
    const ds = Number(route.durationSec);
    const dts = Number(route.durationTrafficSec);
    const dk = Number(route.distanceKm);
    if (!Number.isFinite(ds) || !Number.isFinite(dts) || !Number.isFinite(dk)) return true;
    if (ds <= 0 || dk <= 0) return true;
    return false;
  });

  if (invalid) {
    return { ok: false, message: `Invalid normalized route: ${(invalid && invalid.id) || "unknown route"}` };
  }

  return { ok: true, message: "OK" };
}
