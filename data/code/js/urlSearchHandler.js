let urlSearchHandled = false;
let utmParamsHandled = false;

function handleUrlSearchParams() {
    if (urlSearchHandled) {
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    
    if (!searchQuery) {
        urlSearchHandled = true;
        return;
    }
    
    console.log(`URL search parameter found: ${searchQuery}`);
    
    const searchInput = document.getElementById('search-input');
    
    if (!searchInput) {
        console.error('Search input element not found');
        return;
    }
    
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

function handleUTMParams() {
    if (utmParamsHandled) {
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const utmMedium = urlParams.get('utm_medium');
    const utmSource = urlParams.get('utm_source');
    const utmCampaign = urlParams.get('utm_campaign');
    
    if (utmMedium === 'sponsor' && utmSource === 'youtube' && utmCampaign) {
        console.log(`UTM parameters found: medium=${utmMedium}, source=${utmSource}, campaign=${utmCampaign}`);
        
        if (typeof checkUTMParameters === 'function') {
            checkUTMParameters();
        } else {
            console.log('Waiting for sponsorPopup.js to load...');
            const checkInterval = setInterval(() => {
                if (typeof checkUTMParameters === 'function') {
                    checkUTMParameters();
                    clearInterval(checkInterval);
                }
            }, 200);
            
            setTimeout(() => clearInterval(checkInterval), 5000);
        }
    }
    
    utmParamsHandled = true;
}

function checkIfSongsLoaded() {
    if (!urlSearchHandled) {
        if (window.songs && window.songs.length > 0) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                console.log('Songs loaded, handling URL search parameters');
                handleUrlSearchParams();
                return true;
            }
        }
        return false;
    }
    
    if (!utmParamsHandled) {
        handleUTMParams();
    }
    
    return urlSearchHandled;
}

window.songLoadedEvent = new CustomEvent('songsLoadedAndDisplayed');

const originalUpdatePlaylistView = window.updatePlaylistView;
if (typeof window.updatePlaylistView === 'function') {
    window.updatePlaylistView = function(songList) {
        originalUpdatePlaylistView.call(this, songList);
        
        if (songList && songList.length > 0) {
            if (!urlSearchHandled) {
                setTimeout(handleUrlSearchParams, 0);
            }
            if (!utmParamsHandled) {
                setTimeout(handleUTMParams, 100);
            }
        }
    };
}

document.addEventListener('songsLoadedAndDisplayed', () => {
    console.log('Received songsLoadedAndDisplayed event');
    if (!urlSearchHandled) {
        handleUrlSearchParams();
    }
    if (!utmParamsHandled) {
        handleUTMParams();
    }
});

const playlistObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if any of the added nodes are playlist items
            for (const node of mutation.addedNodes) {
                if (node.classList && node.classList.contains('playlist-item')) {
                    if (!urlSearchHandled) {
                        console.log('Playlist item added to DOM, handling URL search');
                        handleUrlSearchParams();
                    }
                    if (!utmParamsHandled) {
                        console.log('Playlist item added to DOM, handling UTM parameters');
                        handleUTMParams();
                    }
                    break;
                }
            }
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const playlist = document.getElementById('playlist');
    if (playlist) {
        playlistObserver.observe(playlist, { childList: true, subtree: true });
    }
    
if (!checkIfSongsLoaded()) {
    console.log('Songs not loaded yet, setting up fallback checks');
    
    // Progressive fallback timeouts
    const timeouts = [100, 500, 1000, 2000, 3000];
    
    timeouts.forEach((timeout, index) => {
        setTimeout(() => {
            if (!urlSearchHandled || !utmParamsHandled) {
                console.log(`Fallback check ${index + 1}: Checking for songs and UTM parameters after ${timeout}ms`);
                checkIfSongsLoaded();
            }
        }, timeout);
    });
}

if (!utmParamsHandled) {
    setTimeout(handleUTMParams, 1500);
}
});