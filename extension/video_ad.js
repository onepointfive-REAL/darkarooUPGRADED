let videoEnabled = true;
let videoWindow = null;
let adTimer = null;

const wsAudio = new WebSocket('ws://localhost:8766');

chrome.storage.sync.get(['videoAds'], (result) => {
    videoEnabled = result.videoAds ?? true;
    if (videoEnabled) {
        scheduleNextAd();
    }
});

// Listen for feature toggle messages
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'featureToggle' && msg.feature === 'videoAds') {
        videoEnabled = msg.enabled;
        if (videoEnabled) {
            scheduleNextAd();
        } else {
            clearTimeout(adTimer);
            if (videoWindow) {
                videoWindow.remove();
                videoWindow = null;
            }
        }
    }
});

function getRandomDelay() {
    // Random delay between 8-10 minutes in milliseconds
    return Math.floor(Math.random() * (10 - 8 + 1) + 8) * 60 * 1000;
}

function scheduleNextAd() {
    if (!videoEnabled) return;
    
    const delay = getRandomDelay();
    clearTimeout(adTimer);
    
    adTimer = setTimeout(() => {
        if (enabled && !videoWindow) {
            createVideoAd();
        }
        scheduleNextAd();
    }, delay);
}

function createVideoAd() {
    const adWindow = document.createElement('div');
    adWindow.className = 'floating-window video-ad';
    Object.assign(adWindow.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '999999',
        width: '640px',
        height: '400px',
        background: '#000',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        borderRadius: '8px',
        overflow: 'hidden'
    });

    const video = document.createElement('video');
    Object.assign(video.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    });
    video.src = 'data/videos/test.mp4';
    video.autoplay = true;
    video.loop = true;
    video.muted = false;
    
    adWindow.appendChild(video);
    document.body.appendChild(adWindow);
    
    videoWindow = adWindow;
    
    // Make uncloseable by preventing normal close methods
    window.onbeforeunload = () => '';
    video.oncontextmenu = (e) => e.preventDefault();
    
    return adWindow;
}

wsAudio.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        
        if (data.phrase === true && videoWindow) {
            videoWindow.remove();
            videoWindow = null;
            window.onbeforeunload = null;
        }
    } catch (err) {
        console.error('Error parsing audio data:', err);
    }
};

if (videoEnabled) {
    scheduleNextAd();
}