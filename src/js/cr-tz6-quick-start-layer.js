// ============================================================
//  ТЗ-6 — SAVED PLACES / QUICK START / RECENT PLACES LAYER
//  Safe additive layer: does not replace GPS, Drive Mode, Predictive,
//  UAE/Salik, Filters/Preferences, or route rendering logic.
// ============================================================
(function(){
  "use strict";

  const TZ6QS_SAVED_KEY = "clearRoadUAE.savedPlaces.v2";
  const TZ6QS_LEGACY_KEY = typeof SAVED_PLACES_KEY !== "undefined" ? SAVED_PLACES_KEY : "clearRoadUAE.savedPlaces.v1";
  const TZ6QS_RECENTS_KEY = "clearRoadUAE.recentPlaces.v1";
  const TZ6QS_MAX_RECENTS = 5;

  function tz6qsLog(label, err) {
    try { console.warn("[TZ6 Quick Start] " + label, err); } catch (_) {}
  }

  function tz6qsEscape(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function(ch){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch];
    });
  }

  function tz6qsReadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function tz6qsWriteJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      tz6qsLog("localStorage write failed", e);
      return false;
    }
  }

  function tz6qsNormalizePlaceName(name) {
    const lower = String(name || "").toLowerCase();
    if (lower === "home") return "Home";
    if (lower === "work") return "Work";
    return String(name || "").trim() || "Saved";
  }

  function tz6qsDefaultSaved() {
    return { Home: "", Work: "" };
  }

  function tz6qsSavedPlaces() {
    const base = tz6qsDefaultSaved();
    const legacy = tz6qsReadJSON(TZ6QS_LEGACY_KEY, {});
    const current = tz6qsReadJSON(TZ6QS_SAVED_KEY, {});
    const merged = Object.assign({}, base, legacy || {}, current || {});
    Object.keys(merged).forEach(function(k){
      if (typeof merged[k] !== "string") merged[k] = "";
      merged[k] = merged[k].trim();
    });
    return merged;
  }

  function tz6qsSavePlace(name, address) {
    const key = tz6qsNormalizePlaceName(name);
    const value = String(address || "").trim();
    if (!value) return false;
    const places = tz6qsSavedPlaces();
    places[key] = value;
    const ok = tz6qsWriteJSON(TZ6QS_SAVED_KEY, places);
    try {
      if (typeof savePlace === "function") savePlace(key, value);
    } catch (_) {}
    tz6qsRenderPanel();
    return ok;
  }

  function tz6qsGetPlace(name) {
    const key = tz6qsNormalizePlaceName(name);
    const places = tz6qsSavedPlaces();
    if (places[key]) return places[key];
    try {
      if (typeof getSavedPlace === "function") return getSavedPlace(key) || null;
    } catch (_) {}
    return null;
  }

  function tz6qsRecents() {
    const list = tz6qsReadJSON(TZ6QS_RECENTS_KEY, []);
    return Array.isArray(list) ? list.filter(function(item){
      return item && typeof item.address === "string" && item.address.trim();
    }).slice(0, TZ6QS_MAX_RECENTS) : [];
  }

  function tz6qsAddRecent(address, label) {
    const clean = String(address || "").trim();
    if (!clean) return;
    const list = tz6qsRecents().filter(function(item){
      return item.address.toLowerCase() !== clean.toLowerCase();
    });
    list.unshift({
      label: String(label || clean).trim().slice(0, 80),
      address: clean,
      ts: Date.now()
    });
    tz6qsWriteJSON(TZ6QS_RECENTS_KEY, list.slice(0, TZ6QS_MAX_RECENTS));
    tz6qsRenderPanel();
  }

  function tz6qsSetEndAndRoute(address, label) {
    const endField = document.getElementById("end");
    if (!endField) return;
    endField.value = String(address || "").trim();
    if (!endField.value) return;
    tz6qsAddRecent(endField.value, label || endField.value);
    try {
      if (typeof calculateRoutes === "function") calculateRoutes();
    } catch (e) {
      tz6qsLog("calculateRoutes from quick start", e);
    }
  }

  function tz6qsPromptAndSave(name) {
    const key = tz6qsNormalizePlaceName(name);
    const current = tz6qsGetPlace(key) || "";
    const value = window.prompt((current ? "Update " : "Enter ") + key + " address:", current);
    if (value === null) return;
    const clean = value.trim();
    if (!clean) return;
    tz6qsSavePlace(key, clean);
    tz6qsSetEndAndRoute(clean, key);
  }

  function tz6qsUseSaved(name) {
    const key = tz6qsNormalizePlaceName(name);
    const address = tz6qsGetPlace(key);
    if (!address) {
      tz6qsPromptAndSave(key);
      return;
    }
    tz6qsSetEndAndRoute(address, key);
  }

  function tz6qsClearRecents() {
    tz6qsWriteJSON(TZ6QS_RECENTS_KEY, []);
    tz6qsRenderPanel();
  }

  function tz6qsEnsureCSS() {
    if (document.getElementById("tz6-quickstart-css")) return;
    const style = document.createElement("style");
    style.id = "tz6-quickstart-css";
    style.textContent = `
      .tz6-quickstart-panel {
        margin: 0 14px 12px;
        padding: 12px;
        border-radius: 22px;
        background: hsla(220,11%,10%,.72);
        border: 1px solid hsla(220,10%,20%,.74);
        box-shadow: 0 14px 38px -24px rgba(0,0,0,.7);
      }
      .tz6-quickstart-head {
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        margin-bottom: 10px;
      }
      .tz6-quickstart-title {
        font-size: 10px; font-weight: 800; letter-spacing: .16em;
        text-transform: uppercase; color: var(--text2);
      }
      .tz6-quickstart-edit {
        border: 1px solid hsla(72,96%,56%,.18);
        background: hsla(72,96%,56%,.08);
        color: var(--green);
        border-radius: 999px;
        padding: 5px 9px;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
        cursor:pointer;
        font-family: inherit;
      }
      .tz6-quickstart-row {
        display:grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 9px;
      }
      .tz6-quick-card {
        display:flex; align-items:center; gap:9px;
        min-width:0;
        padding: 11px 10px;
        border-radius: 15px;
        border: 1px solid var(--border2);
        background: hsla(220,14%,8%,.68);
        color: var(--text);
        cursor:pointer;
        text-align:left;
        font-family: inherit;
      }
      .tz6-quick-card:active { transform: scale(.985); }
      .tz6-quick-icon {
        width: 32px; height: 32px; border-radius: 11px;
        display:grid; place-items:center;
        background: hsla(72,96%,56%,.10);
        color: var(--green);
        flex-shrink:0;
      }
      .tz6-quick-body { min-width:0; flex:1; }
      .tz6-quick-label {
        font-size: 13px; font-weight: 750; color: var(--text); line-height:1.15;
      }
      .tz6-quick-address {
        margin-top: 3px;
        font-size: 11px; color: var(--text2);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .tz6-recent-list {
        display:flex; gap:7px; overflow-x:auto; padding-bottom:2px;
        scrollbar-width:none;
      }
      .tz6-recent-list::-webkit-scrollbar { display:none; }
      .tz6-recent-chip {
        flex:0 0 auto;
        max-width: 190px;
        border: 1px solid var(--border2);
        background: hsla(220,14%,8%,.52);
        color: var(--text2);
        border-radius: 999px;
        padding: 8px 11px;
        font-size: 11px;
        font-weight: 700;
        cursor:pointer;
        font-family: inherit;
        white-space: nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      .tz6-recent-empty {
        font-size: 11px; color: var(--text3); padding: 4px 1px 0;
      }
      .tz6-clear-recents {
        border:none; background:transparent; color:var(--text3); font-size:10px; cursor:pointer; font-family:inherit;
      }
      body.rtl .tz6-quickstart-head { flex-direction: row-reverse; }
      body.rtl .tz6-quick-card { flex-direction: row-reverse; text-align:right; }
      @media (max-width: 380px) {
        .tz6-quickstart-row { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function tz6qsCard(name, icon) {
    const address = tz6qsGetPlace(name);
    const shown = address ? address : "Tap to save address";
    return `
      <button type="button" class="tz6-quick-card" onclick="clearRoadTZ6QuickStart.useSaved('${tz6qsEscape(name)}')" ondblclick="clearRoadTZ6QuickStart.editSaved('${tz6qsEscape(name)}')">
        <span class="tz6-quick-icon">${icon}</span>
        <span class="tz6-quick-body">
          <span class="tz6-quick-label">${tz6qsEscape(name)}</span>
          <span class="tz6-quick-address">${tz6qsEscape(shown)}</span>
        </span>
      </button>`;
  }

  function tz6qsRecentHTML() {
    const recents = tz6qsRecents();
    if (!recents.length) return `<div class="tz6-recent-empty">Recent places will appear after you build a route.</div>`;
    return `<div class="tz6-recent-list">` + recents.map(function(item, index){
      const label = item.label || item.address;
      return `<button type="button" class="tz6-recent-chip" title="${tz6qsEscape(item.address)}" onclick="clearRoadTZ6QuickStart.useRecentIndex(${index})">${tz6qsEscape(label)}</button>`;
    }).join("") + `</div>`;
  }

  function tz6qsPanelHTML() {
    return `
      <div class="tz6-quickstart-head">
        <div class="tz6-quickstart-title">Quick Start</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="tz6-clear-recents" onclick="clearRoadTZ6QuickStart.clearRecents()">Clear recent</button>
          <button type="button" class="tz6-quickstart-edit" onclick="clearRoadTZ6QuickStart.editSaved('Home')">Set Home</button>
          <button type="button" class="tz6-quickstart-edit" onclick="clearRoadTZ6QuickStart.editSaved('Work')">Set Work</button>
        </div>
      </div>
      <div class="tz6-quickstart-row">
        ${tz6qsCard("Home", "🏠")}
        ${tz6qsCard("Work", "💼")}
      </div>
      ${tz6qsRecentHTML()}
    `;
  }

  function tz6qsEnsurePanel() {
    tz6qsEnsureCSS();
    let panel = document.getElementById("tz6-quickstart-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "tz6-quickstart-panel";
      panel.className = "tz6-quickstart-panel";
      const results = document.getElementById("results");
      const content = document.querySelector(".content-scroll") || document.body;
      if (results && results.parentNode) results.parentNode.insertBefore(panel, results);
      else content.insertBefore(panel, content.firstChild || null);
    }
    return panel;
  }

  function tz6qsRenderPanel() {
    try {
      const panel = tz6qsEnsurePanel();
      panel.innerHTML = tz6qsPanelHTML();
    } catch (e) {
      tz6qsLog("render panel", e);
    }
  }

  const tz6qsOriginalSetDestination = typeof window.setDestination === "function" ? window.setDestination : (typeof setDestination === "function" ? setDestination : null);
  window.setDestination = function(place) {
    try { return tz6qsUseSaved(place); }
    catch (e) {
      tz6qsLog("setDestination wrapper", e);
      if (tz6qsOriginalSetDestination) return tz6qsOriginalSetDestination.apply(this, arguments);
    }
  };

  window.updateSavedPlace = function(place) {
    try { return tz6qsPromptAndSave(place); }
    catch (e) { tz6qsLog("updateSavedPlace wrapper", e); }
  };

  const tz6qsOriginalCalculateRoutes = typeof calculateRoutes === "function" ? calculateRoutes : null;
  if (tz6qsOriginalCalculateRoutes) {
    calculateRoutes = function() {
      const endField = document.getElementById("end");
      const endValue = endField && endField.value ? endField.value.trim() : "";
      const result = tz6qsOriginalCalculateRoutes.apply(this, arguments);
      if (endValue) tz6qsAddRecent(endValue, endValue);
      return result;
    };
  }

  function tz6qsBoot() {
    tz6qsRenderPanel();
  }

  window.clearRoadTZ6QuickStart = {
    useSaved: tz6qsUseSaved,
    editSaved: tz6qsPromptAndSave,
    savePlace: tz6qsSavePlace,
    getPlace: tz6qsGetPlace,
    recents: tz6qsRecents,
    useRecentIndex: function(index){
      const item = tz6qsRecents()[Number(index)];
      if (item && item.address) tz6qsSetEndAndRoute(item.address, item.label || item.address);
    },
    clearRecents: tz6qsClearRecents,
    render: tz6qsRenderPanel
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tz6qsBoot);
  else tz6qsBoot();
})();
