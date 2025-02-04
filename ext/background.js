chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed and background script running. also why tf are you looking at logs you boomer");
});

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "toggleWebcam" });
});
