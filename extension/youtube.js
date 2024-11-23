// Function to animate the "Skip Ad" button
function startSkipButtonAnimation(skipButton) {
    // Define the container and get its dimensions
    const container = skipButton.closest('.ytp-ad-player-overlay-layout__skip-or-preview-container');
    const originalWidth = skipButton.offsetWidth;
    const originalHeight = skipButton.offsetHeight;

    // Initial position and velocity
    let position = { x: 0, y: 0 };
    let velocity = { x: 2, y: 2 };

    // Prepare the skip button for animation, adjusting only relevant styles
    skipButton.style.position = 'absolute';
    skipButton.style.zIndex = '10';
    skipButton.style.width = `${originalWidth}px`;
    skipButton.style.height = `${originalHeight}px`;

    // Animation function
    function animate() {
        // Ensure visibility in case it was altered
        skipButton.style.opacity = '1';
        skipButton.style.display = 'block';

        // Update container dimensions each frame
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        // Update position based on velocity
        position.x += velocity.x;
        position.y += velocity.y;

        // Collision detection
        if (position.x <= 0 || position.x + originalWidth >= containerWidth) {
            velocity.x = -velocity.x;
            position.x = Math.max(0, Math.min(position.x, containerWidth - originalWidth));
        }
        
        if (position.y <= 0 || position.y + originalHeight >= containerHeight) {
            velocity.y = -velocity.y;
            position.y = Math.max(0, Math.min(position.y, containerHeight - originalHeight));
        }

        // Apply position
        skipButton.style.left = `${position.x}px`;
        skipButton.style.top = `${position.y}px`;

        // Continue animation
        requestAnimationFrame(animate);
    }

    // Start the animation
    animate();
}

// Observer to detect when "Skip Ad" button appears
function observeSkipButton() {
    const adContainer = document.querySelector('.video-ads.ytp-ad-module');
    
    if (!adContainer) {
        console.warn("Ad container not found. Retrying...");
        setTimeout(observeSkipButton, 500); // Retry if container isn't found
        return;
    }

    const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                const skipButton = node.querySelector('.ytp-skip-ad-button');
                if (skipButton) {
                    startSkipButtonAnimation(skipButton);
                    observer.disconnect(); // Stop observing once button found
                }
            });
        });
    });

    // Observe child nodes within ad container
    observer.observe(adContainer, { childList: true, subtree: true });
}

// Start observing ad container
observeSkipButton();