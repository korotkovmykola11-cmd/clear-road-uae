// ТЗ-2 [v13] — якорь «ROUTE ROLE CLASSIFICATION» + «ROUTE SEGMENTS» (монолит).
// Порядок: внешний <script> после cr-tz1-route-metrics-traffic.js — до cr-tz1-drive-gps-warnings.js
// (getDisplayDiff, trafficRank, stepLooksLikeHighway, isMeaningfulManeuver — из cr-tz1-route-metrics-traffic.js).
// Зависимостей от main нет (чистые функции над объектами маршрута).

// ============================================================
//  ROUTE ROLE CLASSIFICATION
// ============================================================

function getRouteRole(r, bestRoute, fastestRoute, allRoutes) {
  if (r.index === bestRoute.index) return "recommended";

  const diffFromBest = getDisplayDiff(r, bestRoute);
  const isFaster = diffFromBest < 0;
  const isSlower = diffFromBest > 0;

  const hasMoreTraffic = trafficRank(r.traffic) > trafficRank(bestRoute.traffic);
  const hasMoreDelay = r.delayMinutes > bestRoute.delayMinutes + 2;
  const isRiskier = hasMoreTraffic || hasMoreDelay;

  const fewerTurns = r.complexity < bestRoute.complexity - 1;
  const lighterTraffic = trafficRank(r.traffic) < trafficRank(bestRoute.traffic);
  const isMoreRelaxed = fewerTurns || lighterTraffic;

  const timeSimilar = Math.abs(diffFromBest) <= 1;
  const complexitySimilar = Math.abs(r.complexity - bestRoute.complexity) <= 2;
  const trafficSimilar = trafficRank(r.traffic) === trafficRank(bestRoute.traffic);
  const isSimilar = timeSimilar && complexitySimilar && trafficSimilar;

  if (isFaster && isRiskier) return "faster_risky";
  if (isSlower && isMoreRelaxed) return "more_relaxed";
  if (isSimilar) return "similar";
  return "balanced";
}

// ============================================================
//  DECISION LOGIC — SELECT RECOMMENDED ROUTE
// ============================================================

// ── Confidence helper: practical, decision-aligned (matches selectBestRoute logic) ──
// HIGH   = obvious human choice (free vs slightly faster paid, lower traffic, lower delay, or dominant)
// MEDIUM = real trade-off (faster alt exists but worse on cost/stability)
// LOW    = routes are genuinely interchangeable on all dimensions

// ============================================================
//  ROUTE SEGMENTS (for Route Details modal)
// ============================================================

function buildRouteSegments(r) {
  const leg = r.route.legs[0];
  const steps = leg.steps;
  const segments = [];

  let currentSegment = null;
  let segmentSteps = [];

  steps.forEach((step, i) => {
    const isHw = stepLooksLikeHighway(step, r.route);
    const isMeaningful = isMeaningfulManeuver(step, r.route);

    let type = isHw ? "highway" : "city";

    if (!isHw && isMeaningful) {
      const nearbyManeuvers = steps.slice(Math.max(0, i - 2), i + 3)
        .filter(s => isMeaningfulManeuver(s, r.route)).length;
      if (nearbyManeuvers >= 3) type = "turns";
    }

    if (!currentSegment || currentSegment.type !== type) {
      if (currentSegment && segmentSteps.length > 0) {
        currentSegment.distance = segmentSteps.reduce((sum, s) => sum + (s.distance?.value || 0), 0);
        currentSegment.duration = segmentSteps.reduce((sum, s) => sum + (s.duration?.value || 0), 0);
        segments.push(currentSegment);
      }
      currentSegment = { type, steps: [] };
      segmentSteps = [];
    }

    segmentSteps.push(step);
    currentSegment.steps = segmentSteps;
  });

  if (currentSegment && segmentSteps.length > 0) {
    currentSegment.distance = segmentSteps.reduce((sum, s) => sum + (s.distance?.value || 0), 0);
    currentSegment.duration = segmentSteps.reduce((sum, s) => sum + (s.duration?.value || 0), 0);
    segments.push(currentSegment);
  }

  const mergedSegments = [];
  segments.forEach(seg => {
    if (seg.distance < 500 && mergedSegments.length > 0) {
      const prev = mergedSegments[mergedSegments.length - 1];
      prev.distance += seg.distance;
      prev.duration += seg.duration;
    } else {
      mergedSegments.push(seg);
    }
  });

  if (r.delayMinutes > 3 && mergedSegments.length > 0) {
    const citySegment = mergedSegments.find(s => s.type === "city");
    if (citySegment) citySegment.type = "traffic";
  }

  return mergedSegments.map(seg => {
    const km = (seg.distance / 1000).toFixed(1);
    const mins = Math.round(seg.duration / 60);
    const labels = {
      highway: { icon: "&#128739;", title: "Highway section", note: "stable flow" },
      city: { icon: "&#127961;", title: "City driving", note: "urban roads" },
      traffic: { icon: "&#128679;", title: "Congested area", note: "expect delays" },
      turns: { icon: "&#128260;", title: "Complex section", note: "multiple turns" }
    };
    const label = labels[seg.type] || labels.city;
    return {
      type: seg.type,
      icon: label.icon,
      title: label.title,
      details: `${km} km · ~${mins} min · ${label.note}`,
      distance: seg.distance,
      duration: seg.duration
    };
  });
}
