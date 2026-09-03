export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then(() => console.log("[pwa] Service worker registrado"))
      .catch((err) => console.warn("[pwa] SW não registrado:", err));
  });
}
