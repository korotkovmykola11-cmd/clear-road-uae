// ТЗ-2 [v18] — выбор timed warning + lane guidance для HUD (монолит).
// Порядок: внешний <script> после cr-tz1-drive-voice-timed-warnings.js — до cr-tz1-drive-upcoming-condition.js
// Зависимости: cr-tz1-drive-gps-warnings — getStepWarningMeta, getEffectiveDistanceToStepMeters,
// isComplexInterchangeAhead, getWarningPhaseForType; cr-tz1-drive-voice-timed-warnings — buildTimedWarning;
// основной script — lastKnownUserLatLng, t().

let heldTimedWarning = null;
let heldTimedWarningUntil = 0;
let lastPhaseChangeAt = 0;
let lastStableTimedPhase = "";
let _laneGuidanceHeld = null;
let _laneGuidanceHeldUntil = 0;

function getDriveTimedWarning(r, stepIndex) {
  const steps = r?.route?.legs?.[0]?.steps || [];
  const ulng = lastKnownUserLatLng;
  if (!steps.length) return null;

  const candidates = [];
  const phaseRank = { now: 3, soon: 2, prepare: 1, none: 0 };
  const typePriority = { exit: 6, ramp: 6, fork: 6, lane: 5, merge: 4, uturn: 3, interchange: 1 };

  for (let i = stepIndex; i < Math.min(steps.length, stepIndex + 6); i++) {
    const step = steps[i];
    const meta = getStepWarningMeta(step, r.route);
    if (!meta) continue;

    const meters = getEffectiveDistanceToStepMeters(steps, stepIndex, i, ulng);
    const timed = buildTimedWarning(meta, step, ulng, meters);
    if (!timed) continue;

    candidates.push({
      timed,
      phaseScore: phaseRank[timed.phase] || 0,
      typeScore: typePriority[timed.type] || 0,
      meters: Number.isFinite(meters) ? meters : 999999
    });
  }

  if (candidates.length) {
    candidates.sort(function(a, b) {
      if (b.typeScore !== a.typeScore) return b.typeScore - a.typeScore;
      if (b.phaseScore !== a.phaseScore) return b.phaseScore - a.phaseScore;
      return a.meters - b.meters;
    });
    return candidates[0].timed;
  }

  if (isComplexInterchangeAhead(steps, stepIndex, r.route, ulng)) {
    return {
      type: "interchange",
      icon: "⚠",
      phase: "prepare",
      shortText: "Complex interchange ahead",
      longText: "Complex interchange ahead — stay focused for lane choice",
      distanceText: "Ahead"
    };
  }

  return null;
}

function getHeldTimedWarning(timedWarning) {
  const now = Date.now();

  if (!timedWarning) {
    if (heldTimedWarning && now < heldTimedWarningUntil) {
      return heldTimedWarning;
    }
    heldTimedWarning = null;
    heldTimedWarningUntil = 0;
    return null;
  }

  const nextPhase = timedWarning.phase || "";
  const currentPhase = lastStableTimedPhase || "";

  if (nextPhase !== currentPhase) {
    if (now - lastPhaseChangeAt < 1800 && currentPhase) {
      if (heldTimedWarning && now < heldTimedWarningUntil) {
        return heldTimedWarning;
      }
    }
    lastPhaseChangeAt = now;
    lastStableTimedPhase = nextPhase;
  }

  heldTimedWarning = timedWarning;
  heldTimedWarningUntil = now + 2500;

  return heldTimedWarning;
}

function buildLaneGuidanceText(meta, phase) {
  const type = meta?.type || "";
  const base = meta?.shortText || "";
  const laneHint = meta?.laneHint || "";

  if (type === "exit") {
    if (phase === "prepare") return laneHint ? `${laneHint} — exit ahead` : base.replace("ahead", "").trim();
    if (phase === "soon") return laneHint ? `${laneHint} — exit soon` : base;
    if (phase === "now") return t("lg_exit_now");
  }

  if (type === "ramp") {
    if (phase === "prepare") return laneHint ? `${laneHint} — ramp ahead` : base.replace("ahead", "").trim();
    if (phase === "soon") return laneHint ? `${laneHint} — ramp soon` : base;
    if (phase === "now") return t("lg_ramp_now");
  }

  if (type === "fork") {
    if (phase === "prepare") return laneHint ? `${laneHint} — fork ahead` : base;
    if (phase === "soon") return laneHint ? `${laneHint} — fork soon` : base;
    if (phase === "now") {
      if (base.toLowerCase().includes("left")) return "Fork left now";
      if (base.toLowerCase().includes("right")) return "Fork right now";
      return "Take the fork now";
    }
  }

  if (type === "lane") {
    if (phase === "prepare") return laneHint || base;
    if (phase === "soon") return laneHint || base;
    if (phase === "now") {
      if (base.toLowerCase().includes("left")) return "Keep left now";
      if (base.toLowerCase().includes("right")) return "Keep right now";
      return "Use the correct lane now";
    }
  }

  if (type === "merge") {
    if (phase === "prepare") return laneHint || "Prepare to merge";
    if (phase === "soon") return laneHint || "Merge ahead";
    if (phase === "now") return "Merge now";
  }

  return laneHint || base;
}

function getDriveLaneGuidance(r, stepIndex, userLatLng) {
  const steps = r.route.legs[0].steps;
  const ulng = userLatLng || lastKnownUserLatLng;
  const now = Date.now();

  const candidates = [];

  for (let i = stepIndex; i < Math.min(steps.length, stepIndex + 4); i++) {
    const step = steps[i];
    const meta = getStepWarningMeta(step, r.route);
    if (!meta) continue;

    if (!["lane", "exit", "ramp", "merge", "fork"].includes(meta.type)) continue;

    const meters = getEffectiveDistanceToStepMeters(steps, stepIndex, i, ulng);
    const phase = getWarningPhaseForType(meters, meta.type);
    if (phase === "none") continue;

    const priority =
      meta.type === "exit" || meta.type === "ramp" || meta.type === "fork" ? 3 :
      meta.type === "lane" ? 2 :
      meta.type === "merge" ? 1 : 0;

    candidates.push({
      stepIndex: i,
      type: meta.type,
      phase,
      priority,
      meters,
      icon: meta.icon,
      shortText: buildLaneGuidanceText(meta, phase),
      text: buildLaneGuidanceText(meta, phase),
      distanceText:
        meters == null
          ? "Ahead"
          : meters <= 60
            ? "Now"
            : meters < 1000
              ? `${Math.round(meters / 10) * 10} m`
              : `${(meters / 1000).toFixed(1)} km`
    });
  }

  if (!candidates.length) {
    if (_laneGuidanceHeld && now < _laneGuidanceHeldUntil) {
      return _laneGuidanceHeld;
    }
    _laneGuidanceHeld = null;
    _laneGuidanceHeldUntil = 0;
    return null;
  }

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const phaseRank = { now: 3, soon: 2, prepare: 1 };
    if (phaseRank[b.phase] !== phaseRank[a.phase]) return phaseRank[b.phase] - phaseRank[a.phase];
    return (a.meters ?? 999999) - (b.meters ?? 999999);
  });

  const best = candidates[0];

  if (_laneGuidanceHeld && now < _laneGuidanceHeldUntil) {
    const sameType = _laneGuidanceHeld.type === best.type;
    const samePhase = _laneGuidanceHeld.phase === best.phase;

    if (sameType && samePhase) {
      return _laneGuidanceHeld;
    }

    const heldPriority =
      _laneGuidanceHeld.type === "exit" || _laneGuidanceHeld.type === "ramp" || _laneGuidanceHeld.type === "fork" ? 3 :
      _laneGuidanceHeld.type === "lane" ? 2 :
      _laneGuidanceHeld.type === "merge" ? 1 : 0;

    if (heldPriority > best.priority) {
      return _laneGuidanceHeld;
    }
  }

  _laneGuidanceHeld = best;
  _laneGuidanceHeldUntil = now + 2200;
  return best;
}
