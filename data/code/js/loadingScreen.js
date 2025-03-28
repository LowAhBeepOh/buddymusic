// Initialize theme from localStorage for the loading screen
function initializeLoadingTheme() {
    // Get saved theme from localStorage or use dark as fallback
    const savedTheme = localStorage.getItem('buddy-music-theme') || 'dark';
    
    // Apply the theme to the HTML element
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    console.log('Loading screen using theme:', savedTheme);
}

// Initialize loading screen
function initializeLoadingScreen() {
    // Initialize theme
    initializeLoadingTheme();
    
    // Get loading screen elements
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-progress');
    const appContainer = document.getElementById('app-container');
    
    // Check if there are any songs to load
    const hasSongs = window.songDatabase && window.songDatabase.length > 0;
    
    // Only show loading screen if there are songs to load
    if (hasSongs) {
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
        
        if (appContainer) {
            appContainer.classList.remove('visible');
        }
    } else {
        // Skip loading screen if no songs
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        if (appContainer) {
            appContainer.classList.add('visible');
        }
        return;
    }

    let songsLoaded = 0;
    let totalSongs = 0;
    let loadingComplete = false;
    
    // Function to update progress bar
    function updateProgress(loaded, total) {
        songsLoaded = loaded;
        totalSongs = total || 1; // Prevent division by zero
        
        // Calculate progress percentage
        const percentage = Math.min(100, Math.round((songsLoaded / totalSongs) * 100));
        
        // Update progress bar width with moving gradient effect
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            const theme = document.documentElement.getAttribute('data-theme');
        const gradientColor = theme === 'adaptive' ? 'var(--progress-gradient-mid)' : 'rgba(255,255,255,0.5)';
        progressBar.style.backgroundImage = `linear-gradient(90deg, transparent 25%, ${gradientColor} 50%, transparent 75%)`;
            progressBar.style.backgroundSize = '200% 100%';
            progressBar.style.animation = 'progressGradient 1.5s linear infinite';
        }
        
        // If all songs are loaded, hide loading screen after a short delay
        if (percentage >= 100 && !loadingComplete) {
            loadingComplete = true;
            setTimeout(hideLoadingScreen, 500);
        }
    }
    
    // Function to hide loading screen
    function hideLoadingScreen() {
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        
        if (appContainer) {
            appContainer.classList.add('visible');
        }
        
        // Completely remove loading screen after transition
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        }, 500);
    }
    
    // Simulate initial progress animation
    function animateInitialProgress() {
        let simulatedProgress = 0;
        const interval = setInterval(() => {
            simulatedProgress += 5;
            if (simulatedProgress > 70) {
                clearInterval(interval);
                return;
            }
            
            if (progressBar) {
                progressBar.style.width = `${simulatedProgress}%`;
            }
        }, 100);
    }
    
    // Start initial animation only if there are songs
    if (hasSongs) {
        animateInitialProgress();
    }
    
    // Expose functions to window
    window.loadingScreen = {
        updateProgress,
        hideLoadingScreen
    };
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeLoadingScreen);

// Initialize immediately if document is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeLoadingScreen();
}