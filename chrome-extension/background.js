// background.js

// The URL of the Next.js application
const TRUTHGUARD_URL = "http://localhost:3000";

// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fact-check-truthguard",
    title: "Fact check with TruthGuard",
    contexts: ["selection"]
  });
  Restoring Live Search
  I have drafted an implementation plan for the new Chrome Extension feature!
  
  The simplest and most elegant approach is for the Chrome Extension to act as a bridge to your existing TruthGuard dashboard, rather than trying to recreate the complex Trust Matrix UI inside a tiny extension popup.
  
  The extension will have two features:
  
  Fact Check Page: Click the extension icon, and it'll open a new tab to TruthGuard with the current page's URL already loaded and analyzing.
  Fact Check Text: Highlight any text on any website, right-click, and select "Fact check with TruthGuard".
  Please review the attached implementation_plan.md and let me know if you approve this approach!
  
  Proceeded with
  Manually proceeded.
  
  
  Creating TruthGuard Chrome Extension
  I've successfully updated the Next.js frontend to parse 
  
  url
   and 
  
  text
   query parameters and automatically trigger fact-checks on load. I also created a complete Chrome Extension containing a manifest, background worker (for right-click text selection), popup (for current tab checking), and custom icons.
  
  Files Edited
  Progress Updates
  1
  Implementing Next.js URL parameter support and Chrome Extension files
  
  2
  Updating dashboard to read useSearchParams
  
  3
  Fixing handleAnalyze and adding useEffect for auto-analysis
  
  4
  Fixing useCallback syntax error in TruthGuardDashboard
  
  5
  Creating Chrome Extension files
  
  6
  Generating Chrome Extension icons and popup logic
  
  
});

// Listen for clicks on the context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "fact-check-truthguard" && info.selectionText) {
    const queryUrl = `${TRUTHGUARD_URL}/?text=${encodeURIComponent(info.selectionText)}`;
    chrome.tabs.create({ url: queryUrl });
  }
});
