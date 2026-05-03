// ТЗ-2 [v19] — текст/иконка главной подсказки в Drive HUD (монолит).
// Порядок: внешний <script> после cr-tz1-drive-upcoming-condition.js — до cr-tz1-drive-voice-nav-turns.js
// Зависимости: cr-tz1-drive-gps-warnings — getStepWarningMeta, getDistanceToStepEndMeters, getEffectiveDistanceToStepMeters, getWarningPhaseForType;
// cr-tz1-drive-lane-timed-hud — buildLaneGuidanceText; cr-tz1-route-metrics-traffic — getRouteSummaryName;
// основной script — lastKnownUserLatLng, stripHtml.

function getDriveIcon(maneuver) {
  const m = (maneuver || "").toLowerCase();
  if (m.includes("uturn")) return "↺";
  if (m.includes("left")) return "←";
  if (m.includes("right")) return "→";
  if (m.includes("merge")) return "⇢";
  if (m.includes("ramp")) return "↗";
  return "↑";
}

function formatDriveMeters(meters) {
  if (meters == null || !isFinite(meters)) return "Ahead";
  if (meters <= 25) return "Now";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getStepActionText(step, routeObj) {
  const meta = getStepWarningMeta(step, routeObj?.route || routeObj);
  const instruction = stripHtml(step?.html_instructions || "");
  const m = (step?.maneuver || "").toLowerCase();
  if (meta?.shortText) return meta.shortText;
  if (m.includes("turn-left")) return "Turn left";
  if (m.includes("turn-right")) return "Turn right";
  if (m.includes("uturn")) return "Make a U-turn";
  if (m.includes("merge")) return "Merge ahead";
  if (m.includes("ramp")) return "Take the ramp";
  if (instruction) return instruction;
  return "Follow the route";
}

function getNextMeaningfulDriveAction(r, stepIndex, userLatLng) {
  const steps = r?.route?.legs?.[0]?.steps || [];
  for (let i = stepIndex; i < Math.min(steps.length, stepIndex + 5); i++) {
    const meta = getStepWarningMeta(steps[i], r.route);
    if (!meta) continue;
    const meters = getEffectiveDistanceToStepMeters(steps, stepIndex, i, userLatLng);
    return { index: i, step: steps[i], meta, meters, distanceText: formatDriveMeters(meters), actionText: meta.shortText || getStepActionText(steps[i], r) };
  }
  return null;
}

function getCleanDriveMainInstruction(r, stepIndex, vm) {
  const steps = r?.route?.legs?.[0]?.steps || [];
  const currentStep = steps[stepIndex];
  const meta = getStepWarningMeta(currentStep, r.route);
  const currentMeters = getDistanceToStepEndMeters(currentStep, lastKnownUserLatLng);
  const currentPhase = meta ? getWarningPhaseForType(currentMeters, meta.type) : "none";
  if (meta && currentPhase !== "none") {
    return { text: buildLaneGuidanceText(meta, currentPhase) || meta.shortText, distance: formatDriveMeters(currentMeters), icon: meta.icon || getDriveIcon(vm.maneuver || "") };
  }
  const upcoming = getNextMeaningfulDriveAction(r, stepIndex, lastKnownUserLatLng);
  if (upcoming) return { text: upcoming.actionText, distance: upcoming.distanceText, icon: upcoming.meta.icon || getDriveIcon(vm.maneuver || "") };
  const raw = stripHtml(vm.instruction || "");
  const isGeneric = !raw || /^(head|continue|follow|drive|go)\b/i.test(raw);
  const routeName = getRouteSummaryName(r);
  return { text: isGeneric && routeName ? `Continue via ${routeName}` : raw || "Follow the route", distance: vm.instructionDistance || "", icon: getDriveIcon(vm.maneuver || "") };
}
