// ТЗ-2 [v17] — голос навигации: старт, повороты, maybeSpeakDriveNavigation (монолит).
// Порядок: внешний <script> после cr-tz1-drive-main-instruction.js — до cr-tz2-normalization-layer.js
// Зависимости: cr-tz1-drive-gps-warnings — getDistanceToStepEndMeters;
// cr-tz1-drive-voice-timed-warnings — buildContextAwareVoicePrompt;
// cr-tz1-drive-main-instruction — formatDriveMeters;
// основной script — speakText, stripHtml, selectedRoute, voiceEnabled, hasSpokenStartNavigation,
// lastKnownUserLatLng, lastDriveGpsMoveMeters, lastVoiceInstructionKey, lastVoiceInstructionAt,
// lastDriveVoiceStepIndex, lastDriveVoicePhase, currentLang, getRouteSummaryName.

// ============================================================
//  FULL VOICE NAVIGATION FIX
//  - AI WHY voice
//  - start navigation voice
//  - turn-by-turn prepare / now prompts
// ============================================================
function getRouteStepsForVoice(routeObj) {
  const r = routeObj || selectedRoute;
  return r?.route?.legs?.[0]?.steps || [];
}

function getStepInstructionText(step) {
  return stripHtml(step?.html_instructions || step?.instructions || "");
}

function getStepDistanceText(step) {
  return step?.distance?.text || "";
}

function isMeaningfulVoiceManeuver(step) {
  if (!step) return false;
  const text = getStepInstructionText(step).toLowerCase();
  const m = String(step.maneuver || "").toLowerCase();
  return /left|right|u-turn|uturn|exit|ramp|merge|fork|keep/.test(text + " " + m);
}

function getVoicePhaseByDistance(distanceMeters) {
  if (distanceMeters == null || !isFinite(distanceMeters)) return "";
  if (distanceMeters <= 100) return "now";
  if (distanceMeters <= 450) return "prepare";
  return "";
}

function buildStartNavigationVoiceText(routeObj) {
  const r = routeObj || selectedRoute;
  const steps = getRouteStepsForVoice(r);
  if (!r || !steps.length) return "";

  const routeName = getRouteSummaryName(r);
  const first = steps[0];
  const firstInstruction = getStepInstructionText(first);
  const firstDistance = getStepDistanceText(first);

  if (currentLang === "ru") {
    return "Начинайте движение" + (routeName ? " по маршруту через " + routeName : "") + ". " +
      (firstInstruction ? "Сначала: " + firstInstruction + (firstDistance ? ", примерно " + firstDistance : "") + "." : "Следуйте по маршруту.");
  }
  if (currentLang === "ua") {
    return "Починайте рух" + (routeName ? " маршрутом через " + routeName : "") + ". " +
      (firstInstruction ? "Спочатку: " + firstInstruction + (firstDistance ? ", приблизно " + firstDistance : "") + "." : "Рухайтесь за маршрутом.");
  }
  if (currentLang === "ar") {
    return "ابدأ القيادة" + (routeName ? " عبر " + routeName : "") + ". " +
      (firstInstruction ? "أولاً: " + firstInstruction + (firstDistance ? "، حوالي " + firstDistance : "") + "." : "اتبع الطريق.");
  }
  return "Start driving" + (routeName ? " via " + routeName : "") + ". " +
    (firstInstruction ? "First, " + firstInstruction + (firstDistance ? " for about " + firstDistance : "") + "." : "Follow the route.");
}

function speakStartNavigation(routeObj) {
  if (!voiceEnabled || hasSpokenStartNavigation) return;
  const text = buildStartNavigationVoiceText(routeObj || selectedRoute);
  if (!text) return;
  hasSpokenStartNavigation = true;
  speakText(text, "normal");
}

function buildTurnVoiceText(step, phase, distanceText) {
  if (!step) return "";
  const base = buildContextAwareVoicePrompt(step, phase) || getStepInstructionText(step);
  if (!base) return "";
  if (currentLang === "ru") {
    return (phase === "now" ? "Сейчас: " : "Подготовьтесь: ") + base + (distanceText && phase !== "now" ? ", через " + distanceText : "");
  }
  if (currentLang === "ua") {
    return (phase === "now" ? "Зараз: " : "Підготуйтеся: ") + base + (distanceText && phase !== "now" ? ", через " + distanceText : "");
  }
  if (currentLang === "ar") {
    return (phase === "now" ? "الآن: " : "استعد: ") + base + (distanceText && phase !== "now" ? "، بعد " + distanceText : "");
  }
  return (phase === "now" ? "Now: " : "Prepare: ") + base + (distanceText && phase !== "now" ? " in " + distanceText : "");
}

function maybeSpeakDriveNavigation(routeObj, stepIndex, timedWarning, laneGuidance) {
  if (!voiceEnabled || !routeObj || !lastKnownUserLatLng) return;
  if (!document.getElementById("drive-mode")?.classList.contains("active")) return;

  const steps = getRouteStepsForVoice(routeObj);
  const step = steps[stepIndex];
  if (!step) return;

  const distanceMeters = getDistanceToStepEndMeters(step, lastKnownUserLatLng);
  let phase = "";
  let type = "maneuver";
  let distanceText = formatDriveMeters(distanceMeters);

  if (laneGuidance && ["prepare", "soon", "now"].includes(laneGuidance.phase)) {
    phase = laneGuidance.phase === "soon" ? "prepare" : laneGuidance.phase;
    type = laneGuidance.type || "lane";
    distanceText = laneGuidance.distanceText || distanceText;
  } else if (timedWarning && ["prepare", "soon", "now"].includes(timedWarning.phase)) {
    phase = timedWarning.phase === "soon" ? "prepare" : timedWarning.phase;
    type = timedWarning.type || "warning";
    distanceText = timedWarning.distanceText || distanceText;
  } else {
    if (!isMeaningfulVoiceManeuver(step)) return;
    phase = getVoicePhaseByDistance(distanceMeters);
    if (!phase) return;
  }

  // Do not speak from GPS jitter. "Prepare" needs real movement; "now" can speak close to maneuver.
  if (phase !== "now" && lastDriveGpsMoveMeters < 25) return;

  const key = stepIndex + ":" + phase + ":" + type;
  const now = Date.now();
  if (key === lastVoiceInstructionKey && now - lastVoiceInstructionAt < 45000) return;
  if (lastDriveVoiceStepIndex === stepIndex && lastDriveVoicePhase === phase && now - lastVoiceInstructionAt < 45000) return;

  const text = buildTurnVoiceText(step, phase, distanceText);
  if (!text) return;

  lastVoiceInstructionKey = key;
  lastVoiceInstructionAt = now;
  lastDriveVoiceStepIndex = stepIndex;
  lastDriveVoicePhase = phase;
  speakText(text, phase === "now" ? "urgent" : "normal");
}
