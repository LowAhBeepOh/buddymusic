/**
 * URL Search Handler
 * 
 * This script checks if all songs are loaded and then looks for a search query parameter in the URL.
 * If a query parameter like '?search=laufey' is found, it automatically populates the search input
 * field with that term and triggers the search functionality.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Function to check if songs are loaded and search input is available
    const checkIfSongsLoaded = () => {
        // Check if the global songs array exists and has items
        if (window.songs && window.songs.length > 0) {
            // Also verify that the search input element exists
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                console.log('Songs loaded and search input found, handling URL search parameters');
                handleUrlSearchParams();
                return true;
            }
        }
        return false;
    };

    // Function to handle URL search parameters
    const handleUrlSearchParams = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');
        
        if (searchQuery) {
            console.log(`URL search parameter found: ${searchQuery}`);
            
            // Get the search input element
            const searchInput = document.getElementById('search-input');
            
            if (searchInput) {
                // Set the search input value
                searchInput.value = searchQuery;
                
                // Wait a short moment to ensure the UI is ready
                setTimeout(() => {
                    // Trigger the input event to activate the search
                    const inputEvent = new Event('input', {
                        bubbles: true,
                        cancelable: true
                    });
                    searchInput.dispatchEvent(inputEvent);
                    
                    console.log(`Search triggered with query: ${searchQuery}`);
                }, 100);
            } else {
                console.error('Search input element not found');
            }
        }
    };

    // Initial check for songs
    if (!checkIfSongsLoaded()) {
        console.log('Songs not loaded yet, setting up interval to check periodically');
        
        // If songs aren't loaded yet, set up an interval to check periodically
        const checkInterval = setInterval(() => {
            console.log('Checking if songs are loaded...');
            if (checkIfSongsLoaded()) {
                clearInterval(checkInterval);
                console.log('Songs loaded, URL search parameter handling complete');
            }
        }, 300); // Check more frequently (300ms)
        
        // Set a timeout to stop checking after a reasonable time (30 seconds)
        setTimeout(() => {
            clearInterval(checkInterval);
            console.log('Stopped checking for songs loading after timeout');
            
            // One final attempt to handle URL parameters even if songs aren't detected
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                handleUrlSearchParams();
            }
        }, 30000);
    }
});