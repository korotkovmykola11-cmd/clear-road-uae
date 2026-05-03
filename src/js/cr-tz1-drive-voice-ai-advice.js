// ТЗ-2 [v16] — голос/тексты AI-совета, альтернативы, reroute (монолит).
// Порядок DOM: внешний <script> сразу после cr-ai-decision-layer.js — до cr-tz1-drive-live-gps-tracking.js
// (нужны calculateConfidence из AI layer и _tz1EscapeHTML из cr-tz1-tz2-decision-helpers, загруженных ранее в цепочке).
// Зависимости из основного script: speakText, stripHtml, translateTrafficForVoice, translateConfidenceForVoice,
// currentLang, t, voiceEnabled, currentDecision, analyzedRoutes, selectedRoute, _bestRoute, _fastestRoute,
// lastRerouteVoiceAt, lastDecisionVoiceAt,
// getDisplayMinutes, getRouteSummaryName, getUnifiedRouteMeta, generateTimeInsight, getRouteInsight, generateWhyLine;

function getBestComparableAlternative(route) {
  const decision =
    typeof currentDecision !== "undefined" && currentDecision
      ? currentDecision
      : typeof window.buildRealDecision === "function"
        ? window.buildRealDecision(analyzedRoutes)
        : null;
  if (!decision || !decision.alternatives) return null;
  return decision.alternatives[0] || null;
}

function buildAlternativeComparisonForVoice(route, alt) {
  const r = route || selectedRoute || _bestRoute;
  if (!r || !alt) return "";
  const diff = getDisplayMinutes(alt) - getDisplayMinutes(r);
  const altName = getRouteSummaryName(alt);
  const altTraffic = translateTrafficForVoice(alt.traffic);
  const rTraffic = translateTrafficForVoice(r.traffic);
  const altStress = (getUnifiedRouteMeta(alt)?.stressLabel || alt.drivePersonality || "").toLowerCase();
  const rStress = (getUnifiedRouteMeta(r)?.stressLabel || r.drivePersonality || "").toLowerCase();

  if (currentLang === "ru") {
    if (diff < 0) return "Альтернатива через " + altName + " быстрее примерно на " + Math.abs(diff) + " мин, но может быть менее стабильной. Трафик там: " + altTraffic + ".";
    if (diff > 0) return "Альтернатива через " + altName + " медленнее примерно на " + diff + " мин. Она может быть спокойнее, но сейчас основной маршрут выглядит лучше.";
    return "Альтернатива через " + altName + " почти такая же по времени, но текущий маршрут выбран из-за более понятного профиля движения.";
  }
  if (currentLang === "ua") {
    if (diff < 0) return "Альтернатива через " + altName + " швидша приблизно на " + Math.abs(diff) + " хв, але може бути менш стабільною. Трафік там: " + altTraffic + ".";
    if (diff > 0) return "Альтернатива через " + altName + " повільніша приблизно на " + diff + " хв. Вона може бути спокійнішою, але зараз основний маршрут виглядає краще.";
    return "Альтернатива через " + altName + " майже така сама за часом, але поточний маршрут обрано через більш зрозумілий профіль руху.";
  }
  if (currentLang === "ar") {
    if (diff < 0) return "الطريق البديل عبر " + altName + " أسرع بحوالي " + Math.abs(diff) + " دقيقة، لكنه قد يكون أقل استقراراً. المرور هناك: " + altTraffic + ".";
    if (diff > 0) return "الطريق البديل عبر " + altName + " أبطأ بحوالي " + diff + " دقيقة. قد يكون أهدأ، لكن الطريق الحالي أفضل الآن.";
    return "الطريق البديل عبر " + altName + " قريب جداً في الوقت، لكن الطريق الحالي تم اختياره لأنه أوضح وأكثر استقراراً.";
  }
  if (diff < 0) return "The alternative via " + altName + " is about " + Math.abs(diff) + " minutes faster, but it may be less stable. Traffic there is " + altTraffic + ".";
  if (diff > 0) return "The alternative via " + altName + " is about " + diff + " minutes slower. It may be calmer, but the current route looks stronger now.";
  return "The alternative via " + altName + " is similar in time, but the current route has a clearer driving profile.";
}

function buildTimingAdviceForVoice(route) {
  const r = route || selectedRoute || _bestRoute;
  if (!r) return "";
  const insight = stripHtml(generateTimeInsight(r) || "");
  const lower = insight.toLowerCase();
  if (!insight) return "";
  if (currentLang === "ru") return lower.includes("wait") || lower.includes("подожд") ? "По времени можно немного подождать: " + insight + "." : "По времени лучше ехать сейчас: " + insight + ".";
  if (currentLang === "ua") return lower.includes("wait") || lower.includes("подожд") ? "За часом можна трохи зачекати: " + insight + "." : "За часом краще їхати зараз: " + insight + ".";
  if (currentLang === "ar") return "نصيحة التوقيت: " + insight + ".";
  return (lower.includes("wait") || lower.includes("consider")) ? "Timing advice: consider waiting. " + insight + "." : "Timing advice: leaving now looks good. " + insight + ".";
}


function getAIAdviceText(route) {
  const r = route || selectedRoute || _bestRoute;
  if (!r) {
    if (currentLang === "ru") return "Постройте маршрут — я объясню лучший вариант.";
    if (currentLang === "ua") return "Побудуйте маршрут — я поясню найкращий варіант.";
    if (currentLang === "ar") return "ابنِ المسار أولاً — سأشرح أفضل خيار.";
    return "Build a route — I will explain the best option.";
  }
  const mins = getDisplayMinutes(r);
  const name = getRouteSummaryName(r);
  const alt = getBestComparableAlternative(r);
  const why = stripHtml(getRouteInsight(r, _bestRoute || r, _fastestRoute) || generateWhyLine(r, analyzedRoutes) || "");
  const traffic = translateTrafficForVoice(r.traffic || "stable");
  const stress = stripHtml((getUnifiedRouteMeta(r)?.stressLabel || r.drivePersonality || "steady drive")).toLowerCase();

  let diffText = "";
  if (alt) {
    const diff = getDisplayMinutes(alt) - mins;
    if (currentLang === "ru") {
      diffText = diff > 0 ? " На " + diff + " мин быстрее ближайшей альтернативы." : " Время похоже на альтернативу, но маршрут стабильнее.";
    } else if (currentLang === "ua") {
      diffText = diff > 0 ? " На " + diff + " хв швидше найближчої альтернативи." : " Час схожий на альтернативу, але маршрут стабільніший.";
    } else if (currentLang === "ar") {
      diffText = diff > 0 ? " أسرع بحوالي " + diff + " دقيقة من أقرب بديل." : " الوقت مشابه للبديل، لكن المسار أكثر استقراراً.";
    } else {
      diffText = diff > 0 ? " " + diff + " min faster than the closest alternative." : " Similar time, but the route is more stable.";
    }
  }

  if (currentLang === "ru") {
    return "AI совет: ехать через " + name + " — " + mins + " мин. " +
      (why ? why + ". " : "") + "Трафик " + traffic + ", характер: " + stress + "." + diffText;
  }
  if (currentLang === "ua") {
    return "AI порада: їхати через " + name + " — " + mins + " хв. " +
      (why ? why + ". " : "") + "Трафік " + traffic + ", характер: " + stress + "." + diffText;
  }
  if (currentLang === "ar") {
    return "نصيحة الذكاء الاصطناعي: الطريق عبر " + name + "، حوالي " + mins + " دقيقة. " +
      (why ? why + ". " : "") + "المرور " + traffic + "، والطريق " + stress + "." + diffText;
  }
  return "AI advice: take " + name + " — " + mins + " min. " +
    (why ? why + ". " : "") + "Traffic is " + traffic + ", route feel: " + stress + "." + diffText;
}

function renderAIAdviceLine(route) {
  const advice = getAIAdviceText(route);
  const tag = typeof t === "function" ? t("dh_advice_tag") : "Why";
  return '<div class="ai-advice-line" id="ai-advice-line"><span>' + _tz1EscapeHTML(tag) + '</span>' + advice + '</div>';
}

function buildDecisionVoiceText(route, mode) {
  const r = route || selectedRoute || _bestRoute;
  if (!r) {
    if (currentLang === "ru") return "Сначала постройте маршрут. Затем я объясню, почему выбран лучший вариант.";
    if (currentLang === "ua") return "Спочатку побудуйте маршрут. Потім я поясню, чому обрано найкращий варіант.";
    if (currentLang === "ar") return "ابنِ المسار أولاً. بعد ذلك سأشرح لماذا هذا الطريق أفضل.";
    return "Build a route first. Then I will explain why this route is better.";
  }
  const advice = getAIAdviceText(r);
  const alt = getBestComparableAlternative(r);
  const conf = calculateConfidence(r, analyzedRoutes);
  let altLine = "";
  if (alt) {
    const diff = getDisplayMinutes(alt) - getDisplayMinutes(r);
    if (currentLang === "ru") altLine = diff > 0 ? " Ближайшая альтернатива дольше примерно на " + diff + " минут." : " Альтернатива не быстрее, поэтому оставляю этот маршрут.";
    else if (currentLang === "ua") altLine = diff > 0 ? " Найближча альтернатива довша приблизно на " + diff + " хвилин." : " Альтернатива не швидша — залишаю цей маршрут.";
    else if (currentLang === "ar") altLine = diff > 0 ? " البديل الأقرب أطول بحوالي " + diff + " دقيقة." : " البديل ليس أسرع — أبقي هذا المسار.";
    else altLine = diff > 0 ? " The closest alternative is about " + diff + " minutes longer." : " The alternative is not faster, so I keep this route.";
  }
  if (currentLang === "ru") return advice + altLine + " Уверенность решения: " + translateConfidenceForVoice(conf) + ".";
  if (currentLang === "ua") return advice + altLine + " Впевненість рішення: " + translateConfidenceForVoice(conf) + ".";
  if (currentLang === "ar") return advice + altLine + " ثقة القرار: " + translateConfidenceForVoice(conf) + ".";
  return advice + altLine + " Decision confidence is " + translateConfidenceForVoice(conf) + ".";
}

function buildRerouteVoiceText(decision, altRoute) {
  if (!decision || !altRoute || decision.action === "stay") return "";
  const altName = getRouteSummaryName(altRoute);
  const mins = getDisplayMinutes(altRoute);
  const currentMins = selectedRoute ? getDisplayMinutes(selectedRoute) : null;
  const gain = currentMins != null ? currentMins - mins : null;
  if (currentLang === "ru") {
    return (decision.action === "switch" ? "AI совет: лучше сменить маршрут. " : "AI совет: есть альтернатива. ") +
      "Через " + altName + " около " + mins + " минут. " +
      (gain != null && gain > 0 ? "Экономия примерно " + gain + " минут. " : "Время примерно такое же, но движение может быть спокойнее. ") +
      stripHtml(decision.detail || "");
  }
  if (currentLang === "ua") {
    return (decision.action === "switch" ? "AI порада: краще змінити маршрут. " : "AI порада: є альтернатива. ") +
      "Через " + altName + " близько " + mins + " хвилин. " +
      (gain != null && gain > 0 ? "Економія приблизно " + gain + " хвилин. " : "Час майже такий самий, але рух може бути спокійнішим. ") +
      stripHtml(decision.detail || "");
  }
  if (currentLang === "ar") {
    return (decision.action === "switch" ? "نصيحة الذكاء الاصطناعي: من الأفضل تغيير الطريق. " : "نصيحة الذكاء الاصطناعي: يوجد طريق بديل. ") +
      "عبر " + altName + " حوالي " + mins + " دقيقة. " +
      (gain != null && gain > 0 ? "التوفير حوالي " + gain + " دقيقة. " : "الوقت قريب، لكن الطريق قد يكون أهدأ. ") +
      stripHtml(decision.detail || "");
  }
  return (decision.action === "switch" ? "AI advice: switch route. " : "AI advice: an alternative is available. ") +
    "Via " + altName + ", about " + mins + " minutes. " +
    (gain != null && gain > 0 ? "You may save about " + gain + " minutes. " : "Time is similar, but traffic may be calmer. ") +
    stripHtml(decision.detail || "");
}

function speakRerouteDecision(decision, altRoute) {
  if (!voiceEnabled) return;
  const now = Date.now();
  if (now - lastRerouteVoiceAt < 20000) return;
  const text = buildRerouteVoiceText(decision, altRoute);
  if (!text) return;
  lastRerouteVoiceAt = now;
  speakText(text);
}

function speakCurrentDecision() {
  voiceEnabled = true;
  const now = Date.now();
  if (now - lastDecisionVoiceAt < 1200) return;
  lastDecisionVoiceAt = now;
  speakText(buildDecisionVoiceText((currentDecision && currentDecision.bestRoute) || selectedRoute || _bestRoute, "manual"));
}
