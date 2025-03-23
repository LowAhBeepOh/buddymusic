/**
 * URL Search Handler
 * 
 * This script integrates with the main.js song loading process to handle URL search parameters.
 * If a query parameter like '?search=laufey' is found, it automatically populates the search input
 * field with that term and triggers the search functionality.
 * 
 * This implementation uses multiple strategies to ensure the search is triggered as soon as possible:
 * 1. Direct integration with the updatePlaylistView function in main.js
 * 2. Custom event listener for when songs are loaded and displayed
 * 3. MutationObserver to detect when playlist items are added to the DOM
 * 4. Fallback timeouts with progressively increasing intervals
 */

// Flag to track if search has been handled
let urlSearchHandled = false;

// Function to handle URL search parameters
function handleUrlSearchParams() {
    // If we've already handled the search, don't do it again
    if (urlSearchHandled) {
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    
    if (!searchQuery) {
        // No search query in URL, mark as handled
        urlSearchHandled = true;
        return;
    }
    
    console.log(`URL search parameter found: ${searchQuery}`);
    
    // Get the search input element
    const searchInput = document.getElementById('search-input');
    
    if (!searchInput) {
        console.error('Search input element not found');
        return;
    }
    
    // Set the search input value
    searchInput.value = searchQuery;
    
    // Trigger the input event to activate the search
    const inputEvent = new Event('input', {
        bubbles: true,
        cancelable: true
    });
    searchInput.dispatchEvent(inputEvent);
    
    console.log(`Search triggered with query: ${searchQuery}`);
    urlSearchHandled = true;
}

// Function to check if songs are loaded and search can be performed
function checkIfSongsLoaded() {
    // If we've already handled the search, don't check again
    if (urlSearchHandled) {
        return true;
    }
    
    // Check if the global songs array exists and has items
    if (window.songs && window.songs.length > 0) {
        // Also verify that the search input element exists
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            console.log('Songs loaded, handling URL search parameters');
            handleUrlSearchParams();
            return true;
        }
    }
    return false;
}

// Create a custom event that main.js can trigger when songs are fully loaded and displayed
window.songLoadedEvent = new CustomEvent('songsLoadedAndDisplayed');

// Method 1: Patch the updatePlaylistView function in main.js to trigger our search
const originalUpdatePlaylistView = window.updatePlaylistView;
if (typeof window.updatePlaylistView === 'function') {
    window.updatePlaylistView = function(songList) {
        // Call the original function first
        originalUpdatePlaylistView.call(this, songList);
        
        // Then handle URL search if needed
        if (!urlSearchHandled && songList && songList.length > 0) {
            setTimeout(handleUrlSearchParams, 0);
        }
    };
}

// Method 2: Listen for the custom event from main.js
document.addEventListener('songsLoadedAndDisplayed', () => {
    console.log('Received songsLoadedAndDisplayed event');
    if (!urlSearchHandled) {
        handleUrlSearchParams();
    }
});

// Method 3: Use MutationObserver to detect when playlist items are added to the DOM
const playlistObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if any of the added nodes are playlist items
            for (const node of mutation.addedNodes) {
                if (node.classList && node.classList.contains('playlist-item')) {
                    if (!urlSearchHandled) {
                        console.log('Playlist item added to DOM, handling URL search');
                        handleUrlSearchParams();
                        break;
                    }
                }
            }
        }
    }
});

// Start observing the playlist element
document.addEventListener('DOMContentLoaded', () => {
    const playlist = document.getElementById('playlist');
    if (playlist) {
        playlistObserver.observe(playlist, { childList: true, subtree: true });
    }
    
    // Method 4: Initial check for songs
    if (!checkIfSongsLoaded()) {
        console.log('Songs not loaded yet, setting up fallback checks');
        
        // Progressive fallback timeouts
        const timeouts = [100, 500, 1000, 2000, 3000];
        
        timeouts.forEach((timeout, index) => {
            setTimeout(() => {
                if (!urlSearchHandled) {
                    console.log(`Fallback check ${index + 1}: Checking for songs after ${timeout}ms`);
                    checkIfSongsLoaded();
                }
            }, timeout);
        });
    }
});