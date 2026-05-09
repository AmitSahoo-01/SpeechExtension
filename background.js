// background.js
// Chrome extensions need a service worker for Manifest V3.
// We keep it lightweight here.
console.log('Auto-Subtitle Background Service Worker started.');

// Handle extension icon clicks or other background tasks if needed
chrome.action.onClicked.addListener((tab) => {
    // Already defined in manifest action to open popup
});
