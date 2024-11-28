/** Check for enable status */
let websitesEnabled = true;

chrome.storage.sync.get(['popupAds'], (result) => {
    websitesEnabled = result.popupAds ?? true;
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'featureToggle' && msg.feature === 'popupAds') {
        websitesEnabled = msg.enabled;
    }
});

/** Actual code */

function getPaleColor(hue) {
    return `hsl(${hue}, 40%, 95%)`; // High lightness for pale colors
}

function getBorderColor(bgColor) {
    return bgColor.replace('95%', '85%');
}

function getHeaderColor(bgColor) {
    return bgColor.replace('95%', '90%');
}

let adsData = [];

fetch(chrome.runtime.getURL('data/dataset/data.json'))
    .then(response => response.json())
    .then(data => {
        adsData = data;
        createWindow(); 
        setInterval(createWindow, 5000);
    })
    .catch(error => console.error('Error loading ads data:', error));

const style = document.createElement('style');
style.textContent = `
    @keyframes zoomIn {
        from { transform: scale(0.3); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }

    .floating-window {
        position: fixed;
        top: 20px;
        left: 20px;
        width: 300px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        overflow: hidden;
        min-width: 200px;
        min-height: 100px;
        animation: zoomIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .window-header {
        padding: 8px;
        cursor: move;
        cursor: grab;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
    }

    .window-header:active {
        cursor: grabbing;
    }

    .window-title {
        margin: 0;
        font-size: 14px;
        font-weight: bold;
        color: black;
    }

    .window-controls {
        display: flex;
        gap: 8px;
    }

    .window-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        color: black;
    }

    .window-button:hover {
        background: rgba(0, 0, 0, 0.1);
    }

    .window-content {
        padding: 16px;
        color: black;
        user-select: none;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .window-content p {
        margin: 0;
    }

    .window-content .slogan {
        font-style: italic;
        color: #666;
    }

    a:hover {
        text-decoration: none;
    }

    .icon-container {
        position: relative;
        width: 140px;
        height: 140px;
        margin: 0 auto;
    }

    .layer1, .layer2 {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .layer1 {
        user-select: none;
        filter: blur(50px);
        transform: scale(2);
        opacity: 0.7;
    }

    .layer2 {
        z-index: 1;
        transform: scale(0.7);
    }

    .layer1 img, .layer2 img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

function getRandomAd() {
    if (adsData.length === 0) return null;
    return adsData[Math.floor(Math.random() * adsData.length)];
}

function createWindow() {
    if (!websitesEnabled) return;

    const ad = getRandomAd();
    if (!ad) return;

    const floatingWindow = document.createElement('div');
    floatingWindow.className = 'floating-window';
    
    // Randomize position
    const maxX = window.innerWidth - 320;
    const maxY = window.innerHeight - 200;
    const randomX = Math.max(20, Math.floor(Math.random() * maxX));
    const randomY = Math.max(20, Math.floor(Math.random() * maxY));
    
    floatingWindow.style.left = randomX + 'px';
    floatingWindow.style.top = randomY + 'px';

    const iconUrl = ad.iconID ? 
        chrome.runtime.getURL(`data/dataset/icons/${ad.iconID}.png`) :
        chrome.runtime.getURL('data/dataset/icons/default.png');

    const bgColor = ad.accentColor || "hsl(" + Math.floor(Math.random() * 360) + ", 40%, 95%)";
    const borderColor = getBorderColor(bgColor);
    const headerColor = getHeaderColor(bgColor);
    
    floatingWindow.style.background = bgColor;
    floatingWindow.style.border = `1px solid ${borderColor}`;

    floatingWindow.innerHTML = `
        <div class="window-header" style="background: ${headerColor}; border-bottom: 1px solid ${borderColor}">
            <div class="window-title">${ad.title}</div>
            <div class="window-controls">
                <button class="window-button close-btn">×</button>
            </div>
        </div>
        <a href="${ad.url}" target="_blank">
            <div class="window-content">
                <p class="slogan">${ad.slogan}</p>
                <p>${ad.description}</p>
                <div class="icon-container">
                    <div class="layer1">
                        ${ad.iconID ? `<img src="${iconUrl}" alt="${ad.title} icon" draggable=false style="user-select: none">` : ''}
                    </div>
                    <div class="layer2">
                        ${ad.iconID ? `<img src="${iconUrl}" alt="${ad.title} icon" draggable=false style="user-select: none">` : ''}
                    </div>
                </div>
            </div>
        </a>
    `;

    document.body.appendChild(floatingWindow);

    // Add dragging functionality
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    const header = floatingWindow.querySelector('.window-header');

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        if (e.target.closest('.window-header') && !e.target.closest('.window-button')) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, floatingWindow);
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    // Add close functionality
    const closeBtn = floatingWindow.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        floatingWindow.remove();
    });
}