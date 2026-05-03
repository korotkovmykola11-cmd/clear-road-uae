// cr-predictive-layer.js — extracted from input/index.html (main inline script).
// External module; depends on globals (script order in input / ТЗ-0).



// ============================================================
//  DAY 6.5 — Predictive Engine (+15 min departure)
// ============================================================

function getDepartureDecision(nowMin, laterMin, waitMinutes = 15) {
  const saving = nowMin - laterMin;

  if (saving >= 3) {
    return {
      type: "wait",
      waitMinutes,
      nowMin,
      laterMin,
      saving,
      confidence: "high",
      message: `Wait ${waitMinutes} min → smoother trip and save ${saving} min`
    };
  }

  if (saving <= -3) {
    return {
      type: "leave_now",
      waitMinutes,
      nowMin,
      laterMin,
      saving: Math.abs(saving),
      confidence: "high",
      message: `Leave now → traffic likely gets heavier soon`
    };
  }

  return {
    type: "neutral",
    waitMinutes,
    nowMin,
    laterMin,
    saving,
    confidence: "low",
    message: "No strong timing advantage"
  };
}

function renderPredictiveDecision() {
  var box = document.getElementById("predict-tip");
  if (box) { box.style.display = "none"; box.innerHTML = ""; }

  var card = document.getElementById("predictive-card");
  if (!card) return;

  // ---- helpers for inline hero wait-hint ----
  var waitHint  = document.getElementById("dh-wait-hint");
  var waitTimes = document.getElementById("dh-wait-times");
  var waitSave  = document.getElementById("dh-wait-save");

  function _hideWaitHint() {
    if (waitHint) waitHint.style.display = "none";
  }
  function _showWaitHint(timesText, saveText) {
    if (!waitHint) return;
    if (waitTimes) waitTimes.textContent = timesText;
    if (waitSave)  waitSave.textContent  = saveText;
    waitHint.style.display = "block";
  }

  if (!_departureDecision || _departureDecision.type === "neutral") {
    card.style.display = "none";
    _hideWaitHint();
    return;
  }

  var pcMain = document.getElementById("pc-main");
  var pcSub  = document.getElementById("pc-sub");
  var pcSave = document.getElementById("pc-save");

  if (_departureDecision.type === "wait" && _predictiveData) {
    // update inline hero hint
    var saving = (_predictiveData.nowMin || 0) - (_predictiveData.laterMin || 0);
    var timesText = "Wait " + _predictiveData.waitMinutes + " min \u2192 " + _predictiveData.laterMin + " min";
    var saveText  = saving > 0 ? "Save " + saving + " min" : "";
    _showWaitHint(timesText, saveText);

    // update predictive-card (action buttons)
    card.style.display = "flex";
    var titleEl = card.querySelector(".pc-title");
    if (titleEl) titleEl.textContent = "BETTER OPTION AHEAD";
    if (pcMain) pcMain.textContent = "Leave in " + _predictiveData.waitMinutes + " min \u2192 " + _predictiveData.laterMin + " min";
    if (pcSave && saving > 0) pcSave.textContent = "Save " + saving + " min";
    else if (pcSave) pcSave.textContent = "";
    if (pcSub) {
      var subHtml = _departureDecision.message;
      subHtml += '<div class="pc-actions">';
      subHtml += '<button type="button" class="pc-action-btn primary" onclick="scheduleDelayedStart()">Wait &amp; go later</button>';
      subHtml += '<button type="button" class="pc-action-btn secondary" onclick="goNowDecision()">Go now</button>';
      subHtml += "</div>";
      subHtml += '<div id="delayed-start-status" style="margin-top:8px;font-size:12px;color:#94a3b8;"></div>';
      pcSub.innerHTML = subHtml;
    }
    return;
  }

  if (_departureDecision.type === "leave_now") {
    _hideWaitHint();
    card.style.display = "flex";
    var titleEl2 = card.querySelector(".pc-title");
    if (titleEl2) titleEl2.textContent = "AI TIMING ADVICE";
    if (pcMain) pcMain.textContent = _departureDecision.message;
    if (pcSub) {
      pcSub.innerHTML = '<div class="pc-actions"><button type="button" class="pc-action-btn primary" onclick="goNowDecision()">Go now</button></div>';
    }
    if (pcSave) pcSave.textContent = "";
  }
}


function goNowDecision() {
  if (!_bestRoute) return;
  clearDelayedStartTimer();
  startDrive(_bestRoute.index);
}

function scheduleDelayedStart() {
  if (!_bestRoute || !_departureDecision || _departureDecision.type !== "wait") return;

  clearDelayedStartTimer();

  const waitMs = _departureDecision.waitMinutes * 60 * 1000;
  _delayedStartUntil = Date.now() + waitMs;

  updateDelayedStartStatus();

  _delayedStartTimer = setInterval(() => {
    const remainingMs = _delayedStartUntil - Date.now();

    if (remainingMs <= 0) {
      clearDelayedStartTimer();
      startDrive(_bestRoute.index);
      return;
    }

    updateDelayedStartStatus();
  }, 1000);
}

function updateDelayedStartStatus() {
  const el = document.getElementById("delayed-start-status");
  if (!el || !_delayedStartUntil) return;

  const remainingMs = Math.max(0, _delayedStartUntil - Date.now());
  const totalSec = Math.ceil(remainingMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  el.textContent = `Starting in ${min}:${String(sec).padStart(2, "0")}`;
}

function clearDelayedStartTimer() {
  if (_delayedStartTimer) {
    clearInterval(_delayedStartTimer);
    _delayedStartTimer = null;
  }
  _delayedStartUntil = null;
}

function runPredictiveCheck(origin, destination, nowBestMin) {
  _predictiveData = null;
  _departureDecision = null;

  if (!directionsService || !origin || !destination) return;

  const waitMinutes = 15;

  directionsService.route({
    origin,
    destination,
    travelMode: google.maps.TravelMode.DRIVING,
    provideRouteAlternatives: false,
    drivingOptions: {
      departureTime: new Date(Date.now() + waitMinutes * 60 * 1000),
      trafficModel: "bestguess"
    }
  }, (result, status) => {
    if (status !== "OK" || !result.routes?.length) {
      renderPredictiveDecision();
      return;
    }

    const leg = result.routes[0].legs[0];
    const laterSec = (leg.duration_in_traffic || leg.duration).value;
    const laterMin = Math.round(laterSec / 60);

    _predictiveData = { laterMin, nowMin: nowBestMin, saving: nowBestMin - laterMin };
    _departureDecision = getDepartureDecision(nowBestMin, laterMin, waitMinutes);

    renderPredictiveDecision();
  });
}
