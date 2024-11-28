/** Check for enable status */
let youtubeEnabled = true;
let ws = null;

chrome.storage.sync.get(['youtubeEye'], (result) => {
    youtubeEnabled = result.youtubeEye ?? true;
    if (youtubeEnabled) {
        initializeWebSocket();
    }
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'featureToggle' && msg.feature === 'youtubeEye') {
        youtubeEnabled = msg.enabled;
        if (youtubeEnabled) {
            initializeWebSocket();
        } else {
            if (ws) {
                ws.close();
                ws = null;
            }
        }
    }
});

/** Actual code */

function initializeWebSocket() {
    if (ws) return; // Don't create multiple connections

    ws = new WebSocket('ws://localhost:8765');

    ws.onmessage = (event) => {
        if (!youtubeEnabled) return;
        try {
            const gazeState = JSON.parse(event.data);
    
            if (gazeState.looking_away) {
                pauseVideo();
            } else {
                playVideo();
            }
        } catch (err) {
            console.error('Error parsing gaze data:', err);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket connection closed');
        ws = null;
    };
}

function isPlayingAd() {
    const player = document.querySelector('.html5-video-player');
    return player && (
        player.classList.contains('ad-showing') || 
        player.classList.contains('ad-interrupting')
    );
}

function findYouTubeVideo() {
    return document.querySelector('video.html5-main-video');
}

function pauseVideo() {
    if (!enabled || !isPlayingAd()) return;
    
    const video = findYouTubeVideo();
    if (video && !video.paused) {
        video.pause();
        console.log('Ad paused due to looking away');
    }
}

function playVideo() {
    if (!enabled || !isPlayingAd()) return;
    
    const video = findYouTubeVideo();
    if (video && video.paused) {
        video.play().catch(err => console.log('Could not resume ad:', err));
        console.log('Ad resumed - looking back');
    }
}