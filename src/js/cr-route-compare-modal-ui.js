// ТЗ-2 [v04] — якорь «ТЗ-8 — RESTORE ALTERNATIVES + ROUTE COMPARE UI»: модалка деталей / сравнение (openRouteDetails, toggleAlternatives).
// Порядок: после cr-render-results-decision-ui, до cr-drive-start-nav-entry.
// Зависит от main: tz1EtaDiffMinutes, analyzedRoutes, currentDecision, _bestRoute, generateNeutralWhy,
// generateDecisionInsight, _tz2BuildTradeOff, buildRouteSegments, isMeaningfulManeuver, t(), _tz1EscapeHTML, _tz1Minutes, …
// и от cr-route-cards-ui-cleanup: tz8RouteDistanceKm, tz9RouteCharacter.

function tz10SafeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function tz10RouteSteps(route) {
  try {
    return (route && route.route && route.route.legs && route.route.legs[0] && route.route.legs[0].steps) || [];
  } catch (e) { return []; }
}

function tz10StepText(step) {
  return String((step && (step.instructions || step.html_instructions)) || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tz10RouteDetailsViewModel(r, best) {
  const steps = tz10RouteSteps(r);
  const bestMin = best ? _tz1Minutes(best) : _tz1Minutes(r);
  const thisMin = _tz1Minutes(r);
  const diff = tz1EtaDiffMinutes(r, best || r);
  const distanceKm = tz8RouteDistanceKm(r) || (r.distance ? Math.round((r.distance / 1000) * 10) / 10 : 0);
  const delay = tz10SafeNumber(r.delayMinutes, 0);
  const score = Math.round(tz10SafeNumber(r.decisionScore, tz10SafeNumber(r.score, 0)));
  const turns = tz10SafeNumber(r.complexity, tz10SafeNumber(r.stopsCount, steps.length));
  const traffic = toTitleCaseLabel(getTrafficText(r.traffic || r.trafficLevel || r.trafficLabel || "medium"));
  const highwayPct = Math.round(tz10SafeNumber(r.highwayShare, 0) * 100);
  const routeTitle = getRouteSummaryName(r);
  const isBest = best && r.index === best.index;
  const whyPoints = Array.isArray(r.whyPoints) && r.whyPoints.length ? r.whyPoints : generateNeutralWhy(r, best || r);
  const trade = isBest ? (r.tradeOff || _tz2BuildTradeOff(r, r, analyzedRoutes)) : generateDecisionInsight(r, best || r);
  const character = typeof tz9RouteCharacter === "function" ? tz9RouteCharacter(r, best || r) : "ROUTE OPTION";
  return { steps, bestMin, thisMin, diff, distanceKm, delay, score, turns, traffic, highwayPct, routeTitle, isBest, whyPoints, trade, character };
}

function tz10RenderRouteBreakdown(vm) {
  const delayText = vm.delay <= 0 ? "0 min" : "+" + vm.delay + " min";
  const diffText = vm.isBest ? "Best route" : (vm.diff <= 0 ? "Same as best" : "+" + vm.diff + " min vs best");
  return `
    <div class="detail-section">
      <div class="detail-section-title">Route metrics</div>
      <div class="tz10-breakdown-grid">
        <div class="tz10-breakdown-item"><div class="tz10-breakdown-title">ETA comparison</div><div class="tz10-breakdown-value">${_tz1EscapeHTML(diffText)}</div></div>
        <div class="tz10-breakdown-item"><div class="tz10-breakdown-title">Traffic</div><div class="tz10-breakdown-value">${_tz1EscapeHTML(vm.traffic)}</div></div>
        <div class="tz10-breakdown-item"><div class="tz10-breakdown-title">Delay</div><div class="tz10-breakdown-value">${_tz1EscapeHTML(delayText)}</div></div>
        <div class="tz10-breakdown-item"><div class="tz10-breakdown-title">Turns / actions</div><div class="tz10-breakdown-value">${_tz1EscapeHTML(vm.turns)}</div></div>
        <div class="tz10-breakdown-item"><div class="tz10-breakdown-title">Highway share</div><div class="tz10-breakdown-value">${_tz1EscapeHTML(vm.highwayPct)}%</div></div>
        <div class="tz10-breakdown-item"><div class="tz10-breakdown-title">Route type</div><div class="tz10-breakdown-value">${_tz1EscapeHTML(vm.character)}</div></div>
      </div>
    </div>`;
}

function tz10RenderKeySteps(vm) {
  const meaningful = vm.steps
    .map(function(step, i) { return { step, i, text: tz10StepText(step) }; })
    .filter(function(x) { return x.text && (isMeaningfulManeuver(x.step, { }) || /exit|ramp|merge|keep|left|right|u-turn|fork/i.test(x.text)); })
    .slice(0, 5);
  const picked = meaningful.length ? meaningful : vm.steps.slice(0, 4).map(function(step, i) { return { step, i, text: tz10StepText(step) || "Continue on route" }; });
  if (!picked.length) return "";
  return `
    <div class="detail-section">
      <div class="detail-section-title">Key driving actions</div>
      <div class="segment-list">
        ${picked.map(function(item) {
          const dist = item.step && item.step.distance && item.step.distance.text ? item.step.distance.text : "";
          const dur = item.step && item.step.duration && item.step.duration.text ? item.step.duration.text : "";
          const details = [dist, dur].filter(Boolean).join(" · ") || "route step";
          return `<div class="segment-item"><div class="segment-icon turns">&#10148;</div><div class="segment-content"><div class="segment-title">${_tz1EscapeHTML(item.text)}</div><div class="segment-details">${_tz1EscapeHTML(details)}</div></div></div>`;
        }).join("")}
      </div>
      <div class="tz10-segment-note">These are the most important visible instructions from the route steps. Full turn-by-turn stays in Drive Mode.</div>
    </div>`;
}

function openRouteDetails(index) {
  const r = analyzedRoutes.find(function(x) { return x.index === index; });
  if (!r) return;

  const best = currentDecision && currentDecision.bestRoute ? currentDecision.bestRoute : _bestRoute;
  const vm = tz10RouteDetailsViewModel(r, best || r);
  const segments = buildRouteSegments(r);
  const tollText = r.tollCost > 0 ? `${r.tollCost} AED` : "No tolls";
  const delayText = vm.delay === 0 ? "0 min" : `+${vm.delay} min`;

  const compareNote = !vm.isBest
    ? `<div class="comparison-note">${_tz1EscapeHTML(vm.trade)}</div>`
    : `<div class="tz10-score-box"><div><div class="tz10-score-main">Recommended by Decision Engine</div><div class="tz10-score-sub">${_tz1EscapeHTML(vm.trade)}</div></div><div class="tz10-score-number">#1</div></div>`;

  const segmentsHtml = segments.length > 0 ? `
    <div class="detail-section">
      <div class="detail-section-title">Route breakdown</div>
      <div class="segment-list">
        ${segments.map(function(seg) { return `
          <div class="segment-item">
            <div class="segment-icon ${seg.type}">${seg.icon}</div>
            <div class="segment-content">
              <div class="segment-title">${_tz1EscapeHTML(seg.title)}</div>
              <div class="segment-details">${_tz1EscapeHTML(seg.details)}</div>
            </div>
          </div>`; }).join("")}
      </div>
    </div>
  ` : "";

  const modal = document.getElementById("modal-content");
  if (!modal) return;
  modal.classList.add("tz10-details");
  modal.innerHTML = `
    <div class="modal-handle"></div>

    <div class="modal-header">
      <div>
        <h2 class="modal-title">${_tz1EscapeHTML(vm.routeTitle)}</h2>
        <div class="tz10-modal-subtitle">${_tz1EscapeHTML(vm.character)} · ${_tz1EscapeHTML(vm.distanceKm)} km · ${_tz1EscapeHTML(vm.traffic)}</div>
      </div>
      <span class="modal-role-badge ${vm.isBest ? "recommended" : "alternative"}">
        ${vm.isBest ? t("modal_recommended") : t("modal_alternative")}
      </span>
    </div>

    <div class="tz10-summary-strip">
      <div class="tz10-summary-item"><div class="tz10-summary-label">ETA</div><div class="tz10-summary-value">${vm.thisMin} min</div></div>
      <div class="tz10-summary-item"><div class="tz10-summary-label">Distance</div><div class="tz10-summary-value">${vm.distanceKm} km</div></div>
      <div class="tz10-summary-item"><div class="tz10-summary-label">Score</div><div class="tz10-summary-value">${vm.score}</div></div>
    </div>

    ${compareNote}

    <div class="modal-why">
      <div class="modal-why-title">${vm.isBest ? t("modal_why_title") : t("modal_tradeoff")}</div>
      <ul class="modal-why-points">
        ${vm.whyPoints.map(function(point) { return `<li>${_tz1EscapeHTML(point)}</li>`; }).join("")}
      </ul>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">${t("modal_key_facts")}</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">${t("modal_time")}</div><div class="detail-value">${vm.thisMin} min</div></div>
        <div class="detail-item"><div class="detail-label">${t("modal_distance")}</div><div class="detail-value">${vm.distanceKm} km</div></div>
        <div class="detail-item"><div class="detail-label">${t("modal_delay")}</div><div class="detail-value">${_tz1EscapeHTML(delayText)}</div></div>
        <div class="detail-item"><div class="detail-label">${t("modal_tolls")}</div><div class="detail-value" style="font-size:14px">${_tz1EscapeHTML(tollText)}</div></div>
        <div class="detail-item"><div class="detail-label">${t("modal_traffic")}</div><div class="detail-value" style="font-size:14px">${_tz1EscapeHTML(vm.traffic)}</div></div>
        <div class="detail-item"><div class="detail-label">${t("modal_turns")}</div><div class="detail-value">${_tz1EscapeHTML(vm.turns)}</div></div>
        <div class="detail-item full-width"><div class="detail-label">${t("modal_highway")}</div><div class="detail-value">${vm.highwayPct}%</div></div>
      </div>
    </div>

    ${tz10RenderRouteBreakdown(vm)}
    ${segmentsHtml}
    ${tz10RenderKeySteps(vm)}

    <div class="tz10-modal-actions">
      <button class="tz10-secondary-btn" onclick="closeModal({target:document.getElementById('modal-overlay')})">Close</button>
      <button class="modal-cta" onclick="startDrive(${r.index})">${vm.isBest ? `${t("modal_go")} ${_tz1EscapeHTML(vm.routeTitle)}` : `${t("modal_try")} ${_tz1EscapeHTML(vm.routeTitle)}`}</button>
    </div>
  `;

  document.getElementById("modal-overlay").classList.add("visible");
}

function closeModal(event) {
  if (event.target.id === "modal-overlay" || event.target.classList.contains("modal-cta")) {
    document.getElementById("modal-overlay").classList.remove("visible");
  }
}

function toggleAlternatives() {
  var section = document.getElementById("other-routes-section");
  if (section) {
    section.classList.toggle("expanded");
  }
}
