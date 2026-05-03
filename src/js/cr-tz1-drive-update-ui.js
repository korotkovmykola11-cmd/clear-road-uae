// ТЗ-2 [v20] — сглаживание ETA + полный проход updateDriveUI (монолит).
// Порядок: внешний <script> после cr-tz1-tz2-decision-helpers.js — до cr-tz3-score-engine.js
// (нужен _tz1SanitizeAheadIcon из decision helpers; до этого в DOM — drive/voice/lane/main-instruction/nav.)
let _driveDisplayedEtaMin = null;
let _driveEtaSmoothLastAt = 0;

function applySmoothedDriveEta(rawEta) {
  const raw = Math.max(1, Math.round(Number(rawEta)));
  const now = Date.now();
  if (!Number.isFinite(raw)) return "--";
  if (_driveDisplayedEtaMin == null) {
    _driveDisplayedEtaMin = raw;
    _driveEtaSmoothLastAt = now;
    return String(_driveDisplayedEtaMin);
  }
  const diff = raw - _driveDisplayedEtaMin;
  if (Math.abs(diff) >= 2) {
    _driveDisplayedEtaMin = raw;
    _driveEtaSmoothLastAt = now;
  } else if (diff === 1 && now - _driveEtaSmoothLastAt > 12000) {
    _driveDisplayedEtaMin = raw;
    _driveEtaSmoothLastAt = now;
  } else if (diff === -1 && now - _driveEtaSmoothLastAt > 9000) {
    _driveDisplayedEtaMin = raw;
    _driveEtaSmoothLastAt = now;
  }
  return String(_driveDisplayedEtaMin);
}

function updateDriveUI() {
  const r = validateSelectedDriveRoute(selectedRoute || _bestRoute, "updateDriveUI");
  if (!r) return;
  if (lastKnownUserLatLng) currentStepIndex = findBestCurrentStepIndex(r, lastKnownUserLatLng, currentStepIndex);

  const vm = buildDriveViewModel(r, currentStepIndex);
  let timedWarning = getDriveTimedWarning(r, currentStepIndex);
  timedWarning = getHeldTimedWarning(timedWarning);
  const laneGuidance = getDriveLaneGuidance(r, currentStepIndex, lastKnownUserLatLng);
  const stress = getStressBadge(r.stressScore || 0);

  document.getElementById("drive-eta-time").textContent = applySmoothedDriveEta(vm.eta);
  document.getElementById("drive-distance").textContent = vm.distance;
  document.getElementById("drive-traffic").textContent = vm.trafficText;

  const main = getCleanDriveMainInstruction(r, currentStepIndex, vm);
  document.getElementById("drive-next-instruction").textContent = main.text;
  document.getElementById("drive-next-distance").textContent = main.distance;
  document.getElementById("drive-next-icon").textContent = main.icon;

  const realityStrip = document.getElementById("drive-reality-strip");
  const realityMain = document.getElementById("drive-reality-main");
  const realityDist = document.getElementById("drive-reality-distance");
  const nextAction = getNextMeaningfulDriveAction(r, currentStepIndex, lastKnownUserLatLng);
  if (realityStrip && realityMain && realityDist && nextAction) {
    realityStrip.style.display = "flex";
    realityMain.textContent = nextAction.actionText;
    realityDist.textContent = nextAction.distanceText;
  } else if (realityStrip) realityStrip.style.display = "none";

  let condition;
  if (timedWarning) {
    condition = { type: timedWarning.phase === "now" ? "alert" : "warning", icon: timedWarning.icon || "⚠", text: `${timedWarning.shortText || timedWarning.longText || "Action ahead"} · ${timedWarning.distanceText || "Ahead"}` };
  } else if (laneGuidance) {
    condition = { type: laneGuidance.phase === "now" ? "alert" : "warning", icon: laneGuidance.icon || "⇢", text: `${laneGuidance.text || laneGuidance.shortText || "Lane guidance"} · ${laneGuidance.distanceText || "Ahead"}` };
  } else condition = getUpcomingCondition(r, currentStepIndex);
  if (!condition || !condition.text || /calculating conditions/i.test(String(condition.text))) {
    condition = { type: "stable", icon: "☀", text: "Route conditions stable" };
  }

  const aheadIcon = document.getElementById("drive-ahead-icon");
  aheadIcon.innerHTML = _tz1SanitizeAheadIcon(condition.icon);
  aheadIcon.className = `drive-ahead-icon ${condition.type}`;
  document.getElementById("drive-ahead-text").textContent = `${condition.text} · ${stress.label.toLowerCase()} · ${r.drivePersonality || "steady drive"}`;
  updateDriveGpsStatus(r, vm);

  const steps = r.route.legs[0].steps;
  const interchangeWarn = document.getElementById("drive-interchange-warn");
  if (interchangeWarn) {
    const isComplex = isComplexInterchangeAhead(steps, currentStepIndex, r.route);
    const wasVisible = interchangeWarn.classList.contains("visible");
    if (isComplex) showInterchangeWarning(); else interchangeWarn.classList.remove("visible");
    if (isComplex && !wasVisible && voiceEnabled) speakInterchangeWarning();
  }

  const laneBlock = document.getElementById("drive-lane-block");
  const laneIcon = document.getElementById("drive-lane-icon");
  const laneInstruction = document.getElementById("drive-lane-instruction");
  const laneDistance = document.getElementById("drive-lane-distance");
  if (laneBlock && laneIcon && laneInstruction && laneDistance) {
    const shouldShowLane = laneGuidance && ["prepare", "soon", "now"].includes(laneGuidance.phase) && ["exit", "ramp", "fork", "lane", "merge"].includes(laneGuidance.type);
    if (shouldShowLane) {
      laneBlock.style.display = "flex";
      laneBlock.className = "drive-lane-block";
      if (laneGuidance.phase === "prepare" || laneGuidance.phase === "soon") laneBlock.classList.add("lane-warn");
      if (laneGuidance.phase === "now") laneBlock.classList.add("lane-alert");
      laneIcon.textContent = laneGuidance.icon || "⇢";
      laneInstruction.textContent = laneGuidance.text || laneGuidance.shortText || "Use the correct lane";
      laneDistance.textContent = laneGuidance.distanceText || "Ahead";
    } else {
      laneBlock.style.display = "none";
      laneBlock.className = "drive-lane-block";
      laneInstruction.textContent = "";
      laneDistance.textContent = "";
    }
  }

  maybeSpeakDriveNavigation(r, currentStepIndex, timedWarning, laneGuidance);

  lastWarningPhase = timedWarning?.phase || laneGuidance?.phase || "";
}
