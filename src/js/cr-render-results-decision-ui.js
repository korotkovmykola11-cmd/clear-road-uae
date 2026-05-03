// ТЗ-2 [v02] — renderResults(): блок results + ТЗ-6 DECISION UI BINDING (currentDecision).
// Загружается после cr-route-cards-ui-cleanup; onclick openRouteDetails / toggleAlternatives — в cr-route-compare-modal-ui.js [v04].
// Зависит от main: глобалей маршрута, t(), _tz1*, _tz2BuildWhy/TradeOff, …

function renderResults() {
  const container = document.getElementById("results");
  const quickAccess = document.getElementById("quick-access");

  if (!container) return;
  const lifecycleState = String(document.documentElement.getAttribute("data-route-state") || "").toUpperCase();
  const hasRenderableRoutes =
    Array.isArray(analyzedRoutes) &&
    analyzedRoutes.length > 0 &&
    currentDecision &&
    currentDecision.bestRoute;
  if (lifecycleState === "IDLE") {
    if (hasRenderableRoutes) {
      try {
        document.documentElement.setAttribute("data-route-state", "READY");
      } catch (_s) {}
    } else {
      container.innerHTML = "";
      if (quickAccess) quickAccess.classList.remove("hidden");
      return;
    }
  }
  if (lifecycleState === "ERROR") {
    if (hasRenderableRoutes) {
      try {
        document.documentElement.setAttribute("data-route-state", "READY");
      } catch (_s2) {}
    } else {
      if (quickAccess) quickAccess.classList.remove("hidden");
      return;
    }
  }
  if (!Array.isArray(analyzedRoutes) || !analyzedRoutes.length) {
    container.innerHTML = "";
    if (quickAccess) quickAccess.classList.remove("hidden");
    return;
  }

  if (quickAccess) quickAccess.classList.add("hidden");

  // ============================================================
  //  ТЗ-6 — DECISION UI BINDING
  //  UI is driven by currentDecision, not by old manual route selection.
  //  alternatives может временно отсутствовать у объекта решения — тогда tz8GetDecisionAlternatives возьмёт запасной список из analyzedRoutes.
  // ============================================================
  if (!currentDecision || !currentDecision.bestRoute) {
    container.innerHTML = "";
    return;
  }
  if (!Array.isArray(currentDecision.alternatives)) {
    try { currentDecision.alternatives = []; } catch (_alt) {}
  }

  const best = currentDecision.bestRoute;
  if (!best) {
    container.innerHTML = "";
    return;
  }
  const decisionBestIndex = Number(best.index);
  if (Number.isFinite(decisionBestIndex)) {
    const matchedBest = analyzedRoutes.find(function(route) { return route && Number(route.index) === decisionBestIndex; });
    if (matchedBest) {
      _bestRoute = matchedBest;
      selectedRoute = matchedBest;
    }
  }
  const decisionAlternatives = tz8GetDecisionAlternatives(currentDecision, best, analyzedRoutes);
  if (currentDecision) currentDecision.alternatives = decisionAlternatives;

  // Этап 2: UI берёт confidence только из currentDecision (без повторного buildRealDecision в рендере)
  let decisionConfidence = currentDecision.confidence;
  if (!decisionConfidence || typeof decisionConfidence.level !== "string" || !Number.isFinite(decisionConfidence.percent)) {
    decisionConfidence = {
      level: "MEDIUM",
      percent: 68,
      margin: 0,
      reason: "Confidence synced with decision card"
    };
  }
  const conf = String(decisionConfidence.level).toUpperCase();
  const confPct = decisionConfidence.percent;
  const routeName = _tz1RouteName(best);
  const distKm = best.distanceKm || (best.distance ? Math.round((best.distance / 1000) * 10) / 10 : 0);
  const whyLine = Array.isArray(best.whyPoints) && best.whyPoints.length ? best.whyPoints.join(" · ") : (best.why || _tz2BuildWhy(best, analyzedRoutes));
  const tradeOff = best.tradeOff || _tz2BuildTradeOff(best, best, analyzedRoutes);
  const now = new Date();
  const arrival = new Date(now.getTime() + _tz1Minutes(best) * 60000);
  const arrivalStr = arrival.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const decisionId = currentDecision.selectedRouteId || best.id || ("route-" + best.index);

  let h = "";
  h += '<div class="decision-hero" data-bound-to="currentDecision" data-best-route-index="' + _tz1EscapeHTML(best.index) + '">';
  h += '<div class="dh-overline" data-decision-id="' + _tz1EscapeHTML(decisionId) + '">' + _tz1EscapeHTML(t("dh_overline")) + '</div>';
  h += '<div class="dh-headline">' + _tz1EscapeHTML(t("dh_headline")) + ' <span class="dh-check">&#10003;</span></div>';
  h += '<div class="dh-eta">' + _tz1Minutes(best) + '<span class="dh-min">' + _tz1EscapeHTML(t("dh_min_unit")) + '</span></div>';
  h += '<div class="dh-route-line">' + _tz1EscapeHTML(t("dh_route_via")) + ' ' + _tz1EscapeHTML(routeName) + '</div>';
  h += '<div class="ai-advice-line" id="ai-advice-line"><span>' + _tz1EscapeHTML(t("dh_advice_tag")) + '</span>' + _tz1EscapeHTML(whyLine) + '<br><span>' + _tz1EscapeHTML(t("dh_trade_tag")) + '</span>' + _tz1EscapeHTML(tradeOff) + '</div>';
  h += '<div class="decision-actions"><button type="button" class="decision-voice-btn" onclick="speakCurrentDecision()">🔊 ' + _tz1EscapeHTML(typeof t === "function" ? t("why_voice_button") : "Why this route") + '</button></div>';
  h += '<div class="dh-wait-hint" id="dh-wait-hint" style="display:none"><div class="dh-wait-title">' + _tz1EscapeHTML(t("dh_better_timing")) + '</div><div class="dh-wait-times" id="dh-wait-times"></div><div class="dh-wait-save" id="dh-wait-save"></div></div>';
  h += '<div class="dh-conf-slim" data-confidence-source="currentDecision.confidence">';
  h += '<span class="dh-conf-label">' + _tz1EscapeHTML(t("dh_conf_label")) + '</span>';
  h += '<span class="dh-conf-level ' + conf.toLowerCase() + '">' + conf + '</span>';
  h += '<span class="dh-conf-pct">' + confPct + '%</span>';
  h += '<div class="dh-conf-bar"><div class="dh-conf-fill" style="width:' + confPct + '%"></div></div>';
  h += '</div>';
  h += '</div>';

  h += '<div class="predictive-card" id="predictive-card" style="display:none"><div class="pc-icon">&#9200;</div><div class="pc-content"><div class="pc-title">' + _tz1EscapeHTML(t("dh_pred_title")) + '</div><div class="pc-main" id="pc-main"></div><div class="pc-sub" id="pc-sub"></div></div><div class="pc-save" id="pc-save"></div></div>';

  h += '<div class="cta-row">';
  h += '<button class="cta-start" onclick="startDrive(' + best.index + ')">&#9650; ' + _tz1EscapeHTML(t("cta_start_upper")) + '<small>' + _tz1EscapeHTML(t("dh_route_via")) + ' ' + _tz1EscapeHTML(routeName) + '</small></button>';
  h += '<button class="cta-details" onclick="openRouteDetails(' + best.index + ')">' + _tz1EscapeHTML(t("cta_details_upper")) + '</button>';
  h += '</div>';

  const alternatives = decisionAlternatives;

  h += '<div class="other-routes expanded tz8-visible tz9-clean" id="other-routes-section" data-source="currentDecision.alternatives" data-alternatives-count="' + alternatives.length + '">';
  h += '<button class="see-alts-btn" onclick="toggleAlternatives()"><span>Compare alternatives: ' + alternatives.length + '</span><span class="arrow">&#9662;</span></button>';

  if (alternatives.length) {
    h += '<div class="alt-row">';
    alternatives.forEach(function(route, idx) {
      h += tz8RenderAlternativeCard(route, best, analyzedRoutes, idx);
    });
    h += '</div>';
  } else {
    h += '<div class="tz8-no-alts">Google returned only one route for this request. Route Compare is ready and will show alternatives when the API returns 2–4 routes.</div>';
  }

  h += '</div>';

  h += '<div class="info-strip">';
  h += '<div class="info-item"><div class="info-label">Distance</div><div class="info-value">' + distKm + ' km</div></div>';
  h += '<div class="info-item"><div class="info-label">Est. Arrival</div><div class="info-value">' + _tz1EscapeHTML(arrivalStr) + '</div></div>';
  h += '<div class="info-item"><div class="info-label">Tolls</div><div class="info-value">' + (best.tollCost > 0 ? 'AED ' + best.tollCost : 'None') + '</div></div>';
  h += '<div class="info-item"><div class="info-label">Score</div><div class="info-value">' + Math.round(best.score) + '</div></div>';
  h += '</div>';
  h += '<div class="predict-tip" id="predict-tip" style="display:none"></div>';

  container.innerHTML = h;
  if (typeof crNormalizeDurationNode === "function") {
    try { crNormalizeDurationNode(document); } catch (_e) {}
  }

  if (typeof renderPredictiveDecision === "function") {
    try { renderPredictiveDecision(); } catch (e) { console.warn("predictive render skipped", e); }
  }
}
