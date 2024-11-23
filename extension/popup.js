// popup.js
document.getElementById("toggleWebcam").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleWebcam" });
    });
});
