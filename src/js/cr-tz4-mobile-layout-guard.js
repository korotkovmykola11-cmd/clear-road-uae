/* ===== ТЗ-4: Mobile layout cleanup verification marker ===== */
(function tz4MobileLayoutGuard(){
  function applyTz4ViewportVars(){
    try {
      document.documentElement.style.setProperty('--tz4-vh', (window.innerHeight * 0.01) + 'px');
    } catch (_) {}
  }
  applyTz4ViewportVars();
  window.addEventListener('resize', applyTz4ViewportVars, { passive: true });
  window.addEventListener('orientationchange', applyTz4ViewportVars, { passive: true });
  window.__TZ4_MOBILE_LAYOUT_CLEANUP__ = true;
})();
