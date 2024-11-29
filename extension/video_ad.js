let state = {
    enabled: false,
    window: null,
    timer: null,
    videoIndex: 0,
    ws: null
};

const CONFIG = {
    videos: ['video1.mp4', 'video2.mp4', 'video3.mp4', 'video4.mp4', 'video5.mp4', 'video6.mp4'],
    delays: {
        initial: () => Math.floor(Math.random() * (5 - 2 + 1) + 2) * 1000,      // 2-5s
        between: () => Math.floor(Math.random() * (180 - 120 + 1) + 120) * 1000 // 2-3m
    },
    styles: {
        window: `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2147483647;
            width: 640px;
            height: 640px;
            background: #000;
            border-radius: 24px;
            box-shadow: 0 0 50px rgba(0,0,0,0.5);
            overflow: hidden;
            transition: all 0.5s ease-in-out;
        `,
        video: `
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
        `
    }
};

function initWebSocket() {
    if (state.ws) return;
    
    try {
        state.ws = new WebSocket('ws://localhost:8766');
        state.ws.onmessage = ({data}) => {
            try {
                if (JSON.parse(data).phrase && state.window) {
                    removeAd();
                }
            } catch (err) {
                console.error('WebSocket message error:', err);
            }
        };
    } catch (err) {
        console.error('WebSocket connection failed:', err);
    }
}

async function createAd() {
    if (!state.enabled || state.window) return;

    const videoSrc = chrome.runtime.getURL(`data/videos/${CONFIG.videos[state.videoIndex]}`);
    const silentSrc = chrome.runtime.getURL('data/videos/silent.mp4');
    state.videoIndex = (state.videoIndex + 1) % CONFIG.videos.length;

    const adWindow = document.createElement('div');
    adWindow.className = 'floating-video-ad';
    adWindow.style.cssText = CONFIG.styles.window;

    // Silent video iframe trick for autoplay
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.allow = 'autoplay';
    iframe.src = silentSrc;

    const video = document.createElement('video');
    video.style.cssText = CONFIG.styles.video;
    video.src = videoSrc;
    video.autoplay = true;
    video.muted = false;
    video.loop = false;
    video.controls = false;
    video.playsInline = true;

    // Backup play on click
    video.addEventListener('click', () => video.play().catch(() => {}));

    // Cleanup on video end
    video.addEventListener('ended', removeAd);

    adWindow.appendChild(iframe);
    adWindow.appendChild(video);
    document.body.appendChild(adWindow);
    state.window = adWindow;
}

async function removeAd() {
    if (!state.window) return;
    
    state.window.style.transform = 'translate(-50%, -50%) scale(0)';
    state.window.style.opacity = '0';
    await new Promise(r => setTimeout(r, 500));
    state.window.remove();
    state.window = null;
}

async function scheduleNext(isInitial = false) {
    if (!state.enabled) return;

    const delay = isInitial ? CONFIG.delays.initial() : CONFIG.delays.between();
    await new Promise(r => setTimeout(r, delay));

    if (state.enabled && !state.window) {
        createAd();
        scheduleNext();
    }
}

function cleanup() {
    if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
    }
    if (state.window) {
        state.window.remove();
        state.window = null;
    }
    if (state.ws) {
        state.ws.close();
        state.ws = null;
    }
}

chrome.storage.sync.get(['videoAds'], (result) => {
    state.enabled = result.videoAds ?? true;
    
    if (state.enabled) {
        initWebSocket();
        scheduleNext(true);
    }
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'featureToggle' && msg.feature === 'videoAds') {
        state.enabled = msg.enabled;
        
        if (!state.enabled) {
            cleanup();
        } else {
            initWebSocket();
            scheduleNext(true);
        }
    }
});