// ТЗ-2 [v14] — якорь «DRIVE MODE» + «GPS / LIVE POSITION» + предупреждения шагов (монолит).
// Порядок: внешний <script> после cr-tz1-route-role-segments.js — до cr-tz1-drive-voice-timed-warnings.js
// Зависимости: cr-tz1-route-metrics-traffic.js — getTrafficText, stripHtml, normalizeRoadText, getRouteSummaryName, stepLooksLikeHighway;
// основной script — lastKnownUserLatLng, lastRouteDistanceMeters, lastGpsAccuracyMeters, lastGpsStatusText, currentStepIndex,
// DRIVE_GPS_MAX_ACCURACY_M, DRIVE_OFF_ROUTE_GRACE_MS, DRIVE_OFF_ROUTE_REROUTE_COOLDOWN_MS, offRouteSince, lastOffRouteRecalcAt,
// offRouteRecalcInProgress, isUserOffRoute(…); google.maps.geometry после загрузки Maps.

function getWarningPhaseForType(distanceMeters, type = "") {
  if (distanceMeters == null || !isFinite(distanceMeters)) return "none";
  const meters = Math.max(0, Number(distanceMeters));
  const t = String(type || "").toLowerCase();
  const isExitLike = ["exit", "ramp", "fork"].includes(t);
  const isLaneLike = ["lane", "merge"].includes(t);
  const isUTurn = t === "uturn";

  if (isExitLike) {
    if (meters <= 180) return "now";
    if (meters <= 700) return "soon";
    if (meters <= 1400) return "prepare";
    return "none";
  }
  if (isLaneLike) {
    if (meters <= 140) return "now";
    if (meters <= 520) return "soon";
    if (meters <= 1100) return "prepare";
    return "none";
  }
  if (isUTurn) {
    if (meters <= 120) return "now";
    if (meters <= 450) return "soon";
    if (meters <= 900) return "prepare";
    return "none";
  }
  if (meters <= 100) return "now";
  if (meters <= 350) return "soon";
  if (meters <= 800) return "prepare";
  return "none";
}

// ============================================================
//  DRIVE MODE
// ============================================================

function buildDriveViewModel(r, stepIndex) {
  const leg = r.route.legs[0];
  const steps = leg.steps;
  const currentStep = steps[stepIndex] || steps[0];

  const liveMeters = getLiveRemainingMeters(r, stepIndex, lastKnownUserLatLng);
  const liveSeconds = getLiveRemainingSeconds(r, stepIndex, lastKnownUserLatLng);

  let remainingDistance = Number.isFinite(liveMeters) ? liveMeters : 0;
  let remainingTime = Number.isFinite(liveSeconds) ? liveSeconds : 0;

  if (!Number.isFinite(liveMeters) || !Number.isFinite(liveSeconds)) {
    for (let i = stepIndex; i < steps.length; i++) {
      remainingDistance += steps[i].distance?.value || 0;
      remainingTime += steps[i].duration?.value || 0;
    }
  }

  lastRouteDistanceMeters = remainingDistance;

  return {
    eta: Math.max(1, Math.round(remainingTime / 60)),
    distance: (remainingDistance / 1000).toFixed(1),
    traffic: r.traffic,
    trafficText: getTrafficText(r.traffic),
    instruction: stripHtml(currentStep?.html_instructions || "Follow the route"),
    instructionDistance: currentStep?.distance?.text || "",
    maneuver: currentStep?.maneuver || "",
    stepIndex,
    totalSteps: steps.length
  };
}


// ============================================================
//  ТЗ5 — GPS / LIVE POSITION BINDING HELPERS
//  Real GPS position drives marker, remaining distance, next action,
//  off-route detection and soft reroute. No UI/CSS redesign.
// ============================================================
function isDriveGpsUsable(pos) {
  if (!pos || !pos.coords) return false;
  const acc = Number(pos.coords.accuracy);
  lastGpsAccuracyMeters = Number.isFinite(acc) ? acc : null;
  if (!Number.isFinite(acc)) return true;
  return acc <= DRIVE_GPS_MAX_ACCURACY_M;
}

function formatGpsAccuracy() {
  if (!Number.isFinite(lastGpsAccuracyMeters)) return "";
  return " · ±" + Math.round(lastGpsAccuracyMeters) + "m";
}

function getLiveRemainingMeters(routeObj, stepIndex, userLatLng) {
  const steps = routeObj?.route?.legs?.[0]?.steps || [];
  if (!steps.length) return null;

  const safeIndex = Math.min(Math.max(0, stepIndex || 0), steps.length - 1);
  let meters = 0;

  if (userLatLng) {
    const currentEnd = getDistanceToStepEndMeters(steps[safeIndex], userLatLng);
    meters += Number.isFinite(currentEnd) ? Math.max(0, currentEnd) : (steps[safeIndex]?.distance?.value || 0);
  } else {
    meters += steps[safeIndex]?.distance?.value || 0;
  }

  for (let i = safeIndex + 1; i < steps.length; i++) {
    meters += steps[i]?.distance?.value || 0;
  }

  return meters;
}

function getLiveRemainingSeconds(routeObj, stepIndex, userLatLng) {
  const steps = routeObj?.route?.legs?.[0]?.steps || [];
  if (!steps.length) return null;

  const safeIndex = Math.min(Math.max(0, stepIndex || 0), steps.length - 1);
  let seconds = 0;
  const step = steps[safeIndex];

  const stepDistance = step?.distance?.value || 0;
  const stepDuration = step?.duration?.value || 0;

  if (userLatLng && stepDistance > 0 && stepDuration > 0) {
    const currentEnd = getDistanceToStepEndMeters(step, userLatLng);
    const ratio = Number.isFinite(currentEnd)
      ? Math.min(1, Math.max(0.05, currentEnd / stepDistance))
      : 1;
    seconds += stepDuration * ratio;
  } else {
    seconds += stepDuration;
  }

  for (let i = safeIndex + 1; i < steps.length; i++) {
    seconds += steps[i]?.duration?.value || 0;
  }

  return seconds;
}

function buildDriveGpsStatus(routeObj, vm) {
  const base = lastKnownUserLatLng ? "GPS live" : "Waiting for GPS";
  const step = routeObj && vm ? " · Step " + (currentStepIndex + 1) + "/" + vm.totalSteps : "";
  const distance = Number.isFinite(lastRouteDistanceMeters) ? " · " + (lastRouteDistanceMeters / 1000).toFixed(1) + " km left" : "";
  return base + step + distance + formatGpsAccuracy();
}

function updateDriveGpsStatus(routeObj, vm, overrideText) {
  const st = document.getElementById("drive-status");
  if (!st) return;
  lastGpsStatusText = overrideText || buildDriveGpsStatus(routeObj, vm);
  st.textContent = lastGpsStatusText;
}

function shouldTriggerSoftOffRouteReroute(userLatLng, routeObj) {
  if (!userLatLng || !routeObj) return false;
  if (Number.isFinite(lastGpsAccuracyMeters) && lastGpsAccuracyMeters > DRIVE_GPS_MAX_ACCURACY_M) return false;
  if (!isUserOffRoute(userLatLng, routeObj)) {
    offRouteSince = 0;
    return false;
  }

  if (!offRouteSince) offRouteSince = Date.now();

  const now = Date.now();
  if (now - offRouteSince < DRIVE_OFF_ROUTE_GRACE_MS) return false;
  if (now - lastOffRouteRecalcAt < DRIVE_OFF_ROUTE_REROUTE_COOLDOWN_MS) return false;
  if (offRouteRecalcInProgress) return false;

  lastOffRouteRecalcAt = now;
  return true;
}


function getStepWarningMeta(step, route) {
  const html = stripHtml(step?.html_instructions || "");
  const text = html.toLowerCase();
  const maneuver = (step?.maneuver || "").toLowerCase();
  const roadText = normalizeRoadText(step, route);

  const roadMatch =
  roadText.match(/\bE311\b/) ||
  roadText.match(/\bE11\b/) ||
  roadText.match(/\bE611\b/) ||
  roadText.match(/\bE66\b/) ||
  roadText.match(/\bE44\b/) ||
  roadText.match(/\bD\d+\b/);
  const roadName = roadMatch ? roadMatch[0] : getRouteSummaryName({ route });

  // Enhanced lane hints
  const laneHint = extractLaneHint(text);

  if (maneuver.includes("uturn") || text.includes("u-turn"))
    return { type: "uturn", icon: "↩", shortText: "U-turn ahead", longText: "Prepare for U-turn ahead", laneHint };
  if (text.includes("fork right") || maneuver.includes("fork-right"))
    return { type: "fork", icon: "⤴", shortText: `Fork right to ${roadName}`, longText: `Take the right fork toward ${roadName}`, laneHint: laneHint || "Use right lanes" };
  if (text.includes("fork left") || maneuver.includes("fork-left"))
    return { type: "fork", icon: "⤳", shortText: `Fork left to ${roadName}`, longText: `Take the left fork toward ${roadName}`, laneHint: laneHint || "Use left lanes" };
  if (text.includes("fork") || maneuver.includes("fork"))
    return { type: "fork", icon: "⤴", shortText: `Fork ahead to ${roadName}`, longText: `Prepare for fork toward ${roadName}`, laneHint: laneHint || "Choose lane early" };
  if (text.includes("keep right")) return { type: "lane",  icon: "↗", shortText: `Keep right for ${roadName}`,  longText: `Keep right ahead for exit toward ${roadName}`, laneHint: laneHint || "Use right lanes" };
  if (text.includes("keep left"))  return { type: "lane",  icon: "↖", shortText: `Keep left for ${roadName}`,   longText: `Keep left ahead toward ${roadName}`, laneHint: laneHint || "Use left lanes" };
  if (text.includes("exit"))       return { type: "exit",  icon: "⇢", shortText: `Exit ahead to ${roadName}`,   longText: `Prepare for exit toward ${roadName}`, laneHint: laneHint || "Move to exit lane" };
  if (text.includes("ramp"))       return { type: "ramp",  icon: "⇗", shortText: `Ramp ahead to ${roadName}`,   longText: `Take the ramp ahead toward ${roadName}`, laneHint: laneHint || "Use right lane" };
  if (text.includes("merge"))      return { type: "merge", icon: "⇄", shortText: `Merge ahead`,                 longText: `Merge carefully ahead`, laneHint: "Watch for merging traffic" };
  return null;
}

function extractLaneHint(text) {
  // Try to extract lane info from instruction text
  if (text.includes("3 left lanes") || text.includes("three left"))   return "Use 3 left lanes";
  if (text.includes("3 right lanes") || text.includes("three right")) return "Use 3 right lanes";
  if (text.includes("2 left lanes") || text.includes("two left"))     return "Use 2 left lanes";
  if (text.includes("2 right lanes") || text.includes("two right"))   return "Use 2 right lanes";
  if (text.includes("leftmost lane"))    return "Use leftmost lane";
  if (text.includes("rightmost lane"))   return "Use rightmost lane";
  if (text.includes("left lane"))        return "Use left lane";
  if (text.includes("right lane"))       return "Use right lane";
  if (text.includes("middle lane") || text.includes("center lane"))  return "Stay in middle lanes";
  if (text.includes("any lane"))         return "Any lane";
  if (text.includes("stay in lane"))     return "Stay in lane";
  return null;
}

function isComplexInterchangeAhead(steps, currentStepIndex, route, userLatLng = lastKnownUserLatLng) {
  if (!Array.isArray(steps) || !steps.length) return false;

  const startIndex = Math.max(0, currentStepIndex || 0);
  let accumulatedMeters = 0;
  let actionCount = 0;
  let exitLikeCount = 0;
  let mergeLikeCount = 0;
  let highwayActionCount = 0;

  for (let i = startIndex; i < Math.min(steps.length, startIndex + 7); i++) {
    const step = steps[i];
    if (!step) continue;

    const stepMeters = i === startIndex
      ? (getDistanceToStepEndMeters(step, userLatLng) ?? (step.distance?.value || 0))
      : (step.distance?.value || 0);

    accumulatedMeters += Math.max(0, stepMeters || 0);
    if (accumulatedMeters > 2400) break;

    const meta = getStepWarningMeta(step, route);
    if (!meta) continue;

    if (["exit", "ramp", "fork", "lane", "merge"].includes(meta.type)) {
      actionCount++;
      if (["exit", "ramp", "fork"].includes(meta.type)) exitLikeCount++;
      if (["merge", "lane"].includes(meta.type)) mergeLikeCount++;
      if (stepLooksLikeHighway(step, route)) highwayActionCount++;
    }
  }

  // UAE reality: several exit/ramp/fork/merge actions close together usually means
  // a complex interchange where the driver needs lane focus before the actual exit.
  return exitLikeCount >= 2 || (actionCount >= 3 && mergeLikeCount >= 1) || (actionCount >= 2 && highwayActionCount >= 2);
}

function showInterchangeWarning() {
  const interchangeWarn = document.getElementById("drive-interchange-warn");
  if (interchangeWarn) {
    interchangeWarn.classList.add("visible");
  }
}

function getDrivePriorityWarning(r, stepIndex, userLatLng) {
  const steps = r.route.legs[0].steps;
  const ulng = userLatLng || lastKnownUserLatLng;
  const currentStep = steps[stepIndex];

  if (!currentStep) return null;

  const phaseRank    = { now: 3, soon: 2, prepare: 1, none: 0 };
  const typePriority = { exit: 5, ramp: 5, lane: 4, merge: 3, uturn: 2, interchange: 1 };

  // 1. Current step wins if already active
  const currentMeta = getStepWarningMeta(currentStep, r.route);
  if (currentMeta) {
    const currentDist  = getDistanceToStepEndMeters(currentStep, ulng);
    const currentPhase = getWarningPhaseForType(currentDist, currentMeta.type || "");
    if (currentPhase !== "none") {
      return currentMeta;
    }
  }

  // 2. Upcoming steps — score all candidates, pick best
  const candidates = [];

  for (let i = stepIndex + 1; i < Math.min(steps.length, stepIndex + 5); i++) {
    const step = steps[i];
    const meta = getStepWarningMeta(step, r.route);
    if (!meta) continue;

    // Effective distance = remaining current step + full intermediate steps + approach to target
    let effectiveMeters = getDistanceToStepEndMeters(currentStep, ulng) ?? 0;
    for (let j = stepIndex + 1; j < i; j++) {
      effectiveMeters += steps[j]?.distance?.value || 0;
    }
    effectiveMeters += Math.min(step.distance?.value || 0, 180);

    const phase = getWarningPhaseForType(effectiveMeters, meta.type || "");
    if (phase === "none") continue;

    candidates.push({
      meta,
      type:           meta.type,
      phase,
      effectiveMeters,
      typeScore:  typePriority[meta.type] || 0,
      phaseScore: phaseRank[phase]        || 0
    });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      if (b.typeScore  !== a.typeScore)  return b.typeScore  - a.typeScore;
      if (b.phaseScore !== a.phaseScore) return b.phaseScore - a.phaseScore;
      return a.effectiveMeters - b.effectiveMeters;
    });
    return candidates[0].meta;
  }

  // 3. Fallback advisory only if nothing more concrete exists
  if (isComplexInterchangeAhead(steps, stepIndex, r.route)) {
    return {
      type:      "interchange",
      icon:      "⚠",
      shortText: "Complex interchange ahead",
      longText:  "Complex interchange ahead — stay focused for lane choice"
    };
  }

  return null;
}

function parseStepDistanceMeters(step) {
  if (!step?.distance?.value) return null;
  return step.distance.value;
}

function getDistanceToStepEndMeters(step, userLatLng) {
  if (!step?.end_location || !userLatLng) return parseStepDistanceMeters(step);
  return google.maps.geometry.spherical.computeDistanceBetween(
    userLatLng,
    step.end_location
  );
}

function getEffectiveDistanceToStepMeters(steps, currentIndex, targetIndex, userLatLng) {
  if (!steps?.[targetIndex]) return null;
  if (targetIndex === currentIndex) return getDistanceToStepEndMeters(steps[currentIndex], userLatLng);
  let meters = getDistanceToStepEndMeters(steps[currentIndex], userLatLng);
  if (meters == null) meters = steps[currentIndex]?.distance?.value || 0;
  for (let i = currentIndex + 1; i < targetIndex; i++) meters += steps[i]?.distance?.value || 0;
  meters += Math.min(steps[targetIndex]?.distance?.value || 0, 120);
  return meters;
}
