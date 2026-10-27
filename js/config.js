// Address of your Heirloom server (see server/README.md), for example
// 'https://heirloom-health.your-name.workers.dev'.
// Leave it empty to run with no server: everything still works on the device,
// except AI answer-finding on the website, speech-to-text, and cloud sync.
// If you change apiBase, also change connect-src in the security policy at the top of index.html,
// or the browser will block the app from reaching your server.
window.CONFIG = {
  apiBase: 'https://heirloom-health.dodda-siddharth.workers.dev',
  // GitHub repository for feedback issues when there is no server.
  repo: 'doddasiddharth-debug/heirloom-health',
};
