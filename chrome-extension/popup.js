// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('scan-page-btn');
  const TRUTHGUARD_URL = "https://truth-guard-opal.vercel.app";

  btn.addEventListener('click', () => {
    // Get the active tab's URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.url) {
        // Open TruthGuard with the URL parameter
        const queryUrl = `${TRUTHGUARD_URL}/?url=${encodeURIComponent(activeTab.url)}`;
        chrome.tabs.create({ url: queryUrl });
      }
    });
  });
});
