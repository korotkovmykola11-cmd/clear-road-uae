// ТЗ-2 [v01] — точка входа в поездку: handleStartNavTap, startDrive
// Зависит от глобалей основного бандла (resolveDriveRoute, validateSelectedDriveRoute, startDriveMode, …).

function handleStartNavTap() {
  const routeToStart = resolveDriveRoute(selectedRoute ? selectedRoute.index : (_bestRoute && _bestRoute.index));
  if (routeToStart) {
    startDrive(routeToStart.index);
    return;
  }
  const startVal = (document.getElementById("start")?.value || "").trim();
  const endVal = (document.getElementById("end")?.value || "").trim();
  if (startVal && endVal) calculateRoutes();
  else if (!endVal) document.getElementById("end")?.focus();
  else requestGPS();
}

function startDrive(index) {
  const chosen = validateSelectedDriveRoute(resolveDriveRoute(index), "startDrive");
  if (!chosen) return;
  if (typeof learnFromRouteChoice === "function") learnFromRouteChoice(chosen);
  startDriveMode(chosen.index);
}
