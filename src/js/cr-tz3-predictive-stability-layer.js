// ============================================================
//  ТЗ-3 — PREDICTIVE ENGINE STABILITY LAYER
//  Adds reliable "Go now / Wait 15 min" departure advice.
//  Does not change GPS, Drive Mode, route cards or the route engine.
// ============================================================
(function() {
  const TZ3_WAIT_MINUTES = 15;
  const TZ3_MIN_STRONG_DIFF = 3;
  const TZ3_MIN_SOFT_DIFF = 2;

  function tz3SafeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function tz3GetDisplayMinutesSafe(route, fallback) {
    try {
      if (route && typeof getDisplayMinutes === "function") {
        const m = getDisplayMinutes(route);
        if (Number.isFinite(Number(m))) return Number(m);
      }
    } catch (_) {}
    if (route && Number.isFinite(Number(route.time))) return Number(route.time);
    return fallback;
  }

  function tz3MinutesFromResult(result) {
    try {
      const leg = result.routes[0].legs[0];
      const sec = ((leg.duration_in_traffic || leg.duration || {}).value);
      if (Number.isFinite(Number(sec))) return Math.max(1, Math.round(Number(sec) / 60));
    } catch (_) {}
    return null;
  }

  function tz3UaeHour(date) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Dubai",
        hour: "2-digit",
        hour12: false
      }).formatToParts(date);
      const h = parts.find(p => p.type === "hour");
      return h ? Number(h.value) : date.getHours();
    } catch (_) {
      return date.getHours();
    }
  }

  function tz3UaeWeekday(date) {
    try {
      const label = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Dubai",
        weekday: "short"
      }).format(date);
      return label;
    } catch (_) {
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    }
  }

  function tz3TrafficPressure(date) {
    const hour = tz3UaeHour(date);
    const weekday = tz3UaeWeekday(date);
    const isWeekend = weekday === "Sat" || weekday === "Sun";
    if (isWeekend) {
      if (hour >= 18 && hour <= 22) return 1;
      return 0;
    }
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)) return 2;
    if ((hour >= 6 && hour < 7) || (hour >= 10 && hour <= 11) || (hour >= 15 && hour < 17) || (hour > 20 && hour <= 21)) return 1;
    return 0;
  }

  function tz3EstimateLaterMinutes(nowMin) {
    const safeNow = Math.max(1, tz3SafeNumber(nowMin, 1));
    const now = new Date();
    const later = new Date(Date.now() + TZ3_WAIT_MINUTES * 60 * 1000);
    const currentPressure = tz3TrafficPressure(now);
    const laterPressure = tz3TrafficPressure(later);
    let delta = 0;

    if (currentPressure > laterPressure) delta -= Math.max(2, Math.round(safeNow * 0.08));
    else if (currentPressure < laterPressure) delta += Math.max(2, Math.round(safeNow * 0.08));
    else if (currentPressure === 2) delta -= Math.max(1, Math.round(safeNow * 0.04));
    else delta += 0;

    if (_bestRoute && Number.isFinite(Number(_bestRoute.trafficDelayMin))) {
      const delay = Math.max(0, Number(_bestRoute.trafficDelayMin));
      if (currentPressure === 2 && delay >= 5) delta -= Math.min(5, Math.round(delay * 0.35));
    }

    return Math.max(1, safeNow + delta);
  }

  function getDepartureDecision(nowMin, laterMin, waitMinutes = TZ3_WAIT_MINUTES, source = "heuristic") {
    const nowSafe = Math.max(1, tz3SafeNumber(nowMin, 1));
    const laterSafe = Math.max(1, tz3SafeNumber(laterMin, nowSafe));
    const saving = nowSafe - laterSafe;
    const sourceLabel = source === "traffic-api" ? "live traffic forecast" : "UAE timing estimate";

    if (saving >= TZ3_MIN_STRONG_DIFF) {
      return {
        type: "wait",
        waitMinutes,
        nowMin: nowSafe,
        laterMin: laterSafe,
        saving,
        confidence: source === "traffic-api" ? "high" : "medium",
        message: `Wait ${waitMinutes} min → estimated ${laterSafe} min, save ${saving} min`,
        why: `Traffic trend looks better soon · ${sourceLabel}`
      };
    }

    if (saving <= -TZ3_MIN_STRONG_DIFF) {
      return {
        type: "leave_now",
        waitMinutes,
        nowMin: nowSafe,
        laterMin: laterSafe,
        saving: Math.abs(saving),
        confidence: source === "traffic-api" ? "high" : "medium",
        message: `Go now → waiting may add ${Math.abs(saving)} min`,
        why: `Traffic trend may get worse · ${sourceLabel}`
      };
    }

    if (saving >= TZ3_MIN_SOFT_DIFF) {
      return {
        type: "wait",
        waitMinutes,
        nowMin: nowSafe,
        laterMin: laterSafe,
        saving,
        confidence: "medium",
        message: `Wait ${waitMinutes} min → small chance to save ${saving} min`,
        why: `Small timing advantage · ${sourceLabel}`
      };
    }

    return {
      type: "leave_now",
      waitMinutes,
      nowMin: nowSafe,
      laterMin: laterSafe,
      saving: Math.max(0, Math.abs(saving)),
      confidence: source === "traffic-api" ? "medium" : "low",
      message: `Go now → no strong benefit from waiting ${waitMinutes} min`,
      why: `No clear wait advantage · ${sourceLabel}`
    };
  }

  function tz3ApplyPrediction(nowMin, laterMin, source) {
    const nowSafe = Math.max(1, tz3SafeNumber(nowMin, tz3GetDisplayMinutesSafe(_bestRoute, 1)));
    const laterSafe = Math.max(1, tz3SafeNumber(laterMin, nowSafe));
    _predictiveData = {
      waitMinutes: TZ3_WAIT_MINUTES,
      nowMin: nowSafe,
      laterMin: laterSafe,
      saving: nowSafe - laterSafe,
      source: source || "heuristic"
    };
    _departureDecision = getDepartureDecision(nowSafe, laterSafe, TZ3_WAIT_MINUTES, _predictiveData.source);
    if (typeof renderPredictiveDecision === "function") renderPredictiveDecision();
  }

  function renderPredictiveDecision() {
    const waitHint = document.getElementById("dh-wait-hint");
    const waitTitle = waitHint ? waitHint.querySelector(".dh-wait-title") : null;
    const waitTimes = document.getElementById("dh-wait-times");
    const waitSave = document.getElementById("dh-wait-save");
    const card = document.getElementById("predictive-card");
    const advice = document.getElementById("ai-advice-line");

    if (card) card.style.display = "none";
    if (!waitHint || !_departureDecision || !_predictiveData) {
      if (waitHint) waitHint.style.display = "none";
      return;
    }

    const d = _departureDecision;
    const p = _predictiveData;
    const sourceText = p.source === "traffic-api" ? "live traffic" : "safe estimate";

    if (d.type === "wait") {
      if (waitTitle) waitTitle.textContent = "BETTER TIMING";
      if (waitTimes) waitTimes.textContent = `Wait ${p.waitMinutes} min → ${p.laterMin} min instead of ${p.nowMin} min`;
      if (waitSave) waitSave.textContent = `Save about ${Math.max(1, p.saving)} min · ${sourceText}`;
      waitHint.style.display = "block";
    } else {
      if (waitTitle) waitTitle.textContent = "AI TIMING";
      if (waitTimes) waitTimes.textContent = `Go now → ${p.nowMin} min; after ${p.waitMinutes} min ≈ ${p.laterMin} min`;
      if (waitSave) waitSave.textContent = `${d.why || "No clear advantage from waiting"}`;
      waitHint.style.display = "block";
    }

    if (advice && !advice.dataset.tz3Locked) {
      const base = advice.innerHTML;
      if (!advice.dataset.originalHtml) advice.dataset.originalHtml = base;
      const original = advice.dataset.originalHtml;
      advice.innerHTML = original + `<br><span>WHEN</span>${d.message}`;
      advice.dataset.tz3Locked = "1";
      setTimeout(function() { if (advice) advice.dataset.tz3Locked = ""; }, 0);
    }
  }

  function runPredictiveCheck(origin, destination, nowBestMin) {
    const nowMin = Math.max(1, tz3SafeNumber(nowBestMin, tz3GetDisplayMinutesSafe(_bestRoute, 1)));
    const estimatedLater = tz3EstimateLaterMinutes(nowMin);

    // Immediate result: never leave Decision Hero empty while the API forecast is loading/failing.
    tz3ApplyPrediction(nowMin, estimatedLater, "heuristic");

    if (!directionsService || !origin || !destination || !window.google || !google.maps) return;

    try {
      directionsService.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
        drivingOptions: {
          departureTime: new Date(Date.now() + TZ3_WAIT_MINUTES * 60 * 1000),
          trafficModel: "bestguess"
        }
      }, function(result, status) {
        if (status !== "OK" || !result || !result.routes || !result.routes.length) {
          return;
        }
        const apiLaterMin = tz3MinutesFromResult(result);
        if (!apiLaterMin) return;
        tz3ApplyPrediction(nowMin, apiLaterMin, "traffic-api");
      });
    } catch (e) {
      try { console.warn("[TZ3 Predictive] API forecast skipped", e); } catch (_) {}
    }
  }

  try { window.getDepartureDecision = getDepartureDecision; } catch (_) {}
  try { window.renderPredictiveDecision = renderPredictiveDecision; } catch (_) {}
  try { window.runPredictiveCheck = runPredictiveCheck; } catch (_) {}

  window.clearRoadTZ3Predictive = {
    waitMinutes: TZ3_WAIT_MINUTES,
    estimateLaterMinutes: tz3EstimateLaterMinutes,
    current: function() { return { predictiveData: _predictiveData, departureDecision: _departureDecision }; },
    rerender: renderPredictiveDecision
  };
})();
