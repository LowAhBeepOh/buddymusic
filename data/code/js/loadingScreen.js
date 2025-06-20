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
    
    // Check if songs exist in localStorage
    const hasSongs = localStorage.getItem('buddy-music-songs') !== null && localStorage.getItem('buddy-music-songs') !== '[]';
    
    // Get loading screen elements
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('loading-progress');
    const appContainer = document.getElementById('app-container');
    
    // Create compact loading bar for adding songs
    createCompactLoadingBar();
    
    // Skip loading screen only if loading screen element doesn't exist
    if (!loadingScreen) {
        console.log('Skipping loading screen: No loading screen element');
        
        if (appContainer) {
            appContainer.classList.add('visible');
        }
        return;
    }
    
    // If no songs exist, skip animation but still show loading screen briefly
    if (!hasSongs) {
        console.log('No songs found, showing brief loading screen');
        // Show loading screen briefly then hide it
        setTimeout(hideLoadingScreen, 1000);
    }
    
    // Show loading screen if songs exist
    loadingScreen.classList.remove('hidden');
    
    if (appContainer) {
        appContainer.classList.remove('visible');
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
        hideLoadingScreen,
        updateCompactLoadingBar,
        hideCompactLoadingBar
    };
}

// Create compact loading bar for adding songs
function createCompactLoadingBar() {
    // Check if compact loading bar already exists
    if (document.getElementById('compact-loading-container')) return;
    
    // Create compact loading bar elements
    const compactLoadingContainer = document.createElement('div');
    compactLoadingContainer.id = 'compact-loading-container';
    compactLoadingContainer.className = 'compact-loading-container hidden';
    
    const compactProgressContainer = document.createElement('div');
    compactProgressContainer.className = 'compact-progress-container';
    
    const compactProgressBar = document.createElement('div');
    compactProgressBar.id = 'compact-loading-progress';
    compactProgressBar.className = 'compact-progress-bar';
    
    // Append elements
    compactProgressContainer.appendChild(compactProgressBar);
    compactLoadingContainer.appendChild(compactProgressContainer);
    
    // Add to DOM after sidebar-header
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.parentNode.insertBefore(compactLoadingContainer, sidebarHeader.nextSibling);
    }
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .compact-loading-container {
            width: 100%;
            padding: 0;
            margin: 0 0 8px 0;
            overflow: hidden;
            transition: opacity 0.3s ease-out, max-height 0.3s ease-out;
            max-height: 6px;
            opacity: 1;
        }
        
        .compact-loading-container.hidden {
            opacity: 0;
            max-height: 0;
        }
        
        .compact-progress-container {
            width: 100%;
            height: 3px;
            background-color: rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
        
        :root[data-theme="silver"] .compact-progress-container,
        :root[data-theme="nature"] .compact-progress-container,
        :root[data-theme="prep"] .compact-progress-container {
            background-color: rgba(0, 0, 0, 0.15);
        }
        
        .compact-progress-bar {
            height: 100%;
            width: 0%;
            background-color: var(--accent-color);
            transition: width 0.3s ease-out;
        }
    `;
    document.head.appendChild(style);
}

// Function to update compact loading bar
function updateCompactLoadingBar(loaded, total) {
    const compactLoadingContainer = document.getElementById('compact-loading-container');
    const compactProgressBar = document.getElementById('compact-loading-progress');
    
    if (!compactLoadingContainer || !compactProgressBar) return;
    
    // Show compact loading bar
    compactLoadingContainer.classList.remove('hidden');
    
    // Calculate progress percentage
    const percentage = Math.min(100, Math.round((loaded / total) * 100));
    
    // Update progress bar width with moving gradient effect
    compactProgressBar.style.width = `${percentage}%`;
    const theme = document.documentElement.getAttribute('data-theme');
    const gradientColor = theme === 'adaptive' ? 'var(--progress-gradient-mid)' : 'rgba(255,255,255,0.5)';
    compactProgressBar.style.backgroundImage = `linear-gradient(90deg, transparent 25%, ${gradientColor} 50%, transparent 75%)`;
    compactProgressBar.style.backgroundSize = '200% 100%';
    compactProgressBar.style.animation = 'progressGradient 1.5s linear infinite';
    
    // Hide compact loading bar when complete
    if (percentage >= 100) {
        setTimeout(() => {
            compactLoadingContainer.classList.add('hidden');
        }, 500);
    }
}

// Function to hide compact loading bar
function hideCompactLoadingBar() {
    const compactLoadingContainer = document.getElementById('compact-loading-container');
    if (compactLoadingContainer) {
        compactLoadingContainer.classList.add('hidden');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeLoadingScreen);

// Initialize immediately if document is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeLoadingScreen();
}