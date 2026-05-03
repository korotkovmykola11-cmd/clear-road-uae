// cr-reroute-decision.js — extracted from input/index.html (main inline script).
// External module; depends on globals (script order in input / ТЗ-0).

function getRerouteDecision(currentRoute, alternativeRoute) {
  if (!currentRoute || !alternativeRoute) {
    return { action: "stay", confidence: "low", title: "Stay on current route", detail: "Missing route data" };
  }

  const currentMin = getDisplayMinutes(currentRoute);
  const altMin = getDisplayMinutes(alternativeRoute);
  const timeGain = currentMin - altMin;

  const currentDelay = currentRoute.delayMinutes || 0;
  const altDelay = alternativeRoute.delayMinutes || 0;
  const delayGain = currentDelay - altDelay;

  const currentScore = Number.isFinite(currentRoute.score) ? currentRoute.score : calculateRouteScore(currentRoute);
  const altScore = Number.isFinite(alternativeRoute.score) ? alternativeRoute.score : calculateRouteScore(alternativeRoute);
  const scoreGain = currentScore - altScore;

  const trafficBetter = trafficRank(alternativeRoute.traffic) < trafficRank(currentRoute.traffic);
  const simplerDrive = (alternativeRoute.complexity || 0) < (currentRoute.complexity || 0);
  const calmerDrive = (alternativeRoute.stressLevel || 0) < (currentRoute.stressLevel || 0);
  const fewerStops = (alternativeRoute.stopsCount || 0) < (currentRoute.stopsCount || 0);
  const tollImprovement = !!currentRoute.tolls && !alternativeRoute.tolls;

  const reasons = [];
  if (timeGain > 0) reasons.push(timeGain + " min faster");
  if (delayGain > 0) reasons.push(delayGain + " min less delay");
  if (trafficBetter) reasons.push("lighter traffic");
  if (simplerDrive) reasons.push("simpler drive");
  if (calmerDrive) reasons.push("calmer route");
  if (fewerStops) reasons.push("fewer stops");
  if (tollImprovement) reasons.push("no tolls");
  if (!reasons.length && scoreGain > 0) reasons.push("better total score");

  const reasonText = reasons.slice(0, 3).join(" · ") || "No strong advantage";
  const via = getRouteSummaryName(alternativeRoute);

  if (timeGain >= 4 || scoreGain >= 10) {
    return {
      action: "switch",
      confidence: "high",
      title: timeGain >= 4 ? ("Switch now → save " + timeGain + " min") : "Switch now → better route score",
      detail: reasonText + " via " + via,
      timeGain,
      delayGain,
      scoreGain
    };
  }

  if ((timeGain >= 2 && (trafficBetter || delayGain >= 2 || scoreGain >= 5)) || scoreGain >= 7) {
    return {
      action: "switch",
      confidence: "high",
      title: "Switch recommended",
      detail: reasonText + " via " + via,
      timeGain,
      delayGain,
      scoreGain
    };
  }

  if ((timeGain >= 1 && (trafficBetter || simplerDrive || calmerDrive || delayGain >= 1)) || scoreGain >= 4) {
    return {
      action: "suggest",
      confidence: "medium",
      title: "Alternative may be better",
      detail: reasonText + " via " + via,
      timeGain,
      delayGain,
      scoreGain
    };
  }

  if (timeGain >= 0 && (trafficBetter || calmerDrive || tollImprovement) && scoreGain >= 2) {
    return {
      action: "suggest",
      confidence: "medium",
      title: "Calmer route available",
      detail: reasonText + " via " + via,
      timeGain,
      delayGain,
      scoreGain
    };
  }

  return {
    action: "stay",
    confidence: "low",
    title: "Stay on current route",
    detail: "No strong reroute advantage",
    timeGain,
    delayGain,
    scoreGain
  };
}
