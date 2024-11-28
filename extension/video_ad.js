const wsAudio = new WebSocket('ws://localhost:8766');
let videoWindow = null;

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

createVideoAd();