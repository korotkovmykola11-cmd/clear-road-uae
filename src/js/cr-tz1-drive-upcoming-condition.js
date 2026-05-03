// ТЗ-2 [v21] — полоса «условия впереди» в Drive / HUD (монолит).
// Порядок: внешний <script> после cr-tz1-drive-lane-timed-hud.js — до cr-tz1-drive-main-instruction.js
// Зависимости: cr-tz1-drive-lane-timed-hud — getDriveTimedWarning;
// cr-tz1-route-metrics-traffic — stepLooksLikeHighway, isMeaningfulManeuver.

function getUpcomingCondition(r, stepIndex) {
  const leg = r.route.legs[0];
  const steps = leg.steps;
  const upcoming = steps.slice(stepIndex, stepIndex + 5);

  const timedWarning = getDriveTimedWarning(r, stepIndex);
  if (timedWarning) {
    return { type: timedWarning.phase === "now" ? "alert" : "warning", icon: timedWarning.icon, text: timedWarning.longText };
  }

  const hasHighway = upcoming.some(s => stepLooksLikeHighway(s, r.route));
  const hasManyTurns = upcoming.filter(s => isMeaningfulManeuver(s, r.route)).length >= 3;
  const isNearEnd = stepIndex >= steps.length - 3;

  if (r.traffic === "high") return { type: "warning", icon: "&#9888;", text: "Heavier traffic ahead" };
  if (hasManyTurns)         return { type: "warning", icon: "&#128260;", text: "Multiple turns ahead" };
  if (isNearEnd)            return { type: "stable",  icon: "&#127937;", text: "Approaching destination" };
  if (hasHighway)           return { type: "stable",  icon: "&#128739;", text: "Highway section ahead — smooth driving" };
  if (r.traffic === "low")  return { type: "stable",  icon: "&#9728;", text: "Stable traffic ahead" };
  return { type: "stable", icon: "&#9728;", text: "Moderate conditions ahead" };
}
