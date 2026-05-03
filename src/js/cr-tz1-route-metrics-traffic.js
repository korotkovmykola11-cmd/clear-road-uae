// ТЗ-2 [v12] — якорь «HELPERS» + «ROUTE METRICS» (монолит).
// Порядок: внешний <script> после cr-tz1-directions-route-extract.js — до cr-tz1-route-role-segments.js
// (calculateRouteMetrics / trafficRank / stepLooksLikeHighway вызываются из main после полной загрузки страницы).
// Зависимости от main: глобальные function t(…) (i18n) и function stripHtml(…) — объявлены в основном inline <script> раньше по выполнению.

// ============================================================
//  HELPERS
// ============================================================

function normalizeRoadText(step, route) {
  const summary = (route.summary || "");
  const html = stripHtml(step.html_instructions || "");
  return `${summary} ${html}`.toUpperCase();
}

function stepLooksLikeHighway(step, route) {
  const text = normalizeRoadText(step, route);
  return (
    /\bE11\b/.test(text) ||
    /\bE311\b/.test(text) ||
    /\bE611\b/.test(text) ||
    text.includes("SHEIKH") ||
    text.includes("HIGHWAY") ||
    text.includes("EXPRESSWAY")
  );
}

function getTrafficLevel(base, traffic) {
  if (!traffic || !base || traffic <= base) return "low";
  const ratio = (traffic - base) / base;
  if (ratio <= 0.05) return "low";
  if (ratio <= 0.15) return "medium";
  return "high";
}

function trafficRank(level) {
  if (level === "low") return 1;
  if (level === "medium") return 2;
  return 3;
}

function getTrafficText(traffic) {
  if (traffic === "low") return t("traf_stable");
  if (traffic === "medium") return t("traf_moderate");
  return t("traf_heavy");
}

function toTitleCaseLabel(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getStabilityLabel(stabilityScore) {
  if (stabilityScore >= 70) return t("stab_very");
  if (stabilityScore >= 50) return t("stab_stable");
  if (stabilityScore >= 30) return t("stab_moderate");
  return t("stab_unpred");
}

function isMeaningfulManeuver(step, route) {
  if (!step) return false;
  const html = stripHtml(step.html_instructions || "").toLowerCase();
  const maneuver = (step.maneuver || "").toLowerCase();
  const strong = ["turn-left", "turn-right", "uturn-left", "uturn-right", "roundabout"];
  if (strong.some(m => maneuver.includes(m))) return true;
  if (
    html.includes("exit") ||
    html.includes("keep right") ||
    html.includes("keep left") ||
    html.includes("ramp") ||
    html.includes("merge")
  ) return true;
  if (html.includes("continue") || html.includes("slight")) return false;
  return false;
}

function countComplexity(leg, route) {
  return leg.steps.filter(s => isMeaningfulManeuver(s, route)).length;
}

function calculateHighwayShare(leg, route) {
  const total = leg.distance?.value || 0;
  if (!total) return 0;
  let hwDistance = 0;
  leg.steps.forEach(step => {
    if (stepLooksLikeHighway(step, route)) {
      hwDistance += step.distance?.value || 0;
    }
  });
  return hwDistance / total;
}

function getDisplayMinutes(route) {
  return Math.round(route.time / 60);
}

function getDisplayDiff(routeA, routeB) {
  return getDisplayMinutes(routeA) - getDisplayMinutes(routeB);
}

function getRouteSummaryName(route) {
  const summary = route.route.summary || "";
  if (summary.includes("E311")) return "E311";
  if (summary.includes("E11")) return "E11";
  if (summary.includes("E611")) return "E611";
  if (summary.includes("Sheikh Zayed")) return "Sheikh Zayed Rd";
  return summary.split("/")[0].trim() || `Route ${route.displayIndex}`;
}

// ============================================================
//  ROUTE METRICS
// ============================================================

function calculateRouteMetrics(route, leg, rawRoute) {
  const baseTime = leg.duration.value;
  const time = leg.duration_in_traffic?.value || baseTime;
  const distance = leg.distance.value;
  const delaySeconds = Math.max(0, time - baseTime);
  const delayMinutes = Math.round(delaySeconds / 60);
  const complexity = countComplexity(leg, rawRoute);
  const highwayShare = calculateHighwayShare(leg, rawRoute);
  const traffic = getTrafficLevel(baseTime, time);

  // Road tolls: TZ4 UAE layer sets Dubai Salik / Darb from route text + trip — not from highway share
  // (highway-based guess caused false Salik e.g. Sharjah ↔ Ajman).
  const tollCount = 0;
  const tollCost = 0;
  const hasToll = false;

  return {
    time,
    baseTime,
    distance,
    delaySeconds,
    delayMinutes,
    complexity,
    highwayShare,
    traffic,
    highway: highwayShare >= 0.35,
    tollCount,
    tollCost,
    hasToll
  };
}

function calculateDriveStress(route) {
  let stress = 0;

  stress += (route.complexity || 0) * 0.55;
  stress += (route.delayMinutes || 0) * 0.9;
  stress += route.traffic === "high" ? 5 : route.traffic === "medium" ? 2 : 0;
  stress += route.highway ? 0 : 1.5;

  if ((route.highwayShare || 0) < 0.25) stress += 1.5;
  if ((route.complexity || 0) >= 12) stress += 2;
  if ((route.delayMinutes || 0) >= 6) stress += 2;

  return Math.round(stress * 10) / 10;
}

function getDrivePersonality(route) {
  const stress = route.stressScore || 0;
  const turns = route.complexity || 0;
  const delay = route.delayMinutes || 0;
  const highwayShare = route.highwayShare || 0;

  if (stress <= 6 && highwayShare >= 0.5 && turns <= 8) {
    return t("stress_smooth");
  }

  if (stress <= 9 && delay <= 3) {
    return t("stress_steady");
  }

  if (stress <= 12) {
    return t("stress_active");
  }

  if (turns >= 12 || delay >= 6) {
    return t("stress_stressful");
  }

  return t("stress_busy");
}

function getStressBadge(stressScore) {
  if (stressScore <= 6) {
    return { label: "Low stress", tone: "low" };
  }
  if (stressScore <= 10) {
    return { label: "Medium stress", tone: "medium" };
  }
  return { label: "High stress", tone: "high" };
}
