// Store feature states
const features = {
    antiAdblock: true,
    scamButtons: true,
    videoAds: true,
    youtubeEye: true,
    popupAds: true
};

// Load saved states
chrome.storage.sync.get(features, (result) => {
    Object.keys(features).forEach(feature => {
        document.getElementById(feature).checked = result[feature];
    });
});

// Add change listeners
Object.keys(features).forEach(feature => {
    document.getElementById(feature).addEventListener('change', (e) => {
        chrome.storage.sync.set({ [feature]: e.target.checked });

        // Notify content scripts of change
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'featureToggle',
                    feature: feature,
                    enabled: e.target.checked
                });
            });
        });
    });
});

function checkWebSockets() {
    // Check Vision
    const testVisionWs = new WebSocket('ws://localhost:8765');
    testVisionWs.onopen = () => {
        document.getElementById('visionStatus').classList.add('active');
        testVisionWs.close();
    };
    testVisionWs.onerror = () => {
        document.getElementById('visionStatus').classList.remove('active');
    };

    // Check Audio
    const testAudioWs = new WebSocket('ws://localhost:8766');
    testAudioWs.onopen = () => {
        document.getElementById('audioStatus').classList.add('active');
        testAudioWs.close();
    };
    testAudioWs.onerror = () => {
        document.getElementById('audioStatus').classList.remove('active');
    };
}

checkWebSockets();
setInterval(checkWebSockets, 5000);