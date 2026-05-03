// ТЗ-2 [v03] — Якорь в монолите: «ТЗ-9 — ROUTE CARDS UI CLEANUP» (alternatives / карточки).
// Порядок: после cr-tz1-drive-live-gps-tracking.js — до cr-render-results-decision-ui.js.
// Зависит от main: _tz1Minutes, tz1EtaDiffMinutes, _tz2BuildWhy, _tz1EscapeHTML, _tz1RouteName, openRouteDetails.

function tz8SameRoute(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && String(a.id) === String(b.id)) return true;
  if (Number.isFinite(a.index) && Number.isFinite(b.index) && a.index === b.index) return true;
  return false;
}

/** Map + cards: same palette index = same color (Google route order by index). */
var CR_ROUTE_MAP_PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#f43f5e",
  "#a78bfa",
  "#06b6d4",
  "#f59e0b",
  "#94a3b8",
  "#c084fc"
];

function crSortRoutesByIndex(routes) {
  if (!Array.isArray(routes)) return [];
  return routes
    .filter(function(r) {
      return r && Number.isFinite(r.index);
    })
    .slice()
    .sort(function(a, b) {
      return Number(a.index) - Number(b.index);
    });
}

function crRoutePaletteColorForSlot(slotIndex) {
  const i = Math.max(0, Math.floor(Number(slotIndex)) || 0);
  return CR_ROUTE_MAP_PALETTE[i % CR_ROUTE_MAP_PALETTE.length];
}

function crRoutePolylineOptionsForMap(route, sortedRoutes, focusRoute, bestRoute, mapOpts) {
  const opts = mapOpts || {};
  const userPicked = !!opts.userPicked;
  const idx = sortedRoutes.findIndex(function(r) {
    return r && Number(r.index) === Number(route && route.index);
  });
  const slot = idx >= 0 ? idx : 0;
  const isFocus =
    userPicked &&
    focusRoute &&
    route &&
    Number.isFinite(route.index) &&
    Number(route.index) === Number(focusRoute.index);
  const c = crRoutePaletteColorForSlot(slot);
  if (userPicked && isFocus) {
    return { strokeColor: "#f5ff2e", strokeWeight: 10, strokeOpacity: 1, zIndex: 1000 };
  }
  if (userPicked && !isFocus) {
    return { strokeColor: c, strokeWeight: 3, strokeOpacity: 0.08, zIndex: 8 + slot };
  }
  return { strokeColor: c, strokeWeight: 5, strokeOpacity: 0.92, zIndex: 30 + slot };
}
try {
  window.crSortRoutesByIndex = crSortRoutesByIndex;
  window.crRoutePaletteColorForSlot = crRoutePaletteColorForSlot;
  window.crRoutePolylineOptionsForMap = crRoutePolylineOptionsForMap;
} catch (_) {}

function tz8GetDecisionAlternatives(decision, best, routes) {
  const fromDecision = decision && Array.isArray(decision.alternatives) ? decision.alternatives : [];
  const fallback = Array.isArray(routes) ? routes.filter(function(route) { return !tz8SameRoute(route, best); }) : [];
  const merged = [];

  fromDecision.concat(fallback).forEach(function(route) {
    if (!route || tz8SameRoute(route, best)) return;
    const exists = merged.some(function(item) { return tz8SameRoute(item, route); });
    if (!exists) merged.push(route);
  });

  return merged.sort(function(a, b) {
    const ar = Number.isFinite(a.decisionRank) ? a.decisionRank : 99;
    const br = Number.isFinite(b.decisionRank) ? b.decisionRank : 99;
    if (ar !== br) return ar - br;
    const as = Number.isFinite(a.decisionScore) ? a.decisionScore : (Number.isFinite(a.score) ? a.score : 999999);
    const bs = Number.isFinite(b.decisionScore) ? b.decisionScore : (Number.isFinite(b.score) ? b.score : 999999);
    return as - bs;
  });
}

function tz8RouteDistanceKm(route) {
  if (!route) return 0;
  if (Number.isFinite(route.distanceKm)) return Math.round(route.distanceKm * 10) / 10;
  if (Number.isFinite(route.distance)) return Math.round((route.distance / 1000) * 10) / 10;
  return 0;
}

// ============================================================
//  ТЗ-9 — ROUTE CARDS UI CLEANUP
//  Make alternatives readable in 3 seconds: time, difference, character, WHY.
// ============================================================
function tz9RouteCharacter(route, best) {
  const diff = _tz1Minutes(route) - _tz1Minutes(best);
  const traffic = String(route && (route.traffic || route.trafficLevel || "")).toLowerCase();
  const stops = Number.isFinite(route && route.stopsCount) ? route.stopsCount : 0;
  const complexity = Number.isFinite(route && route.complexityScore) ? route.complexityScore : 0;

  if (diff < 0) return "FASTER OPTION";
  if (traffic === "low" || traffic === "light") return "CALMER TRAFFIC";
  if (stops <= 2 && complexity <= 4) return "SMOOTHER DRIVE";
  if (diff <= 2) return "SIMILAR ETA";
  if (traffic === "heavy" || traffic === "high") return "TRAFFIC RISK";
  return "ALTERNATIVE ROUTE";
}

function tz9TrafficClass(route) {
  const traffic = String(route && (route.traffic || route.trafficLabel || "medium")).toLowerCase();
  if (traffic.includes("low") || traffic.includes("light") || traffic.includes("stable")) return "traffic-low";
  if (traffic.includes("heavy") || traffic.includes("high") || traffic.includes("busy")) return "traffic-heavy";
  return "traffic-medium";
}

function tz9CleanReason(route, best, analyzedRoutes) {
  let reason = "";
  if (Array.isArray(route && route.whyPoints) && route.whyPoints.length) reason = route.whyPoints[0];
  else reason = (route && route.why) || (typeof _tz2BuildWhy === "function" ? _tz2BuildWhy(route, analyzedRoutes) : "Alternative route available");

  reason = String(reason || "Alternative route available")
    .replace(/\s+/g, " ")
    .replace(/ · /g, ". ")
    .trim();

  if (reason.length > 92) reason = reason.slice(0, 89).replace(/\s+\S*$/, "") + "…";
  return reason;
}

function tz8RenderAlternativeCard(route, best, analyzedRoutes, idx) {
  const diff = tz1EtaDiffMinutes(route, best);
  const diffText = diff <= 0 ? "same ETA" : "+" + diff + " min";
  const roleCls = diff < 0 ? "faster" : route.traffic === "low" ? "no-tolls" : "relaxed";
  const distanceText = tz8RouteDistanceKm(route) ? tz8RouteDistanceKm(route) + " km" : "distance n/a";
  const rank = Number.isFinite(route.decisionRank) ? route.decisionRank : idx + 2;
  const character = tz9RouteCharacter(route, best);
  const reason = tz9CleanReason(route, best, analyzedRoutes);
  const trafficText = route.trafficLabel || route.traffic || "traffic";
  const scoreValue = Math.round(route.decisionScore || route.score || 0);
  const bestAltClass = idx === 0 ? " best-alt" : "";

  let h = "";
  h += '<div class="alt-card-p tz9-alt-card" onclick="openRouteDetails(' + route.index + ')" data-decision-rank="' + _tz1EscapeHTML(rank) + '" data-best-alternative="' + (idx === 0 ? 'true' : 'false') + '">';
  h += '<div class="alt-bar ' + roleCls + '"></div>';
  h += '<div class="alt-body">';
  h += '<div class="tz9-route-tag' + bestAltClass + '">' + (idx === 0 ? 'BEST ALTERNATIVE' : 'ALTERNATIVE ' + (idx + 1)) + '</div>';
  h += '<div class="tz9-route-main"><div class="tz9-route-time">' + _tz1Minutes(route) + ' min</div><div class="tz9-route-diff' + (diff > 0 ? ' warn' : '') + '">' + _tz1EscapeHTML(diffText) + '</div></div>';
  h += '<div class="tz9-route-title">' + _tz1EscapeHTML(character) + ' · via ' + _tz1EscapeHTML(_tz1RouteName(route)) + '</div>';
  h += '<div class="tz9-route-reason">' + _tz1EscapeHTML(reason) + '</div>';
  h += '<div class="tz9-route-meta">';
  h += '<span class="tz9-pill">' + _tz1EscapeHTML(distanceText) + '</span>';
  h += '<span class="tz9-pill ' + tz9TrafficClass(route) + '">' + _tz1EscapeHTML(trafficText) + '</span>';
  h += '<span class="tz9-pill">score ' + _tz1EscapeHTML(scoreValue) + '</span>';
  h += '</div>';
  h += '</div>';
  h += '<div class="tz9-alt-end"><div class="tz9-score-label">rank</div><div class="tz9-score-value">#' + _tz1EscapeHTML(rank) + '</div></div>';
  h += '</div>';
  return h;
}
