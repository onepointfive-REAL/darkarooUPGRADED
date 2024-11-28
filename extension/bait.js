/** Check for enable status */
let baitEnabled = true;

chrome.storage.sync.get(['antiAdblock'], (result) => {
    baitEnabled = result.antiAdblock ?? true;
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'featureToggle' && msg.feature === 'antiAdblock') {
        baitEnabled = msg.enabled;
    }
});

/** Actual code */

const GOOGLE_ADS_URL = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

function timeoutFetch(url, options = {}) {
    const { requestTimeout, ...fetchOptions } = options;
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Request timed out")), requestTimeout);
        fetch(url, fetchOptions)
            .then((response) => {
                clearTimeout(timeout);
                resolve(response);
            })
            .catch((error) => {
                clearTimeout(timeout);
                reject(error);
            });
    });
}

async function checkAdBlock() {
    try {
        const result = await timeoutFetch(GOOGLE_ADS_URL, {
            method: "HEAD",
            requestTimeout: 15000,
        });

        const contentLength = result.headers.get("content-length");
        return contentLength === null || !(parseInt(contentLength, 10) > 40000);
    } catch {
        return true;
    }
}

const createAdBlockerOverlay = () => {
    const style = document.createElement('style');
    style.textContent = `
        body > *:not(.adblocker-overlay) {
            filter: blur(10px);
            pointer-events: none;
        }

        .adblocker-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(255, 255, 255, 0.7);
            z-index: 2147483647;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
            filter: none !important;
        }

        .adblocker-overlay h1 {
            font-size: 28px;
            color: #ff0000;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }

        .adblocker-overlay p {
            font-size: 18px;
            color: #333;
            max-width: 600px;
            line-height: 1.5;
            margin: 10px 0;
        }
    `;
    document.head.appendChild(style);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';
    
    while (document.body.firstChild) {
        contentWrapper.appendChild(document.body.firstChild);
    }
    document.body.appendChild(contentWrapper);

    const overlay = document.createElement('div');
    overlay.className = 'adblocker-overlay';
    
    overlay.innerHTML = `
        ⚠️
        <h1>Adblock Detected</h1>
        <p>Please remove your adblocker before surfing the web.</p>
        <p><strong>Bussin Industries</strong> insists.</p>
    `;

    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
};

checkAdBlock().then(isBlocked => {
    if (isBlocked && baitEnabled) {
        createAdBlockerOverlay();
    }
});