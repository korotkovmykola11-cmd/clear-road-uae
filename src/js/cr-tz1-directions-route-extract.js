// ТЗ-2 [v11] — якорь «ТЗ-1 — ROUTE DATA EXTRACTION» (монолит).
// Порядок: первый внешний <script> после основного inline <\/script> — до cr-tz1-route-metrics-traffic.js
// (extractRoutesFromDirectionsResult → normalizeRoute в main; UI и скоринг не меняют контракт).
// Зависимостей от main нет.

// ============================================================
//  ТЗ-1 — ROUTE DATA EXTRACTION
//  Goal: extract 2–3 Google Directions alternatives into a stable
//  Route[] structure without changing UI or later scoring logic.
// ============================================================
function tz1SafeValue(obj, fallback = 0) {
  if (!obj) return fallback;
  if (Number.isFinite(obj.value)) return obj.value;
  if (typeof obj.value === "number") return obj.value;
  return fallback;
}

function tz1SafeText(obj, fallback = "") {
  if (!obj) return fallback;
  if (typeof obj.text === "string") return obj.text;
  return fallback;
}

function extractStepData(step, stepIndex) {
  const distanceValue = tz1SafeValue(step && step.distance, 0);
  const durationValue = tz1SafeValue(step && step.duration, 0);

  return {
    index: stepIndex,
    distance: distanceValue,
    distanceText: tz1SafeText(step && step.distance, ""),
    duration: durationValue,
    durationText: tz1SafeText(step && step.duration, ""),
    htmlInstructions: (step && step.html_instructions) || "",
    maneuver: (step && step.maneuver) || "",
    travelMode: (step && step.travel_mode) || "DRIVING",
    startLocation: step && step.start_location ? {
      lat: typeof step.start_location.lat === "function" ? step.start_location.lat() : null,
      lng: typeof step.start_location.lng === "function" ? step.start_location.lng() : null
    } : null,
    endLocation: step && step.end_location ? {
      lat: typeof step.end_location.lat === "function" ? step.end_location.lat() : null,
      lng: typeof step.end_location.lng === "function" ? step.end_location.lng() : null
    } : null,
    rawStep: step || null
  };
}

function extractLegData(leg, legIndex) {
  const steps = Array.isArray(leg && leg.steps) ? leg.steps.map(extractStepData) : [];
  const duration = tz1SafeValue(leg && leg.duration, 0);
  const durationInTraffic = tz1SafeValue(leg && leg.duration_in_traffic, duration);
  const distance = tz1SafeValue(leg && leg.distance, 0);

  return {
    index: legIndex,
    duration,
    durationText: tz1SafeText(leg && leg.duration, ""),
    duration_in_traffic: durationInTraffic,
    durationInTraffic,
    durationInTrafficText: tz1SafeText(leg && leg.duration_in_traffic, tz1SafeText(leg && leg.duration, "")),
    distance,
    distanceText: tz1SafeText(leg && leg.distance, ""),
    startAddress: (leg && leg.start_address) || "",
    endAddress: (leg && leg.end_address) || "",
    steps,
    rawLeg: leg || null
  };
}

function extractRouteData(route, index) {
  const legs = Array.isArray(route && route.legs) ? route.legs.map(extractLegData) : [];
  const primaryLeg = legs[0] || null;
  const allSteps = legs.flatMap(leg => leg.steps || []);
  const routeId = `route-${index + 1}`;

  return {
    id: routeId,
    index,
    displayIndex: index + 1,
    summary: (route && route.summary) || `Route ${index + 1}`,
    duration: primaryLeg ? primaryLeg.duration : 0,
    duration_in_traffic: primaryLeg ? primaryLeg.duration_in_traffic : 0,
    distance: primaryLeg ? primaryLeg.distance : 0,
    legs,
    steps: allSteps,
    rawLeg: route && route.legs && route.legs[0] ? route.legs[0] : null,
    rawRoute: route || null,
    route: route || null
  };
}

function extractRoutesFromDirectionsResult(result) {
  const rawRoutes = result && Array.isArray(result.routes) ? result.routes : [];
  return rawRoutes.slice(0, 3).map(extractRouteData);
}

function validateExtractedRoutes(routes) {
  if (!Array.isArray(routes) || routes.length === 0) {
    return { ok: false, message: "No routes extracted from Directions result" };
  }

  const invalid = routes.find(route =>
    !route ||
    !route.id ||
    !Number.isFinite(route.duration) ||
    !Number.isFinite(route.duration_in_traffic) ||
    !Number.isFinite(route.distance) ||
    !Array.isArray(route.legs) ||
    !Array.isArray(route.steps)
  );

  if (invalid) {
    return { ok: false, message: `Invalid route data: ${invalid.id || "unknown route"}` };
  }

  return { ok: true, message: routes.length >= 2 ? "OK" : "Only one route returned by API" };
}
