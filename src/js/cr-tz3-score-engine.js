// ТЗ-2 [v07] — якорь «ТЗ-3 — SCORE ENGINE»: скоринг маршрутов.
// Порядок: внешний <script> сразу после cr-tz1-drive-update-ui.js — до cr-tz4-why-generator.js
// Зависит от cr-tz2-normalization-layer.js: normalizeRoute.
// Зависит от cr-tz1-tz2-decision-helpers.js: _tz2TollCost, _tz1RouteName, _tz2TrafficLabel.
// Зависит от main: getDrivePersonality.

// ============================================================
//  ТЗ-3 — SCORE ENGINE
//  Uses normalized ТЗ-2 fields as the primary source of truth.
//  Existing UI compatibility fields are preserved.
// ============================================================
function tz3SafeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function tz3Round(value, decimals = 1) {
  const factor = Math.pow(10, decimals);
  return Math.round(tz3SafeNumber(value, 0) * factor) / factor;
}

/** Per-step hints for calm routing: lane wording and heavy junction maneuvers (Directions steps). */
function tz3StepDerivedSignals(route) {
  const steps = Array.isArray(route && route.steps) ? route.steps : [];
  let laneHints = 0;
  let heavyJunctionSteps = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] || {};
    const text = String(step.instruction || step.instructions || "").toLowerCase();
    const man = String(step.maneuver || "").toLowerCase();
    const j = man + " " + text;
    if (/keep (left|right|center)|use (the )?\d[\d]?(st|nd|rd|th)? (from the )?(left|right) (lane|lanes)|change (to |)lane|take the .{0,24}lane|veer (left|right)|bear (left|right)/i.test(j)) {
      laneHints++;
    }
    if (/fork|merge onto|take the exit|exit the highway|take (the )?ramp|roundabout|rotary|traffic circle|interchange/i.test(j)) {
      heavyJunctionSteps++;
    }
  }
  return { laneHints, heavyJunctionSteps };
}

function scoreRoute(route, allRoutes) {
  const r = route && route.normalizedRoute ? route : normalizeRoute(route || {}, route && Number.isFinite(route.index) ? route.index : 0);

  const durationTrafficSec = Math.max(0, tz3SafeNumber(r.durationTrafficSec, tz3SafeNumber(r.time, tz3SafeNumber(r.durationSec, 0))));
  const durationSec = Math.max(0, tz3SafeNumber(r.durationSec, durationTrafficSec));
  const durationMin = tz3Round(durationTrafficSec / 60, 1);
  const baseDurationMin = tz3Round(durationSec / 60, 1);
  const distanceKm = tz3Round(tz3SafeNumber(r.distanceKm, tz3SafeNumber(r.distance, 0) / 1000), 1);

  const stopsCount = Math.max(0, Math.round(tz3SafeNumber(r.stopsCount, tz3SafeNumber(r.turnsCount, 0))));
  const trafficScore = Math.max(0, Math.min(1, tz3SafeNumber(r.trafficScore, 0)));
  const complexityScore = Math.max(0, Math.min(1, tz3SafeNumber(r.complexityScore, 0)));

  const delaySec = Math.max(0, durationTrafficSec - durationSec);
  const delayMin = tz3Round(delaySec / 60, 1);

  const stepSig = tz3StepDerivedSignals(r);
  const laneHints = stepSig.laneHints;
  const heavyJunctionSteps = stepSig.heavyJunctionSteps;

  // MVP formula for ТЗ-3: all values are in comparable penalty points.
  const timeComponent = durationTrafficSec / 60;
  const trafficPenalty = trafficScore * 18;
  const stopsPenalty = stopsCount * 0.7;
  const complexityPenalty = complexityScore * 12;
  const delayPenalty = delayMin * 0.9;

  // Keep already existing UAE/local logic alive if old helpers can detect tolls/highway.
  const tollCost = typeof _tz2TollCost === "function" ? tz3SafeNumber(_tz2TollCost(r), 0) : 0;
  const tollPenalty = tollCost > 0 ? 6 : 0;

  const rawTotal = timeComponent + trafficPenalty + stopsPenalty + complexityPenalty + delayPenalty + tollPenalty;
  const score = tz3Round(rawTotal, 1);

  const trafficLevel = trafficScore >= 0.45 ? 3 : trafficScore >= 0.2 ? 2 : 1;
  const trafficLabel = trafficScore >= 0.45 ? "heavy" : trafficScore >= 0.2 ? "moderate" : "stable";
  const incidentsCount = delayMin >= 8 ? 1 : 0;
  const stabilityScore = Math.max(0, Math.round(100 - trafficPenalty * 2.2 - complexityPenalty * 2.5 - delayPenalty * 1.3));
  // Stress (0–100): turns / junction complexity / lane changes dominate; traffic weighted lower than turns.
  const stressScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        stopsCount * 2.05 +
          complexityScore * 20 +
          laneHints * 1.35 +
          heavyJunctionSteps * 1.05 +
          trafficScore * 7.5
      )
    )
  );
  // Uncapped scalar for CALM mode ordering (lower = easier drive).
  const calmStressScore = tz3Round(
    stopsCount * 2.75 + complexityScore * 24 + laneHints * 1.85 + heavyJunctionSteps * 1.15 + trafficScore * 5.5,
    2
  );

  const breakdown = {
    total: score,
    formula: "durationTrafficMin + trafficPenalty + stopsPenalty + complexityPenalty + delayPenalty + tollPenalty",
    durationSec,
    durationTrafficSec,
    durationMin,
    baseDurationMin,
    distanceKm,
    delaySec,
    delayMin,
    stopsCount,
    turns: stopsCount,
    trafficScore,
    trafficRank: trafficLevel,
    complexityScore,
    timeComponent: tz3Round(timeComponent, 1),
    trafficPenalty: tz3Round(trafficPenalty, 1),
    stopsPenalty: tz3Round(stopsPenalty, 1),
    turnsPenalty: tz3Round(stopsPenalty, 1),
    complexityPenalty: tz3Round(complexityPenalty, 1),
    delayPenalty: tz3Round(delayPenalty, 1),
    tollCost,
    tollPenalty,
    stressScore,
    stabilityScore,
    laneHints,
    heavyJunctionSteps,
    calmStressScore
  };

  return {
    id: r.id || ("route-" + r.index),
    googleRouteIndex: r.index,
    title: typeof _tz1RouteName === "function" ? _tz1RouteName(r) : (r.summary || ("Route " + ((r.index || 0) + 1))),
    durationMin,
    distanceKm,
    trafficLevel,
    trafficLabel: typeof _tz2TrafficLabel === "function" ? _tz2TrafficLabel({ ...r, traffic: trafficLabel }) : trafficLabel,
    stopsCount,
    turnsCount: stopsCount,
    incidentsCount,
    tolls: tollCost > 0,
    score,
    scoreBreakdown: breakdown,
    trafficPenalty: breakdown.trafficPenalty,
    stopsPenalty: breakdown.stopsPenalty,
    incidentsPenalty: incidentsCount ? 4 : 0,
    complexityPenalty: breakdown.complexityPenalty,
    tollPenalty: breakdown.tollPenalty,
    delayPenalty: breakdown.delayPenalty,
    stressScore,
    calmStressScore,
    drivePersonality: typeof getDrivePersonality === "function" ? getDrivePersonality({ ...r, stressScore }) : "Steady drive",
    stabilityScore
  };
}

function scoreRoutes(routes) {
  if (!Array.isArray(routes)) return [];
  return routes.map(function(route) {
    return Object.assign(route, scoreRoute(route, routes));
  });
}

function validateScoredRoutes(routes) {
  if (!Array.isArray(routes) || routes.length === 0) {
    return { ok: false, message: "No scored routes" };
  }
  const invalid = routes.find(function(route) {
    if (!route) return true;
    const dm = Number(route.durationMin);
    const dk = Number(route.distanceKm);
    if (!Number.isFinite(dm) || !Number.isFinite(dk)) return true;
    return false;
  });
  if (invalid) {
    return { ok: false, message: "Invalid scored route: " + ((invalid && invalid.id) || "unknown route") };
  }
  return { ok: true, message: "OK" };
}

function calculateRouteScore(r, allRoutes) {
  return scoreRoute(r, allRoutes);
}
