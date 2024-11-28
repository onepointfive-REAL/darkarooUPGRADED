chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed and background script running.");
});

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "toggleWebcam" });
});
