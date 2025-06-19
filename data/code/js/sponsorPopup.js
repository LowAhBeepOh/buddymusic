
// Sponsor Popup Component for Buddy Music

// Create and show a welcome popup for sponsors from YouTube
function createSponsorPopup(utmCampaign) {
    // Check if popup already exists and remove it
    const existingPopup = document.getElementById('sponsor-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create popup overlay
    const overlay = document.createElement('div');
    overlay.id = 'sponsor-popup-overlay';
    overlay.className = 'sponsor-popup-overlay';
    
    // Create popup container
    const popup = document.createElement('div');
    popup.id = 'sponsor-popup';
    popup.className = 'sponsor-popup';
    
    // Create popup content
    popup.innerHTML = `
        <div class="sponsor-popup-content">
            <h2>Welcome to Buddy Music</h2>
            <p>Thanks for trying out this project :D</p>
            <p>As of now, the app is in beta, and songs have to be manually added. If you're a developer, you can help contribute on GitHub if you want to.</p>
            <div class="sponsor-popup-buttons">
                <button id="sponsor-popup-try" class="sponsor-popup-try-btn">Try out from ${utmCampaign}</button>
                <a href="https://github.com/lowahbeepoh/buddymusic" target="_blank" id="sponsor-popup-github" class="sponsor-popup-github-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                </a>
            </div>
        </div>
    `;
    
    // Add elements to DOM
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('sponsor-popup-try').addEventListener('click', () => {
        overlay.classList.add('fade-out');
        overlay.style.backdropFilter = 'none';
        overlay.style.webkitBackdropFilter = 'none';
        setTimeout(() => {
            if (document.getElementById('sponsor-popup')) {
                document.getElementById('sponsor-popup').remove();
            }
            if (document.getElementById('sponsor-popup-overlay')) {
                document.getElementById('sponsor-popup-overlay').remove();
            }
        }, 300);
    });
    
    // Show popup with animation
    setTimeout(() => {
        overlay.classList.add('active');
    }, 100);
}

// Function to check UTM parameters and show popup if conditions are met
function checkUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const utmMedium = urlParams.get('utm_medium');
    const utmSource = urlParams.get('utm_source');
    const utmCampaign = urlParams.get('utm_campaign');
    
    // Check if all required UTM parameters are present and match conditions
    if (utmMedium === 'sponsor' && utmSource === 'youtube' && utmCampaign) {
        // Show the sponsor popup with the campaign name
        createSponsorPopup(utmCampaign);
    }
}

// Add event listener to check UTM parameters when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a short time to ensure the app is loaded
    setTimeout(checkUTMParameters, 1000);
});