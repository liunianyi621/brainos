document.addEventListener("DOMContentLoaded", () => {
  window.BrainOSUI.init();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.warn("BrainOS service worker 注册失败。", error);
    });
  });
}
