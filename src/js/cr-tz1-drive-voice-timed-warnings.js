// ТЗ-2 [v15] — якорь «timed warnings» + контекстный голос драйва (монолит).
// Порядок: внешний <script> после cr-tz1-drive-gps-warnings.js — до cr-tz1-drive-lane-timed-hud.js
// Зависимости: cr-tz1-drive-gps-warnings.js — getDistanceToStepEndMeters, getWarningPhaseForType;
// основной script — currentLang, t, stripHtml, voiceEnabled, lastSpokenAt, lastSpokenText, buildNativeUtterance.

function getWarningPhase(distanceMeters) {
  return getWarningPhaseForType(distanceMeters, "");
}

function buildTimedWarning(priorityWarning, step, userLatLng, effectiveMeters = null) {
  if (!priorityWarning || !step) return null;

  const meters = Number.isFinite(effectiveMeters) ? effectiveMeters : getDistanceToStepEndMeters(step, userLatLng);
  const phase = getWarningPhaseForType(meters, priorityWarning.type);

  if (phase === "none") return null;

  let distanceText = "Ahead";
  if (meters != null) {
    if (meters <= 60) {
      distanceText = "Now";
    } else if (meters < 1000) {
      distanceText = `${Math.round(meters / 10) * 10} m`;
    } else {
      distanceText = `${(meters / 1000).toFixed(1)} km`;
    }
  }

  let shortText = priorityWarning.shortText;

  if (phase === "prepare") {
    if (priorityWarning.type === "exit" || priorityWarning.type === "ramp") {
      shortText = `Prepare: ${priorityWarning.shortText}`;
    } else if (priorityWarning.type === "lane" || priorityWarning.type === "merge") {
      shortText = `Lane: ${priorityWarning.shortText}`;
    } else if (priorityWarning.type === "uturn") {
      shortText = `Prepare: ${priorityWarning.shortText}`;
    }
  }

  if (phase === "now") {
    if (priorityWarning.type === "exit")  shortText = "Take the exit now";
    if (priorityWarning.type === "ramp")  shortText = "Take the ramp now";
    if (priorityWarning.type === "lane")  shortText = priorityWarning.shortText.replace("ahead", "now");
    if (priorityWarning.type === "merge") shortText = "Merge now";
    if (priorityWarning.type === "uturn") shortText = "Make a U-turn now";
  }

  return {
    ...priorityWarning,
    phase,
    shortText,
    distanceText
  };
}

function normalizeVoiceText(text) {
  let value = String(text || "");
  const roadNames = {
    en: { E311:"E three one one", E611:"E six one one", E11:"E eleven" },
    ru: { E311:"Е три один один", E611:"Е шесть один один", E11:"Е одиннадцать" },
    ua: { E311:"Е три один один", E611:"Е шість один один", E11:"Е одинадцять" },
    ar: { E311:"إي ثلاثة واحد واحد", E611:"إي ستة واحد واحد", E11:"إي أحد عشر" }
  };
  const names = roadNames[currentLang] || roadNames.en;
  return value
    .replace(/\bE311\b/g, names.E311)
    .replace(/\bE611\b/g, names.E611)
    .replace(/\bE11\b/g, names.E11)
    .replace(/\s*[·•]\s*/g, ", ")
    .replace(/\s*→\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}


function getVoicePromptFromTimedWarning(timedWarning) {
  if (!timedWarning) return "";
  if (timedWarning.phase === "prepare") return timedWarning.shortText.replace(/^Prepare:\s*/i, "Prepare to ");
  if (timedWarning.phase === "soon")    return timedWarning.shortText;
  if (timedWarning.phase === "now")     return timedWarning.shortText.replace(/^NOW:\s*/i, "Now ");
  return timedWarning.shortText || "";
}

function buildContextAwareVoicePrompt(step, phase) {
  const html = stripHtml(step?.html_instructions || "");
  const text = html.toLowerCase();
  const maneuver = (step?.maneuver || "").toLowerCase();

  const isUTurn     = maneuver.includes("uturn") || text.includes("u-turn");
  const isKeepLeft  = text.includes("keep left");
  const isKeepRight = text.includes("keep right");
  const isExit      = text.includes("exit");
  const isRamp      = text.includes("ramp");
  const isMerge     = text.includes("merge");
  const isLeft      = text.includes("left") && !isKeepLeft;
  const isRight     = text.includes("right") && !isKeepRight;

  if (phase === "prepare") {
    if (isExit)      return t("tw_prep_exit");
    if (isRamp)      return t("tw_prep_ramp");
    if (isKeepLeft)  return t("tw_prep_keep_left");
    if (isKeepRight) return t("tw_prep_keep_right");
    if (isUTurn)     return t("tw_prep_uturn");
    if (isMerge)     return t("tw_prep_merge");
    if (isLeft)      return t("tw_prep_left");
    if (isRight)     return t("tw_prep_right");
    return t("tw_prep_straight");
  }

  if (phase === "soon") {
    if (isExit)      return t("tw_soon_exit");
    if (isRamp)      return t("tw_soon_ramp");
    if (isKeepLeft)  return t("tw_soon_keep_left");
    if (isKeepRight) return t("tw_soon_keep_right");
    if (isUTurn)     return t("tw_soon_uturn");
    if (isMerge)     return t("tw_soon_merge");
    if (isLeft)      return t("tw_soon_left");
    if (isRight)     return t("tw_soon_right");
    return t("tw_soon_straight");
  }

  if (phase === "now") {
    if (isExit)      return t("tw_now_exit");
    if (isRamp)      return t("tw_now_ramp");
    if (isKeepLeft)  return t("tw_now_keep_left");
    if (isKeepRight) return t("tw_now_keep_right");
    if (isUTurn)     return t("tw_now_uturn");
    if (isMerge)     return t("tw_now_merge");
    if (isLeft)      return t("tw_now_left");
    if (isRight)     return t("tw_now_right");
  }

  return t("tw_now_straight");
}

function getPriority(type) {
  if (type === "exit") return 5;
  if (type === "ramp") return 4;
  if (type === "merge") return 3;
  if (type === "lane") return 2;
  return 1;
}

let _currentHighestPriority = 0;

function speakDriveInstruction(step, phase, instructionType) {
  if (!voiceEnabled || !step) return;
  const text = buildContextAwareVoicePrompt(step, phase);
  
  // TASK 3: Kill straight voice
  if (text && text.toLowerCase().includes("straight")) return;
  
  if (!text || text === "Continue straight") return;
  
  // TASK 2: Priority system - only show instruction if it's highest priority
  const priority = getPriority(instructionType);
  if (priority < _currentHighestPriority) return;
  _currentHighestPriority = priority;
  
  const now = Date.now();
  if (Date.now() - lastSpokenAt < 3500 && lastSpokenText === text) return;
  if (text === lastSpokenText && now - lastSpokenAt < 4500) return;
  try {
    window.speechSynthesis.cancel();
    const utter = buildNativeUtterance(text, "urgent");
    if (!utter) return;
    window.speechSynthesis.speak(utter);
    lastSpokenText = text;
    lastSpokenAt = now;
  } catch (e) { console.warn("speech failed", e); }
}

let _lastInterchangeWarningAt = 0;

function speakInterchangeWarning() {
  const now = Date.now();
  if (now - _lastInterchangeWarningAt < 30000) return; // Don't repeat within 30s
  _lastInterchangeWarningAt = now;
  
  try {
    if ("speechSynthesis" in window) {
      const text = t("interchange_warn") || "Complex interchange ahead. Stay focused.";
      const utter = buildNativeUtterance(text, "urgent");
      if (!utter) return;
      window.speechSynthesis.speak(utter);
    }
  } catch (e) { console.warn("interchange voice failed", e); }
}

function getVoicePromptFromManeuver(vm) {
  if (!vm) return "";
  const m = (vm.maneuver || "").toLowerCase();
  if (!m || m === "straight") return "";
  if (m.includes("uturn"))      return t("ctx_uturn");
  if (m.includes("turn-left"))  return t("ctx_left");
  if (m.includes("turn-right")) return t("ctx_right");
  if (m.includes("keep-left"))  return t("ctx_keep_left");
  if (m.includes("keep-right")) return t("ctx_keep_right");
  if (m.includes("ramp"))       return t("ctx_ramp");
  if (m.includes("fork"))       return t("ctx_fork") || "Take the fork";
  if (m.includes("merge"))      return t("ctx_merge");
  return stripHtml(vm.instruction || "");
}
