const CONFIG = {
    prizes: ["iPhone 15 Pro", "MacBook Air", "$1000 Amazon Card", "PS5", "Tesla Model 3", "Rolex Watch", "$500 Walmart Card", "AirPods Pro", "iPad Pro", "Bitcoin"],
    amounts: ["$50", "$100", "$250", "$500", "$1000", "$2500", "$5000", "₿1", "€1000"],
    urgencyWords: ["LIMITED TIME", "ACT NOW", "URGENT", "EXPIRES SOON", "LAST CHANCE", "EXCLUSIVE", "DON'T MISS OUT", "TODAY ONLY"],
    gradients: [
        "linear-gradient(45deg, #ff0000, #ff6600)",
        "linear-gradient(to right, #ffd700, #ffa500)",
        "linear-gradient(135deg, #6e0dd0, #b91eff)",
        "linear-gradient(to right, #ff416c, #ff4b2b)",
        "linear-gradient(45deg, #00ff00, #00aa00)",
        "linear-gradient(to right, #ff0099, #ff66cc)"
    ],
    animations: {
        types: ["pulse", "shake", "rotate", "blink", "flash", "bounce", "grow", "wiggle", "slide"],
        keyframes: `
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes shake { 0% { transform: translate(1px, 1px) rotate(0deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 100% { transform: translate(1px, -1px) rotate(1deg); } }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes flash { 0%, 100% { filter: brightness(100%); } 50% { filter: brightness(150%); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes grow { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes slide { 0% { transform: translateX(-10px); } 100% { transform: translateX(10px); } }
      `
    }
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFrom = arr => arr[rand(0, arr.length - 1)];

const generateScamMessage = {
    prize: () => `CONGRATULATIONS! Claim your FREE ${randomFrom(CONFIG.prizes)}`,
    alert: () => `⚠️ ${randomFrom(["Virus Detected!", "Security Alert!", "System Warning!", "Critical Error!"])}`,
    winner: () => `💰 ${randomFrom(["Lucky visitor", "Selected user", "Random winner", "Verified account"])} #${rand(0, 999999)}! Claim ${randomFrom(CONFIG.amounts)}`,
    spin: () => `🎰 SPIN & WIN! ${randomFrom(CONFIG.prizes)}`,
    survey: () => `${randomFrom(CONFIG.urgencyWords)}: ${randomFrom(CONFIG.amounts)} Gift Card Survey`,
    system: () => `${randomFrom(["🔥", "⚡", "💥", "⚠️"])} ${randomFrom(["Battery Critical", "Memory Full", "Storage Low", "Update Required"])}!`,
    dating: () => `HOT ${randomFrom(["SINGLES", "DATES", "MATCHES"])} (${rand(1, 5)} miles away)`,
    winner2: () => `🏆 You've WON! Claim your ${randomFrom(CONFIG.prizes)}`
};

const generateButtonStyle = () => ({
    background: Math.random() > 0.5 ? randomFrom(CONFIG.gradients) : randomFrom(["#ff0000", "#4CAF50", "#ff6600", "#003087", "#f44336"]),
    color: randomFrom(["white", "yellow", "#fff", "#ff0"]),
    fontSize: `${rand(16, 22)}px`,
    fontWeight: "bold",
    border: `${rand(1, 4)}px ${Math.random() > 0.5 ? 'solid' : 'dashed'} ${randomFrom(["gold", "yellow", "white", "#ff0"])}`,
    borderRadius: `${rand(5, 30)}px`,
    padding: `${rand(8, 18)}px ${rand(10, 25)}px`,
    boxShadow: `0 0 ${rand(5, 25)}px rgba(255,255,255,0.5)`,
    animation: `${randomFrom(CONFIG.animations.types)} ${(Math.random() * 2 + 0.5).toFixed(1)}s infinite`,
    textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
    cursor: "pointer",
    transition: "all 0.3s ease"
});

const closeButtonStyle = {
    position: "absolute",
    top: "-10px",
    right: "-10px",
    width: "20px",
    height: "20px",
    background: "#ff0000",
    color: "white",
    border: "2px solid white",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "bold",
    zIndex: "10000",
    padding: "0",
    lineHeight: "1",
    boxShadow: "0 0 5px rgba(0,0,0,0.3)"
}

const injectScamButton = () => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = CONFIG.animations.keyframes;
    document.head.appendChild(styleSheet);

    const container = document.createElement("div");
    Object.assign(container.style, {
        position: "fixed",
        zIndex: "9999",
        [Math.random() > 0.5 ? 'right' : 'left']: `${rand(10, 50)}px`,
        [Math.random() > 0.5 ? 'top' : 'bottom']: `${rand(10, 50)}px`,
        maxWidth: "300px",
        fontFamily: "Arial, sans-serif",
        pointerEvents: "none"
    });

    const buttonWrapper = document.createElement("div");
    Object.assign(buttonWrapper.style, {
        position: "relative",
        display: "inline-block",
        pointerEvents: "auto"
    });

    const button = document.createElement("button");
    button.innerText = randomFrom(Object.values(generateScamMessage))();
    Object.assign(button.style, generateButtonStyle());

    button.onclick = e => {
        e.preventDefault();

        window.open("https://youtube.com/facedevstuff", "_blank");
    };

    const closeButton = document.createElement("button");
    closeButton.innerText = "×";
    Object.assign(closeButton.style, closeButtonStyle);

    closeButton.onclick = e => {
        e.preventDefault();
        e.stopPropagation();

        if (Math.random() < 0.5) {
            container.remove();
        } else {
            window.open("https://youtube.com/facedevstuff", "_blank");
        }
    };

    buttonWrapper.appendChild(button);
    buttonWrapper.appendChild(closeButton);
    container.appendChild(buttonWrapper);
    document.body.appendChild(container);
};

const startSpawning = () => {
    injectScamButton();
    setTimeout(startSpawning, rand(8000, 10000));
};

document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", startSpawning)
    : startSpawning();