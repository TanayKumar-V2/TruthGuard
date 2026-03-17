// background.js

const TRUTHGUARD_URL = "https://truth-guard-opal.vercel.app";

// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fact-check-truthguard",
    title: "Fact check with TruthGuard",
    contexts: ["selection"]
  });
});

// Listen for clicks on the context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "fact-check-truthguard" && info.selectionText) {
    const queryUrl = `${TRUTHGUARD_URL}/?text=${encodeURIComponent(info.selectionText)}`;
    chrome.tabs.create({ url: queryUrl });
  }
});

