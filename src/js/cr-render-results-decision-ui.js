// ТЗ-2 [v02] — renderResults(): блок results + ТЗ-6 DECISION UI BINDING (currentDecision).
// Загружается после cr-route-cards-ui-cleanup; onclick openRouteDetails / toggleAlternatives — в cr-route-compare-modal-ui.js [v04].
// Зависит от main: глобалей маршрута, t(), _tz1*, _tz2BuildWhy/TradeOff, …

function crI18nSub(str, o) {
  let s = String(str || "");
  Object.keys(o || {}).forEach(function(k) {
    s = s.split("{" + k + "}").join(String(o[k]));
  });
  return s;
}

function crSalikSummaryForAdvisor(route, tk) {
  if (!route || typeof tk !== "function") return "";
  if (crSalikUncertain(route)) return tk("salik_disclaimer_uncertain");
  const aed = crRouteSalikAed(route);
  const g = Math.max(0, Math.round(Number(route.salikCount != null ? route.salikCount : route.tollCount) || 0));
  if (aed < 0.01) return tk("ai_adv_salik_free");
  return crI18nSub(tk("ai_adv_salik_paid"), { aed: Math.round(aed * 100) / 100, n: g });
}

function crRouteDisplayNum(route) {
  if (!route) return "";
  const n = route.displayIndex != null ? Number(route.displayIndex) : Number(route.index) + 1;
  return String(Number.isFinite(n) ? n : 1);
}

function crAltRoutesComputeRefs(allRoutes) {
  const list = Array.isArray(allRoutes)
    ? allRoutes.filter(function(r) { return r && Number.isFinite(r.index); })
    : [];
  let fastest = null;
  let calmest = null;
  if (list.length) {
    fastest = list.slice().sort(function(a, b) { return _tz1Minutes(a) - _tz1Minutes(b); })[0];
    calmest = list.slice().sort(function(a, b) {
      const ca = Number.isFinite(a.calmStressScore) ? a.calmStressScore : (Number(a.stressScore) || 999);
      const cb = Number.isFinite(b.calmStressScore) ? b.calmStressScore : (Number(b.stressScore) || 999);
      if (ca !== cb) return ca - cb;
      return _tz1Minutes(a) - _tz1Minutes(b);
    })[0];
  }
  return { fastest: fastest, calmest: calmest };
}

function crAltRouteHasNoTolls(route) {
  if (!route) return true;
  const tc = Number(route.tollCost);
  if (Number.isFinite(tc) && tc > 0) return false;
  if (route.hasToll) return false;
  return true;
}

function crRefreshRoutesSalikPricing(routes) {
  if (!Array.isArray(routes) || !routes.length) return;
  try {
    if (window.clearRoadTZ4UAE && typeof clearRoadTZ4UAE.refreshRoutesSalikPricing === "function") {
      clearRoadTZ4UAE.refreshRoutesSalikPricing(routes, new Date());
      return;
    }
  } catch (_) {}
  const ppg =
    typeof window.getSalikPriceUAE === "function"
      ? getSalikPriceUAE(new Date())
      : 4;
  routes.forEach(function(r) {
    if (!r) return;
    const cnt = Number(r.salikCount != null ? r.salikCount : r.tollCount) || 0;
    r.salikCount = Math.max(0, Math.round(cnt));
    r.salikPricePerGate = ppg;
    const raw = r.salikCount * ppg;
    r.salikCost = Math.round(raw * 100) / 100;
    r.tollCost = r.salikCost;
    r.hasToll = r.salikCost > 0;
    r.tolls = r.salikCost > 0;
  });
}

function crRouteSalikAed(route) {
  if (!route) return 0;
  const c = Number(route.salikCost != null ? route.salikCost : route.tollCost);
  return Number.isFinite(c) ? c : 0;
}

function crSalikUncertain(route) {
  return !!(route && route.salikEstimateUncertain);
}

function crComputeSalikWaitHint(route, tk, sub) {
  const cnt = route ? Number(route.salikCount != null ? route.salikCount : route.tollCount) || 0 : 0;
  if (cnt < 1) return null;
  const getP =
    window.clearRoadTZ4UAE && typeof clearRoadTZ4UAE.getSalikPricePerGate === "function"
      ? function(d) { return clearRoadTZ4UAE.getSalikPricePerGate(d); }
      : typeof window.getSalikPriceUAE === "function"
        ? window.getSalikPriceUAE
        : null;
  if (typeof getP !== "function") return null;
  const now = new Date();
  const later = new Date(now.getTime() + 15 * 60 * 1000);
  const p0 = Number(getP(now));
  const p1 = Number(getP(later));
  if (!(p1 < p0)) return null;
  if (p0 === 6 && p1 === 4) {
    return {
      decision: sub(tk("salik_wait_peak_to_off"), { n: 15 }),
      reason: sub(tk("salik_wait_peak_to_off_reason"), { aed: cnt * (p0 - p1) })
    };
  }
  if (p1 === 0 && p0 > 0) {
    return {
      decision: tk("salik_wait_to_free_decision"),
      reason: sub(tk("salik_wait_to_free_reason"), { n: cnt * p0 })
    };
  }
  return {
    decision: sub(tk("salik_wait_generic_decision"), { n: 15, from: p0, to: p1 }),
    reason: sub(tk("salik_wait_generic_reason"), { aed: cnt * (p0 - p1) })
  };
}

function crFindFastestFreeRoute(routes) {
  const list = Array.isArray(routes)
    ? routes.filter(function(r) { return r && Number.isFinite(r.index); })
    : [];
  const frees = list.filter(function(r) { return crRouteSalikAed(r) < 0.01; });
  if (!frees.length) return null;
  return frees.slice().sort(function(a, b) {
    return crHeroMinutesForRoute(a) - crHeroMinutesForRoute(b);
  })[0];
}

function crBuildSalikHeroExtras(panelRoute, matchedBest, analyzedRoutes, tk, sub) {
  const out = {
    salikLine: "",
    salikPick: "",
    disclaimer: "",
    salikWaitOverride: null
  };
  const list = Array.isArray(analyzedRoutes) ? analyzedRoutes : [];
  if (!panelRoute || !list.length) return out;

  var sw = crComputeSalikWaitHint(panelRoute, tk, sub);
  if (sw) out.salikWaitOverride = sw;

  if (crSalikUncertain(panelRoute)) {
    out.disclaimer = tk("salik_disclaimer_uncertain");
  }

  const counter =
    matchedBest && panelRoute && Number(panelRoute.index) !== Number(matchedBest.index)
      ? matchedBest
      : null;
  let other = counter;
  if (!other && matchedBest && list.length > 1) {
    const cand = list
      .filter(function(r) { return r && Number(r.index) !== Number(panelRoute.index); })
      .slice()
      .sort(function(a, b) {
        return Math.abs(crHeroMinutesForRoute(a) - crHeroMinutesForRoute(panelRoute)) -
          Math.abs(crHeroMinutesForRoute(b) - crHeroMinutesForRoute(panelRoute));
      });
    other = cand[0] || null;
  }
  if (!other || Number(other.index) === Number(panelRoute.index)) {
    const engineBest = matchedBest;
    const freeBest = crFindFastestFreeRoute(list);
    if (engineBest && freeBest && Number(engineBest.index) !== Number(freeBest.index)) {
      const tE = crHeroMinutesForRoute(engineBest);
      const tF = crHeroMinutesForRoute(freeBest);
      const cE = crRouteSalikAed(engineBest);
      const save = tF - tE;
      if (cE > 4 && save < 5) {
        out.salikPick = tk("salik_rule_recommend_free");
      } else if (cE > 0 && save >= 8) {
        out.salikPick = tk("salik_rule_recommend_paid");
      } else if (cE > 0) {
        out.salikPick = tk("salik_rule_either");
      }
    }
    return out;
  }

  const pMin = crHeroMinutesForRoute(panelRoute);
  const oMin = crHeroMinutesForRoute(other);
  const pCost = crRouteSalikAed(panelRoute);
  const oCost = crRouteSalikAed(other);
  const dMin = pMin - oMin;
  const dCost = pCost - oCost;

  if (Math.abs(dMin) < 2 && Math.abs(dCost) < 1.5) {
    out.salikLine = tk("salik_compare_same_time_cost");
    out.salikPick = tk("salik_pick_either");
  } else if (dMin <= -3 && dCost > 0.5) {
    out.salikLine = sub(tk("salik_line_faster_costs"), { m: Math.abs(dMin), aed: Math.round(dCost) });
    out.salikPick = tk("salik_pick_time_priority");
  } else if (dMin >= 3 && oCost < pCost - 0.5) {
    out.salikLine = sub(tk("salik_line_free_slower"), { m: Math.abs(dMin) });
    out.salikPick = tk("salik_pick_money_priority");
  } else if (Math.abs(dMin) < 5 && pCost > 4 && matchedBest && Number(panelRoute.index) === Number(matchedBest.index)) {
    out.salikLine = sub(tk("salik_line_small_time_paid"), { m: Math.abs(dMin), aed: Math.round(pCost) });
    out.salikPick = tk("salik_pick_consider_free");
  } else if (pCost > 0.5 && oCost < 0.5 && dMin < 0) {
    out.salikLine = sub(tk("salik_line_faster_costs"), { m: Math.abs(dMin), aed: Math.round(pCost) });
    out.salikPick = tk("salik_pick_time_priority");
  } else if (pCost < 0.5 && oCost > 0.5 && dMin > 0) {
    out.salikLine = sub(tk("salik_line_free_slower"), { m: Math.abs(dMin) });
    out.salikPick = tk("salik_pick_money_priority");
  } else {
    out.salikLine = tk("salik_compare_same_time_cost");
    out.salikPick = tk("salik_pick_either");
  }

  const engineBest = matchedBest;
  const freeBest = crFindFastestFreeRoute(list);
  if (engineBest && freeBest && crRouteSalikAed(engineBest) > 4) {
    const save = crHeroMinutesForRoute(freeBest) - crHeroMinutesForRoute(engineBest);
    if (save < 5 && Number(panelRoute.index) === Number(engineBest.index)) out.salikPick = tk("salik_rule_recommend_free");
  }
  if (engineBest && freeBest && crRouteSalikAed(engineBest) > 0) {
    const save = crHeroMinutesForRoute(freeBest) - crHeroMinutesForRoute(engineBest);
    if (save >= 8 && Number(panelRoute.index) === Number(engineBest.index)) out.salikPick = tk("salik_rule_recommend_paid");
  }

  return out;
}

/**
 * Premium decision copy: max 2 phrases, outcome-first (existing metrics only).
 * @param {object} route
 * @param {number} [displayNum] — UI route # (1-based), for lead-row treatment
 */
function buildRouteSellingPoints(route, displayNum) {
  if (!route) return [];
  const tk = typeof t === "function" ? t : function(k) { return k; };
  const best = currentDecision && currentDecision.bestRoute;
  const routes = Array.isArray(analyzedRoutes)
    ? analyzedRoutes.filter(function(r) { return r && Number.isFinite(r.index); })
    : [];

  const num =
    Number(displayNum) > 0
      ? Number(displayNum)
      : Number(route.displayIndex) > 0
        ? Number(route.displayIndex)
        : Number(route.index) + 1;

  const rankOf = function(r) {
    return typeof _tz1TrafficRank === "function" ? _tz1TrafficRank(r.traffic) : 2;
  };
  const minOf = function(r) {
    return typeof _tz1Minutes === "function" ? Math.round(_tz1Minutes(r)) : 0;
  };

  let fastest = null;
  let calmest = null;
  if (routes.length) {
    fastest = routes.slice().sort(function(a, b) { return minOf(a) - minOf(b); })[0];
    calmest = routes.slice().sort(function(a, b) {
      const ca = Number.isFinite(a.calmStressScore) ? a.calmStressScore : (Number(a.stressScore) || 999);
      const cb = Number.isFinite(b.calmStressScore) ? b.calmStressScore : (Number(b.stressScore) || 999);
      if (ca !== cb) return ca - cb;
      return minOf(a) - minOf(b);
    })[0];
  }

  const rMin = minOf(route);
  const bMin = best ? minOf(best) : rMin;
  const deltaVsBest = bMin - rMin;
  const rankR = rankOf(route);
  const rankB = best ? rankOf(best) : rankR;
  const isFastest =
    fastest &&
    routes.length >= 1 &&
    Number(fastest.index) === Number(route.index);
  const isCalmest =
    calmest &&
    routes.length >= 1 &&
    Number(calmest.index) === Number(route.index);
  const isAi = best && Number(route.index) === Number(best.index);

  const delayR = Number(route.delayMinutes) || 0;
  const delayB = best ? Number(best.delayMinutes) || 0 : delayR;
  const compR = Number(route.complexity) || 0;
  const compB = best ? Number(best.complexity) || 0 : compR;
  const stressR = Number(route.stressScore);
  const stressB = best ? Number(best.stressScore) : NaN;
  const hwR = Number(route.highwayShare) || 0;
  const hwB = best ? Number(best.highwayShare) || 0 : hwR;
  const noToll = crAltRouteHasNoTolls(route);
  const bestHasToll = best && !crAltRouteHasNoTolls(best);

  const pushPair = function(a, b) {
    const out = [];
    if (a) out.push(a);
    if (b && b !== a) out.push(b);
    return out.slice(0, 2);
  };

  /** #1 in list = headline lane: reads as the default recommendation. */
  if (num === 1) {
    if (isAi) return pushPair(tk("alt_pv_r1_ai_a"), tk("alt_pv_r1_ai_b"));
    if (isFastest) return pushPair(tk("alt_pv_r1_fast_a"), tk("alt_pv_r1_fast_b"));
    if (isCalmest) return pushPair(tk("alt_pv_r1_calm_a"), tk("alt_pv_r1_calm_b"));
    if (noToll && bestHasToll) return pushPair(tk("alt_pv_r1_cash_a"), tk("alt_pv_r1_cash_b"));
    if (rankR === 1 && rankB > 1) {
      return pushPair(tk("alt_pv_r1_clear_a"), tk("alt_pv_r1_clear_b"));
    }
    if (deltaVsBest >= 1) {
      return pushPair(
        tk("alt_pv_save_a").replace(/\{n\}/g, String(Math.max(1, deltaVsBest))),
        tk("alt_pv_save_b_clear")
      );
    }
    return pushPair(tk("alt_pv_r1_default_a"), tk("alt_pv_r1_default_b"));
  }

  if (isAi) return pushPair(tk("alt_pv_ai_alt_a"), tk("alt_pv_ai_alt_b"));

  if (isFastest) {
    return pushPair(
      tk("alt_pv_fast_a"),
      hwR >= 0.42 ? tk("alt_pv_fast_hwy_b") : tk("alt_pv_fast_b")
    );
  }

  if (isCalmest) return pushPair(tk("alt_pv_calm_a"), tk("alt_pv_calm_b"));

  if (deltaVsBest >= 1) {
    return pushPair(
      tk("alt_pv_save_a").replace(/\{n\}/g, String(Math.max(1, deltaVsBest))),
      rankR < rankB ? tk("alt_pv_save_b_spike") : tk("alt_pv_save_b_run")
    );
  }

  if (noToll && bestHasToll) {
    const add = Math.max(1, Math.abs(deltaVsBest));
    return pushPair(
      tk("alt_pv_toll_a"),
      deltaVsBest <= -1
        ? tk("alt_pv_toll_b_long").replace(/\{n\}/g, String(add))
        : tk("alt_pv_toll_b_same")
    );
  }

  if (rankR < rankB || (rankR === 1 && rankB > 1)) {
    return pushPair(tk("alt_pv_spike_a"), tk("alt_pv_spike_b"));
  }

  if (delayR + 2 <= delayB && delayB > 2) {
    return pushPair(tk("alt_pv_jam_a"), tk("alt_pv_jam_b"));
  }

  if (compR + 2 <= compB && compR <= 10) {
    return pushPair(tk("alt_pv_turns_easy_a"), tk("alt_pv_turns_easy_b"));
  }

  if (Number.isFinite(stressR) && Number.isFinite(stressB) && stressR < stressB - 1) {
    return pushPair(tk("alt_pv_calm_a"), tk("alt_pv_stress_b"));
  }

  if (hwR >= hwB + 0.12 && hwR >= 0.4) {
    return pushPair(tk("alt_pv_hwy_a"), tk("alt_pv_hwy_b"));
  }

  if (best && compR >= compB + 4 && compR >= 12) {
    return pushPair(tk("alt_pv_turns_hard_a"), tk("alt_pv_turns_hard_b"));
  }

  if (deltaVsBest <= -2 && noToll) {
    return pushPair(
      tk("alt_pv_budget_a"),
      tk("alt_pv_budget_b").replace(/\{n\}/g, String(Math.max(1, Math.abs(deltaVsBest))))
    );
  }

  return pushPair(tk("alt_pv_alt_a"), tk("alt_pv_alt_b"));
}
try {
  window.buildRouteSellingPoints = buildRouteSellingPoints;
} catch (_) {}

function crAltBadgesHtml(route, ctx) {
  const best = ctx.best;
  const fastest = ctx.fastest;
  const calmest = ctx.calmest;
  const badges = [];
  if (fastest && route && Number(route.index) === Number(fastest.index)) {
    badges.push({ cls: "alt-badge-fast", label: "FAST" });
  }
  if (calmest && route && Number(route.index) === Number(calmest.index)) {
    badges.push({ cls: "alt-badge-calm", label: "CALM" });
  }
  if (crAltRouteHasNoTolls(route)) {
    badges.push({ cls: "alt-badge-toll", label: "NO TOLLS" });
  }
  if (best && calmest && route && Number(route.index) !== Number(calmest.index)) {
    const rs = Number(route.stressScore);
    const bs = Number(best.stressScore);
    if (Number.isFinite(rs) && Number.isFinite(bs) && rs < bs - 0.25) {
      badges.push({ cls: "alt-badge-stress", label: "LESS STRESS" });
    }
  }
  let h = "";
  badges.forEach(function(b) {
    h += '<span class="alt-route-badge ' + b.cls + '">' + _tz1EscapeHTML(b.label) + "</span>";
  });
  return h;
}

function crRouteKmForAi(route) {
  if (!route) return 0;
  if (Number.isFinite(route.distanceKm)) return Math.round(route.distanceKm * 10) / 10;
  if (Number.isFinite(route.distance)) return Math.round((Number(route.distance) / 1000) * 10) / 10;
  return 0;
}

function crMirrorTz3TimingBranch(saving) {
  const s = Number(saving);
  if (!Number.isFinite(s)) return "same";
  if (s >= 3) return "wait";
  if (s <= -3) return "leave_now";
  if (s >= 2) return "wait";
  return "same";
}

function crHeroMinutesForRoute(route) {
  if (!route) return 1;
  try {
    if (typeof getDisplayMinutes === "function") {
      const m = getDisplayMinutes(route);
      if (Number.isFinite(Number(m))) return Math.max(1, Math.round(Number(m)));
    }
  } catch (_) {}
  if (typeof _tz1Minutes === "function") return Math.max(1, Math.round(_tz1Minutes(route)));
  if (Number.isFinite(Number(route.time))) return Math.max(1, Math.round(Number(route.time)));
  return 1;
}

/** Hero panel: route comparison + Salik + optional timing (syncs with selected route). */
function crBuildAiHeroCopy(panelRoute, matchedBest, analyzedRoutes) {
  const tk = typeof t === "function" ? t : function(k) { return k; };
  const sub = crI18nSub;
  const list = Array.isArray(analyzedRoutes)
    ? analyzedRoutes.filter(function(r) {
        return r && Number.isFinite(r.index);
      })
    : [];
  const best = matchedBest;
  const salikX = crBuildSalikHeroExtras(panelRoute, matchedBest, list, tk, sub);
  const waitMinutes =
    window.clearRoadTZ3Predictive && Number.isFinite(Number(clearRoadTZ3Predictive.waitMinutes))
      ? Number(clearRoadTZ3Predictive.waitMinutes)
      : 15;

  if (salikX.salikWaitOverride) {
    return {
      title: sub(tk("ai_adv_title_recommended"), { n: crRouteDisplayNum(panelRoute || best) }),
      decision: salikX.salikWaitOverride.decision,
      reason: salikX.salikWaitOverride.reason,
      compareAlts: "",
      salikLine: salikX.salikLine,
      salikPick: salikX.salikPick,
      salikDisclaimer: salikX.disclaimer
    };
  }

  const viewingBest = !!(panelRoute && best && Number(panelRoute.index) === Number(best.index));
  const title = viewingBest
    ? sub(tk("ai_adv_title_recommended"), { n: crRouteDisplayNum(best) })
    : sub(tk("ai_adv_title_viewing"), { n: crRouteDisplayNum(panelRoute) });

  let decision = "";
  let reason = "";
  let compareAlts = "";

  if (!best || !panelRoute) {
    return {
      title: title,
      decision: "",
      reason: "",
      compareAlts: "",
      salikLine: salikX.salikLine,
      salikPick: salikX.salikPick,
      salikDisclaimer: salikX.disclaimer
    };
  }

  if (list.length < 2) {
    decision = sub(tk("ai_adv_one_route_decision"), {
      n: crRouteDisplayNum(panelRoute),
      min: crHeroMinutesForRoute(panelRoute),
      km: crRouteKmForAi(panelRoute),
      salik: crSalikSummaryForAdvisor(panelRoute, tk)
    });
    reason = tk("ai_adv_one_route_why");
  } else {
    const sortedTime = list.slice().sort(function(a, b) {
      return crHeroMinutesForRoute(a) - crHeroMinutesForRoute(b);
    });
    const fastest = sortedTime[0];
    const refs = crAltRoutesComputeRefs(list);
    const calmest = refs.calmest;
    const freeBest = crFindFastestFreeRoute(list);

    decision = sub(tk("ai_adv_compare_decision"), {
      total: list.length,
      n: crRouteDisplayNum(best),
      min: crHeroMinutesForRoute(best),
      km: crRouteKmForAi(best),
      salik: crSalikSummaryForAdvisor(best, tk)
    });

    const parts = [];
    if (fastest && Number(fastest.index) !== Number(best.index)) {
      const diff = crHeroMinutesForRoute(fastest) - crHeroMinutesForRoute(best);
      if (diff !== 0) {
        parts.push(
          sub(tk("ai_adv_fastest_note"), {
            n: crRouteDisplayNum(fastest),
            min: crHeroMinutesForRoute(fastest),
            diff: Math.abs(Math.round(diff))
          })
        );
      }
    }
    if (calmest && best && Number(calmest.index) !== Number(best.index)) {
      const sb = Number(best.stabilityScore);
      const sc = Number(calmest.stabilityScore);
      if (Number.isFinite(sb) && Number.isFinite(sc) && sc >= sb + 8) {
        parts.push(sub(tk("ai_adv_calm_alt_note"), { n: crRouteDisplayNum(calmest) }));
      }
    }
    if (freeBest && Number(freeBest.index) !== Number(best.index)) {
      const td = crHeroMinutesForRoute(freeBest) - crHeroMinutesForRoute(best);
      const save = crRouteSalikAed(best) - crRouteSalikAed(freeBest);
      if (save > 0.5) {
        parts.push(
          sub(tk("ai_adv_free_alt_note"), {
            n: crRouteDisplayNum(freeBest),
            m: Math.max(1, Math.round(td)),
            aed: Math.round(save)
          })
        );
      }
    }
    const delayB = Number(best.delayMinutes) || 0;
    let trLabel = tk("traf_moderate");
    const tr = typeof _tz1TrafficRank === "function" ? _tz1TrafficRank(best.traffic) : 2;
    if (tr <= 1) trLabel = tk("traf_stable");
    if (tr >= 3) trLabel = tk("traf_heavy");
    parts.push(sub(tk("ai_adv_traffic_delay"), { traf: trLabel, delay: delayB }));

    reason = parts.join(" ");
    if (!String(reason).trim()) reason = tk("ai_adv_why_balance");

    if (!viewingBest) {
      compareAlts = sub(tk("ai_adv_viewing_alt"), {
        n: crRouteDisplayNum(panelRoute),
        min: crHeroMinutesForRoute(panelRoute),
        salik: crSalikSummaryForAdvisor(panelRoute, tk),
        bestN: crRouteDisplayNum(best)
      });
    } else {
      const second = sortedTime.find(function(r) {
        return r && Number(r.index) !== Number(best.index);
      });
      if (second) {
        const md = crHeroMinutesForRoute(second) - crHeroMinutesForRoute(best);
        compareAlts = sub(tk("ai_adv_vs_second"), {
          n: crRouteDisplayNum(second),
          m: Math.abs(Math.round(md)),
          salik: crSalikSummaryForAdvisor(second, tk)
        });
      }
    }
  }

  const isBestPanel = !!(panelRoute && best && Number(panelRoute.index) === Number(best.index));
  let nowMin = crHeroMinutesForRoute(panelRoute);
  let laterMin = nowMin;
  if (
    isBestPanel &&
    typeof _predictiveData !== "undefined" &&
    _predictiveData &&
    Number.isFinite(Number(_predictiveData.nowMin)) &&
    Number.isFinite(Number(_predictiveData.laterMin))
  ) {
    nowMin = Math.max(1, Math.round(Number(_predictiveData.nowMin)));
    laterMin = Math.max(1, Math.round(Number(_predictiveData.laterMin)));
  } else {
    try {
      if (window.clearRoadTZ3Predictive && typeof clearRoadTZ3Predictive.estimateLaterMinutes === "function") {
        laterMin = clearRoadTZ3Predictive.estimateLaterMinutes(nowMin);
      }
    } catch (_) {}
    laterMin = Math.max(1, Math.round(Number(laterMin) || nowMin));
  }
  const saving = nowMin - laterMin;
  if (Math.abs(saving) >= 2) {
    const branch = crMirrorTz3TimingBranch(saving);
    if (branch === "wait") {
      reason +=
        " " +
        sub(tk("ai_hero_decision_wait"), { n: waitMinutes }) +
        " " +
        (isBestPanel ? tk("ai_hero_reason_wait_best") : tk("ai_hero_reason_wait_alt"));
    } else if (branch === "leave_now") {
      reason += " " + tk("ai_hero_decision_leave") + " " + (isBestPanel ? tk("ai_hero_reason_leave_best") : tk("ai_hero_reason_leave_alt"));
    }
  }

  return {
    title: title,
    decision: decision,
    reason: reason,
    compareAlts: compareAlts,
    salikLine: salikX.salikLine,
    salikPick: salikX.salikPick,
    salikDisclaimer: salikX.disclaimer
  };
}
try {
  window.crBuildAiHeroCopy = crBuildAiHeroCopy;
} catch (_) {}

/** Short voice (~3–5 short sentences): recommendation, time vs alt, Salik, save hint. */
function crBuildRouteAdvisorVoiceBrief(route) {
  if (!route || typeof t !== "function") return "";
  const tk = t;
  const sub = crI18nSub;
  const routes = Array.isArray(analyzedRoutes)
    ? analyzedRoutes.filter(function(r) {
        return r && Number.isFinite(r.index);
      })
    : [];
  if (!routes.length) return "";

  const best = typeof currentDecision !== "undefined" && currentDecision && currentDecision.bestRoute ? currentDecision.bestRoute : null;
  const num = crRouteDisplayNum(route);
  const isBest = best && Number(route.index) === Number(best.index);
  const minutes = function(r) {
    return crHeroMinutesForRoute(r);
  };
  const alts = routes
    .filter(function(r) {
      return Number(r.index) !== Number(route.index);
    })
    .slice()
    .sort(function(a, b) {
      return minutes(a) - minutes(b);
    });
  const mainAlt = alts[0];
  const chunks = [];

  if (isBest) {
    chunks.push(sub(tk("ai_voice_recommend_num"), { n: num }));
    if (mainAlt) {
      const d = minutes(mainAlt) - minutes(route);
      if (d >= 2) chunks.push(sub(tk("ai_voice_faster_than_alt"), { m: Math.round(d) }));
      else if (d <= -2) chunks.push(sub(tk("ai_voice_alt_faster_warning"), { m: Math.round(-d) }));
      else chunks.push(tk("ai_voice_time_close"));
    }
  } else {
    chunks.push(sub(tk("ai_voice_you_picked_num"), { n: num }));
    if (best) {
      const d = minutes(route) - minutes(best);
      if (d >= 2) chunks.push(sub(tk("ai_voice_slower_than_best"), { m: Math.round(d) }));
    }
  }

  if (crSalikUncertain(route)) chunks.push(tk("salik_disclaimer_uncertain"));
  else {
    const aed = crRouteSalikAed(route);
    if (aed >= 0.01) chunks.push(sub(tk("ai_voice_salik_cost"), { aed: Math.round(aed * 100) / 100 }));
    else chunks.push(tk("ai_voice_salik_free"));
  }

  const freeAlt = routes.find(function(r) {
    return Number(r.index) !== Number(route.index) && crRouteSalikAed(r) < 0.01;
  });
  if (freeAlt && crRouteSalikAed(route) >= 0.01) {
    chunks.push(sub(tk("ai_voice_save_take_alt"), { n: crRouteDisplayNum(freeAlt) }));
  }

  return chunks.filter(Boolean).join(" ");
}
try {
  window.crBuildRouteAdvisorVoiceBrief = crBuildRouteAdvisorVoiceBrief;
} catch (_) {}

function crBuildRouteCardAdvisorInnerHtml(route, displayNum, ctx, tk) {
  const points = buildRouteSellingPoints(route, displayNum);
  let whenKey = "route_card_when_alt";
  if (ctx.best && route && Number(route.index) === Number(ctx.best.index)) whenKey = "route_card_when_best";
  else if (ctx.fastest && route && Number(route.index) === Number(ctx.fastest.index)) whenKey = "route_card_when_fastest";
  else if (ctx.calmest && route && Number(route.index) === Number(ctx.calmest.index)) whenKey = "route_card_when_calm";
  else if (crRouteSalikAed(route) < 0.01 && ctx.best && crRouteSalikAed(ctx.best) >= 0.01) whenKey = "route_card_when_tollfree";
  const when = tk(whenKey);
  let h = '<div class="dashboard-route-advisor">';
  h += '<div class="dashboard-route-advisor-label">' + _tz1EscapeHTML(tk("route_card_advisor_heading")) + "</div>";
  points.forEach(function(line) {
    if (line) h += '<p class="dashboard-route-advisor-line">' + _tz1EscapeHTML(line) + "</p>";
  });
  h += '<p class="dashboard-route-advisor-when">' + _tz1EscapeHTML(when) + "</p>";
  h += "</div>";
  return h;
}

/** AI verdict + compact card copy (presentation only; uses existing route metrics). */
function crBuildRouteAiCopy(route, best, fastest, calmest, allRoutes) {
  const tk = typeof t === "function" ? t : function(k) { return k; };
  const minOf = function(r) {
    return typeof _tz1Minutes === "function" ? Math.round(_tz1Minutes(r)) : 0;
  };
  const isBest = best && route && Number(route.index) === Number(best.index);
  const isFastest = fastest && route && Number(route.index) === Number(fastest.index);
  let mostDirect = null;
  if (Array.isArray(allRoutes) && allRoutes.length) {
    const cand = allRoutes
      .filter(function(r) {
        return r && Number.isFinite(r.index);
      })
      .slice();
    cand.sort(function(a, b) {
      return crRouteKmForAi(a) - crRouteKmForAi(b);
    });
    mostDirect = cand[0] || null;
  }
  const isMostDirect = !!(mostDirect && !isBest && Number(route.index) === Number(mostDirect.index));
  const mR = minOf(route);
  const mB = best ? minOf(best) : mR;
  const delta = mR - mB;

  let verdictKey = "ai_verdict_alt";
  if (isBest) verdictKey = "ai_verdict_best_balance";
  else if (isFastest) verdictKey = "ai_verdict_fastest_now";
  else if (isMostDirect) verdictKey = "ai_verdict_most_direct";
  else if (delta >= 9 && !isFastest) verdictKey = "ai_verdict_not_recommended";

  let badgeKey = "ai_badge_calmer_route";
  if (isBest) badgeKey = "ai_badge_best_balance";
  else if (isFastest) badgeKey = "ai_badge_fastest_now";
  else if (verdictKey === "ai_verdict_not_recommended") badgeKey = "ai_badge_avoid";
  else badgeKey = "ai_badge_calmer_route";

  const badgeLabel = tk(badgeKey);
  let cardTitle = "";
  let cardLine1 = "";
  let cardRec = "";

  if (isBest) {
    cardTitle = tk("ai_card_title_balance");
    cardLine1 = tk("ai_card_line_balance");
    cardRec = tk("ai_card_rec_balance");
  } else if (isFastest) {
    cardTitle = tk("ai_card_title_fast");
    cardLine1 = tk("ai_card_line_fast");
    cardRec = tk("ai_card_rec_fast");
  } else if (isMostDirect) {
    cardTitle = tk("ai_card_title_shorter");
    cardLine1 = tk("ai_card_line_shorter");
    cardRec = tk("ai_card_rec_shorter");
  } else if (verdictKey === "ai_verdict_not_recommended") {
    cardTitle = tk("ai_card_title_skip");
    cardLine1 = tk("ai_card_line_skip");
    cardRec = tk("ai_card_rec_skip");
  } else {
    cardTitle = tk("ai_card_title_alt");
    cardLine1 = tk("ai_card_line_alt");
    cardRec = tk("ai_card_rec_alt");
  }

  return {
    verdictKey: verdictKey,
    badgeKey: badgeKey,
    badgeLabel: badgeLabel,
    cardTitle: cardTitle,
    cardLine1: cardLine1,
    cardRec: cardRec,
    why: cardLine1,
    trade: "",
    when: cardRec
  };
}
try {
  window.crBuildRouteAiCopy = crBuildRouteAiCopy;
} catch (_) {}

function crSalikCardHtml(route, tk) {
  const sub = function(str, o) {
    let s = String(str || "");
    Object.keys(o || {}).forEach(function(k) {
      s = s.split("{" + k + "}").join(String(o[k]));
    });
    return s;
  };
  const aed = crRouteSalikAed(route);
  const gates = Math.max(0, Math.round(Number(route.salikCount != null ? route.salikCount : route.tollCount) || 0));
  const headline =
    aed < 0.01 ? tk("salik_line_headline_free") : sub(tk("salik_line_headline_cost"), { aed: Math.round(aed * 100) / 100 });
  const note = aed > 0.01 ? tk("salik_card_note_toll") : tk("salik_card_note_free");
  const extra = crSalikUncertain(route) ? " " + tk("salik_disclaimer_uncertain") : "";
  const gatePart =
    gates > 0
      ? ' · <span class="dashboard-route-salik-gates">' + _tz1EscapeHTML(sub(tk("salik_gates_label"), { n: gates })) + "</span>"
      : "";
  return (
    '<div class="dashboard-route-salik">' +
    '<div class="dashboard-route-salik-head">' +
    _tz1EscapeHTML(headline) +
    gatePart +
    "</div>" +
    '<div class="dashboard-route-salik-note">' +
    _tz1EscapeHTML(note + extra) +
    "</div></div>"
  );
}

function crRenderAlternativeRoutesListHtml(allRoutes, best, selectedRoute, refs) {
  if (!Array.isArray(allRoutes) || !allRoutes.length || !best) return "";
  const sorted =
    typeof crSortRoutesByIndex === "function"
      ? crSortRoutesByIndex(allRoutes)
      : allRoutes
          .filter(function(r) { return r && Number.isFinite(r.index); })
          .slice()
          .sort(function(a, b) { return Number(a.index) - Number(b.index); });
  const selIdx =
    selectedRoute && Number.isFinite(selectedRoute.index) ? Number(selectedRoute.index) : NaN;
  const ctx = { best: best, fastest: refs.fastest, calmest: refs.calmest };
  let inner = "";
  sorted.forEach(function(route, slot) {
    const idx = Number(route.index);
    const isSel = Number.isFinite(selIdx) && idx === selIdx;
    const num = route.displayIndex || idx + 1;
    const min = typeof _tz1Minutes === "function" ? _tz1Minutes(route) : 0;
    const road = typeof _tz1RouteName === "function" ? _tz1RouteName(route) : "";
    const isBest = Number(route.index) === Number(best.index);
    const minUnit =
      typeof t === "function" ? t("dh_min_unit") : "min";
    const tk = typeof t === "function" ? t : function(k) { return k; };
    const isFastestRoute =
      ctx.fastest && Number(route.index) === Number(ctx.fastest.index);
    let roleBadgeLabel = tk("route_role_alt");
    let roleBadgeEmoji = "";
    if (isBest) {
      roleBadgeEmoji = "🟢 ";
      roleBadgeLabel = tk("route_role_best");
    } else if (isFastestRoute) {
      roleBadgeEmoji = "⚡ ";
      roleBadgeLabel = tk("route_role_fastest");
    }
    const distKm =
      route.distanceKm ||
      (route.distance ? Math.round((Number(route.distance) / 1000) * 10) / 10 : 0);
    const arrival = new Date(Date.now() + min * 60000);
    const arrivalStr = arrival.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const markerColor =
      typeof crRoutePaletteColorForSlot === "function"
        ? crRoutePaletteColorForSlot(slot)
        : "#3b82f6";
    const routeHeading =
      tk("ai_route_option") + " " + num + " · " + (road || tk("ai_route_unnamed"));
    inner +=
      '<div tabindex="0" role="button" class="alt-route-row dashboard-route-card' +
      (isBest ? " alt-route-row--best dashboard-route-card--ai-pick" : "") +
      (isSel ? " is-selected" : "") +
      '" data-route-index="' +
      idx +
      '" data-route-slot="' +
      slot +
      '" data-route-line-color="' +
      _tz1EscapeHTML(markerColor) +
      '" onclick="selectDisplayedRouteFromUi(' +
      idx +
      ')" onkeydown="if(event.key===&quot;Enter&quot;||event.key===&quot; &quot;){event.preventDefault();selectDisplayedRouteFromUi(' +
      idx +
      ');}">';
    inner += '<span class="dashboard-route-line-marker" style="background-color:' + markerColor + '" aria-hidden="true"></span>';
    inner += '<div class="dashboard-route-card-body">';
    inner += '<div class="alt-route-row-main">';
    inner += '<div class="dashboard-route-heading">' + _tz1EscapeHTML(routeHeading) + "</div>";
    inner += '<div class="alt-route-time-block">';
    inner +=
      '<span class="alt-route-time">' +
      _tz1EscapeHTML(String(Math.round(min))) +
      "</span>";
    inner +=
      '<span class="alt-route-time-unit">' +
      _tz1EscapeHTML(minUnit) +
      "</span>";
    inner +=
      '<span class="dashboard-route-role-badge">' +
      _tz1EscapeHTML(roleBadgeEmoji + roleBadgeLabel) +
      "</span>";
    inner += "</div>";
    inner +=
      '<div class="dashboard-route-meta">' +
      _tz1EscapeHTML(String(distKm)) +
      " km · " +
      _tz1EscapeHTML(tk("dash_eta_arrival_prefix")) +
      " " +
      _tz1EscapeHTML(arrivalStr) +
      "</div>";
    inner += crBuildRouteCardAdvisorInnerHtml(route, num, ctx, tk);
    inner += crSalikCardHtml(route, tk);
    inner +=
      '<button type="button" class="dashboard-route-select-btn" onclick="event.stopPropagation();selectDisplayedRouteFromUi(' +
      idx +
      ')">' +
      _tz1EscapeHTML(tk("ai_default_route_cta")) +
      "</button>";
    inner += "</div></div></div>";
  });
  return (
    '<section class="dashboard-routes-panel alt-routes-panel" id="alt-routes-panel">' +
    '<h2 class="dashboard-routes-title">Alternative Routes</h2>' +
    '<div class="alt-routes-list dashboard-routes-list">' +
    inner +
    "</div></section>"
  );
}

function selectDisplayedRoute(routeIndex, opts) {
  try {
    const idx = Number(routeIndex);
    if (!Array.isArray(analyzedRoutes) || !Number.isFinite(idx)) return;
    const picked = analyzedRoutes.find(function(r) { return r && Number(r.index) === idx; });
    if (!picked) return;
    try {
      window.__clearRoadUserPickIndex = idx;
    } catch (_) {}
    try {
      window.selectedRouteId = picked && picked.id != null ? picked.id : "route-" + (idx + 1);
    } catch (_) {}
    selectedRoute = picked;
    if (
      typeof currentDirectionsResult !== "undefined" &&
      currentDirectionsResult &&
      typeof drawRoutes === "function"
    ) {
      try {
        drawRoutes(currentDirectionsResult);
      } catch (e) {
        console.warn("drawRoutes after pick", e);
      }
    }
    if (typeof renderResults === "function") renderResults();
    if (opts && opts.fromUser) {
      try {
        if (typeof speakCurrentDecision === "function") {
          var nowTs = Date.now();
          if (nowTs - (window.__crLastSelectVoiceAt || 0) > 3200) {
            window.__crLastSelectVoiceAt = nowTs;
            setTimeout(function() {
              try {
                speakCurrentDecision();
              } catch (_) {}
            }, 420);
          }
        }
      } catch (_) {}
    }
  } catch (e) {
    console.warn("selectDisplayedRoute", e);
  }
}
function selectDisplayedRouteFromUi(routeIndex) {
  selectDisplayedRoute(routeIndex, { fromUser: true });
}
try {
  window.selectDisplayedRoute = selectDisplayedRoute;
} catch (_) {}
try {
  window.selectDisplayedRouteFromUi = selectDisplayedRouteFromUi;
} catch (_) {}

function selectRecommendedRoute() {
  try {
    if (!Array.isArray(analyzedRoutes) || !currentDecision || !currentDecision.bestRoute) return;
    const decisionBest = currentDecision.bestRoute;
    const decisionBestIndex = Number(decisionBest.index);
    if (!Number.isFinite(decisionBestIndex)) return;
    const found = analyzedRoutes.find(function(route) {
      return route && Number(route.index) === decisionBestIndex;
    });
    if (!found) return;
    const bi = Number(found.index);
    if (!Number.isFinite(bi)) return;
    selectDisplayedRouteFromUi(bi);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        try {
          var el = document.querySelector("#alt-routes-panel .dashboard-route-card[data-route-index=\"" + bi + '"]');
          if (!el) el = document.querySelector(".dashboard-route-card[data-route-index=\"" + bi + '"]');
          if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (_) {}
      });
    });
  } catch (e) {
    console.warn("selectRecommendedRoute", e);
  }
}
try {
  window.selectRecommendedRoute = selectRecommendedRoute;
} catch (_) {}

function renderResults() {
  const container = document.getElementById("results");
  const quickAccess = document.getElementById("quick-access");
  const aiPanel = document.getElementById("ai-decision-panel");

  function clearAiPlaceholder() {
    const ph = document.getElementById("ai-decision-placeholder");
    if (ph && ph.parentNode) ph.parentNode.removeChild(ph);
  }

  if (!container) return;
  const tk =
    typeof t === "function"
      ? t
      : function(k) {
          return k;
        };
  const lifecycleState = String(document.documentElement.getAttribute("data-route-state") || "").toUpperCase();
  const hasRenderableRoutes =
    Array.isArray(analyzedRoutes) &&
    analyzedRoutes.length > 0 &&
    currentDecision &&
    currentDecision.bestRoute;

  function idlePlaceholderHtml() {
    return (
      '<div class="dashboard-routes-empty-placeholder">' +
      _tz1EscapeHTML(tk("ai_panel_insights_empty")) +
      "</div>"
    );
  }

  function resetAiPanelIdle() {
    if (!aiPanel) return;
    aiPanel.innerHTML =
      '<div class="dashboard-ai-placeholder" id="ai-decision-placeholder">' +
      _tz1EscapeHTML(tk("ai_panel_insights_empty")) +
      "</div>";
  }

  if (lifecycleState === "IDLE") {
    container.innerHTML = idlePlaceholderHtml();
    resetAiPanelIdle();
    if (quickAccess) quickAccess.classList.remove("hidden");
    return;
  }
  if (lifecycleState === "ERROR") {
    if (!hasRenderableRoutes) {
      container.innerHTML = idlePlaceholderHtml();
      if (quickAccess) quickAccess.classList.remove("hidden");
      resetAiPanelIdle();
      return;
    }
  }
  if (!Array.isArray(analyzedRoutes) || !analyzedRoutes.length) {
    container.innerHTML = idlePlaceholderHtml();
    resetAiPanelIdle();
    if (quickAccess) quickAccess.classList.remove("hidden");
    return;
  }

  if (quickAccess) quickAccess.classList.add("hidden");

  // ============================================================
  //  ТЗ-6 — DECISION UI BINDING
  // ============================================================
  if (!currentDecision || !currentDecision.bestRoute) {
    container.innerHTML = idlePlaceholderHtml();
    resetAiPanelIdle();
    return;
  }
  if (!Array.isArray(currentDecision.alternatives)) {
    try { currentDecision.alternatives = []; } catch (_alt) {}
  }

  const best = currentDecision.bestRoute;
  if (!best) {
    container.innerHTML = idlePlaceholderHtml();
    resetAiPanelIdle();
    return;
  }
  const decisionBestIndex = Number(best.index);
  let matchedBest = best;
  if (Number.isFinite(decisionBestIndex)) {
    const found = analyzedRoutes.find(function(route) { return route && Number(route.index) === decisionBestIndex; });
    if (found) {
      matchedBest = found;
      _bestRoute = found;
    }
  }
  let pickIdx = null;
  try {
    pickIdx = window.__clearRoadUserPickIndex;
  } catch (_) {
    pickIdx = null;
  }
  const pickNum = Number(pickIdx);
  if (Number.isFinite(pickNum)) {
    const picked = analyzedRoutes.find(function(route) { return route && Number(route.index) === pickNum; });
    if (picked) {
      selectedRoute = picked;
    } else {
      try {
        window.__clearRoadUserPickIndex = null;
      } catch (_) {}
      try {
        window.selectedRouteId = null;
      } catch (_) {}
      selectedRoute = matchedBest;
    }
  } else {
    selectedRoute = matchedBest;
  }
  try {
    if (selectedRoute && selectedRoute.id != null) window.selectedRouteId = selectedRoute.id;
    else if (selectedRoute && Number.isFinite(selectedRoute.index))
      window.selectedRouteId = "route-" + (Number(selectedRoute.index) + 1);
  } catch (_sid) {}
  const decisionAlternatives = tz8GetDecisionAlternatives(currentDecision, best, analyzedRoutes);
  if (currentDecision) currentDecision.alternatives = decisionAlternatives;

  const altRefs = crAltRoutesComputeRefs(analyzedRoutes);

  const panelRoute =
    selectedRoute && analyzedRoutes.some(function(r) { return r && selectedRoute && Number(r.index) === Number(selectedRoute.index); })
      ? selectedRoute
      : best;
  crRefreshRoutesSalikPricing(analyzedRoutes);
  const aiHero = crBuildAiHeroCopy(panelRoute, matchedBest, analyzedRoutes);

  if (aiPanel) {
    clearAiPlaceholder();
    const salikExtras =
      (aiHero.salikLine
        ? '<p class="dashboard-ai-compact-line dashboard-ai-salik-compare" id="ai-hero-salik">' +
          _tz1EscapeHTML(aiHero.salikLine) +
          "</p>"
        : "") +
      (aiHero.salikPick
        ? '<p class="dashboard-ai-compact-rec dashboard-ai-salik-pick" id="ai-hero-salik-pick">' +
          _tz1EscapeHTML(aiHero.salikPick) +
          "</p>"
        : "") +
      (aiHero.salikDisclaimer
        ? '<p class="dashboard-ai-salik-disclaimer">' + _tz1EscapeHTML(aiHero.salikDisclaimer) + "</p>"
        : "");
    aiPanel.innerHTML =
      '<div class="dashboard-ai-inner decision-hero" data-bound-to="currentDecision" data-best-route-index="' +
      _tz1EscapeHTML(String(best.index)) +
      '" data-selected-route-index="' +
      _tz1EscapeHTML(String(panelRoute && Number.isFinite(panelRoute.index) ? panelRoute.index : "")) +
      '">' +
      '<p class="dashboard-ai-compact-title" id="ai-hero-title">' +
      _tz1EscapeHTML(aiHero.title) +
      "</p>" +
      '<p class="dashboard-ai-compact-line dashboard-ai-text" id="ai-hero-decision">' +
      _tz1EscapeHTML(aiHero.decision) +
      "</p>" +
      '<p class="dashboard-ai-compact-rec" id="ai-hero-reason">' +
      _tz1EscapeHTML(aiHero.reason) +
      "</p>" +
      (aiHero.compareAlts
        ? '<p class="dashboard-ai-compact-line dashboard-ai-compare-alts" id="ai-hero-compare">' +
          _tz1EscapeHTML(aiHero.compareAlts) +
          "</p>"
        : "") +
      salikExtras +
      '<button type="button" class="dashboard-ai-primary-btn" id="ai-default-cta" onclick="selectRecommendedRoute()">' +
      _tz1EscapeHTML(tk("ai_default_route_cta")) +
      "</button>" +
      "</div>";
  }

  let h = "";
  h += '<div class="predictive-card" id="predictive-card" style="display:none"><div class="pc-icon">&#9200;</div><div class="pc-content"><div class="pc-title">' + _tz1EscapeHTML(t("dh_pred_title")) + '</div><div class="pc-main" id="pc-main"></div><div class="pc-sub" id="pc-sub"></div></div><div class="pc-save" id="pc-save"></div></div>';

  h += crRenderAlternativeRoutesListHtml(analyzedRoutes, best, selectedRoute, altRefs);

  h += '<div class="predict-tip" id="predict-tip" style="display:none"></div>';
  h +=
    '<div id="other-routes-section" class="other-routes tz8-visible expanded dashboard-other-routes-stub" aria-hidden="true"></div>';

  container.innerHTML = h;
  if (typeof crNormalizeDurationNode === "function") {
    try { crNormalizeDurationNode(document); } catch (_e) {}
  }

  if (typeof renderPredictiveDecision === "function") {
    try { renderPredictiveDecision(); } catch (e) { console.warn("predictive render skipped", e); }
  }
}
