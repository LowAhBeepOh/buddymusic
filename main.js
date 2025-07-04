document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        audioPlayer: document.getElementById('audio-player'),
        fileInput: document.getElementById('file-input'),
        playlist: document.getElementById('playlist'),
        playBtn: document.getElementById('play-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        shuffleBtn: document.getElementById('shuffle-btn'),
        loopBtn: document.getElementById('loop-btn'),
        progressBar: document.getElementById('progress-bar'),
        volumeControl: document.getElementById('volume'),
        currentTimeSpan: document.getElementById('current-time'),
        durationSpan: document.getElementById('duration'),
        currentSongTitle: document.getElementById('current-song'),
        artistName: document.getElementById('artist-name'),
        albumName: document.getElementById('album-name'),
        coverArt: document.getElementById('cover-art'),
        themeSelect: document.getElementById('settings-theme-select'),
        sortSelect: document.getElementById('sort-select'),
        searchInput: document.getElementById('search-input'),
        tabButtons: document.querySelectorAll('.tab-btn'),
        queueList: document.getElementById('queue-list'),
        recentList: document.getElementById('recent-list'),
        settingsBtn: document.getElementById('settings-btn'),
        settingsPanel: document.getElementById('settings-panel'),
        closeSettingsBtn: document.getElementById('close-settings-btn'),
        fontSizeSelect: document.getElementById('font-size'),
        fontFamilySelect: document.getElementById('font-family'),
        reduceAnimationsToggle: document.getElementById('reduce-animations'),
        useFuzzySearchToggle: document.getElementById('use-fuzzy-search'),
        folderInput: document.getElementById('folder-input'),
        clearDatabaseBtn: document.getElementById('clear-database'),
        clearEverythingBtn: document.getElementById('clear-everything'),
        autoSaveSelect: document.getElementById('auto-save'),
        addBtn: document.getElementById('add-btn'),
        addDropdown: document.getElementById('add-dropdown'),
        eqEnabled: document.getElementById('eq-enabled'),
        eqControls: document.getElementById('eq-controls'),
        eqBass: document.getElementById('eq-bass'),
        eqMid: document.getElementById('eq-mid'),
        eqTreble: document.getElementById('eq-treble'),
        eqBassValue: document.getElementById('eq-bass-value'),
        eqMidValue: document.getElementById('eq-mid-value'),
        eqTrebleValue: document.getElementById('eq-treble-value'),
        eqPreset: document.getElementById('eq-preset')
    };

    let audioContext;
    let analyser;
    let dataArray;
    let eqFilters = {
        bass: null,
        mid: null,
        treble: null
    };
    let sourceNode = null;
    let eqEnabled = false;
    let baseColors = {
        primary: [30, 30, 30],
        secondary: [45, 45, 45],
        darkest: [20, 20, 20],
        lightest: [255, 255, 255],
        mostColorful: [100, 100, 100]
    };
    
    // Add button dropdown functionality
    elements.addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.addDropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.addBtn.contains(e.target) && !elements.addDropdown.contains(e.target)) {
            elements.addDropdown.classList.remove('show');
        }
    });

    function getImageColors(imgElement) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 300;
            canvas.height = 300;
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const colors = new Map();
            let darkest = [255, 255, 255];
            let lightest = [0, 0, 0];
            let mostColorful = [0, 0, 0];
            let maxColorfulness = 0;
            
            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const a = imageData[i + 3];
                
                if (a < 128) continue;
                
                const key = `${r},${g},${b}`;
                colors.set(key, (colors.get(key) || 0) + 1);
                
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                
                if (brightness < ((darkest[0] * 299 + darkest[1] * 587 + darkest[2] * 114) / 1000)) {
                    darkest = [r, g, b];
                }
                
                if (brightness > ((lightest[0] * 299 + lightest[1] * 587 + lightest[2] * 114) / 1000)) {
                    lightest = [r, g, b];
                }
                
                const colorfulness = Math.sqrt((r - g) ** 2 + (r - b) ** 2 + (g - b) ** 2);
                if (colorfulness > maxColorfulness) {
                    maxColorfulness = colorfulness;
                    mostColorful = [r, g, b];
                }
            }
            
            const sortedColors = Array.from(colors.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([color]) => color.split(',').map(Number));
            
            baseColors = {
                primary: sortedColors[0] || [30, 30, 30],
                secondary: sortedColors[1] || [45, 45, 45],
                darkest: darkest,
                lightest: lightest,
                mostColorful: mostColorful
            };

            resolve({
                primary: adjustColorBrightness(sortedColors[0]) || [30, 30, 30],
                secondary: adjustColorBrightness(sortedColors[1] || sortedColors[0]) || [45, 45, 45],
                darkest: darkest,
                lightest: lightest,
                mostColorful: mostColorful
            });
        });
    }

    function adjustColorBrightness(color) {
        if (!color) return [20, 20, 30]; // Darkened default color
        
        const hsl = rgbToHsl(color);
        
        // Reduce saturation boost and lower brightness for darker colors
        hsl[1] = Math.min(1, hsl[1] * 1.2); // Reduced saturation multiplier
        
        // Lower minimum brightness while keeping it readable
        hsl[2] = Math.max(0.18, Math.min(0.35, hsl[2])); // Lowered brightness range
        
        return hslToRgb(hsl);
    }

    function calculateContrast(rgb1, rgb2) {
        const luminance1 = calculateLuminance(rgb1);
        const luminance2 = calculateLuminance(rgb2);
        const brightest = Math.max(luminance1, luminance2);
        const darkest = Math.min(luminance1, luminance2);
        return (brightest + 0.05) / (darkest + 0.05);
    }

    function calculateLuminance(rgb) {
        const [r, g, b] = rgb.map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function adjustColorContrast(backgroundColor, textColor, minContrast = 8.5) {
        let adjustedText = [...textColor];
        let contrast = calculateContrast(backgroundColor, adjustedText);
        let attempts = 0;
        
        while (contrast < minContrast && attempts < 100) {
            if (calculateLuminance(backgroundColor) > 0.5) {
                adjustedText = adjustedText.map(c => Math.max(0, c - 20)); // More gradual adjustments
            } else {
                adjustedText = adjustedText.map(c => Math.min(255, c + 20));
            }
            contrast = calculateContrast(backgroundColor, adjustedText);
            attempts++;
        }
        
        return adjustedText;
    }

    function updateAdaptiveTheme(colorData) {
        const root = document.documentElement;
        let { primary, secondary, darkest, lightest, mostColorful } = colorData;
        
        // Ensure darkest color has minimum brightness
        const darkestHsl = rgbToHsl(darkest);
        darkestHsl[2] = Math.max(0.15, darkestHsl[2]); // Reduced minimum brightness for darker backgrounds
        darkest = hslToRgb(darkestHsl);
        
        primary = adjustColorBrightnessToPercentage(primary, 0.3); // Reduced from 0.4 for darker colors
        secondary = adjustColorBrightnessToPercentage(secondary, 0.3); // Reduced from 0.4 for darker colors
        
        const glowColor = calculateGlowColor(mostColorful);
        
        // Enhanced text colors for better contrast
        const textColor = [255, 255, 255];
        lightest = textColor;
        const adjustedSecondaryText = [245, 245, 245]; // Even brighter secondary text
        const textTint = adjustColorContrast(darkest, mostColorful, 9.0); // Increased contrast
        
        // Improved sidebar colors with better contrast
        const sidebarPrimary = adjustColorContrast(darkest, primary, 8.0);
        const sidebarSecondary = adjustColorContrast(darkest, secondary, 8.0);
        
        const toHex = (rgb) => '#' + rgb.map(x => Math.min(255, Math.max(0, Math.round(x))).toString(16).padStart(2, '0')).join('');
        const toRGBA = (rgb, alpha) => `rgba(${rgb.join(', ')}, ${alpha})`;
        
        const cssVariables = {
            '--bg-primary': toHex(darkest),
            '--bg-secondary': `linear-gradient(135deg, ${toHex(sidebarPrimary)} 0%, ${toHex(sidebarSecondary)} 100%)`,
            '--bg-tertiary': `linear-gradient(135deg, ${toHex(sidebarSecondary)} 0%, ${toHex(adjustColorBrightness(sidebarSecondary))} 100%)`,
            '--text-primary': toHex(lightest),
            '--text-secondary': toRGBA(adjustedSecondaryText, 0.99), // Increased opacity for better readability
            '--accent-color': toHex(textTint),
            '--hover-color': toRGBA(secondary, 0.45), // Slightly reduced hover opacity for more subtle effect
            '--text-tint': toHex(textTint),
            '--album-glow': toRGBA(glowColor, 0.55), // Slightly reduced glow effect
            '--button-text': toHex([255, 255, 255])
        };

        requestAnimationFrame(() => {
            Object.entries(cssVariables).forEach(([property, value]) => {
                root.style.setProperty(property, value);
            });
        });
    }

    function calculateGlowColor(baseColor) {
        const lightenAmount = 1.5;
        return baseColor.map(c => Math.min(255, Math.round(c * lightenAmount)));
    }

    function adjustColorBrightnessToPercentage(color, percentage) {
        const hsl = rgbToHsl(color);
        
        // Slightly reduce saturation boost for more muted colors
        hsl[1] = Math.max(0.35, Math.min(0.85, hsl[1] * 1.1)); // Reduced saturation limits
        hsl[2] = Math.min(Math.max(0.3, hsl[2]), 0.8); // Improved brightness range
        
        const adjustedRgb = hslToRgb(hsl);
        return adjustedRgb.map(c => Math.min(255, Math.round(c)));
    }

    function rgbToHsl(rgb) {
        let [r, g, b] = rgb.map(x => x / 255);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h, s, l];
    }

    function hslToRgb(hsl) {
        let [h, s, l] = hsl;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [r, g, b].map(x => Math.round(x * 255));
    }

    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Element not found: ${key}`);
        }
    }

    let songs = [];
    let currentSongIndex = 0;
    let isPlaying = false;
    let isShuffled = false;
    let loopState = 'all';
    let queue = [];
    let recentlyPlayed = [];
    let currentPlaylist = 'main';

    let favorites = new Set(JSON.parse(localStorage.getItem('buddy-music-favorites') || '[]'));

    function saveFavorites() {
        localStorage.setItem('buddy-music-favorites', JSON.stringify([...favorites]));
    }

    class FavoritesDB {
        constructor() {
            this.dbName = 'BuddyMusicDB';
            this.dbVersion = 1;
            this.storeName = 'favorites';
            this.init();
        }

        async init() {
            try {
                this.db = await new Promise((resolve, reject) => {
                    const request = indexedDB.open(this.dbName, this.dbVersion);
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                    
                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains(this.storeName)) {
                            db.createObjectStore(this.storeName, { keyPath: 'id' });
                        }
                    };
                });
            } catch (error) {
                console.error('Failed to initialize IndexedDB:', error);
            }
        }

        async saveSong(song) {
            try {
                await this.init();
                const songData = {
                    id: `${song.metadata.title}|||${song.metadata.artist}`,
                    metadata: song.metadata,
                    file: await this.fileToArrayBuffer(song.file)
                };
                
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.put(songData);
                    
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Failed to save song:', error);
            }
        }

        async deleteSong(songId) {
            try {
                await this.init();
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.delete(songId);
                    
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Failed to delete song:', error);
            }
        }

        async getAllSongs() {
            try {
                await this.init();
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.getAll();
                    
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Failed to get songs:', error);
                return [];
            }
        }

        async fileToArrayBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(file);
            });
        }

        async clearDatabase() {
            try {
                await this.init();
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.clear();
                    
                    transaction.oncomplete = () => {
                        console.log('Favorites database cleared successfully');
                        resolve();
                    };
                    transaction.onerror = () => reject(transaction.error);
                });
            } catch (error) {
                console.error('Failed to clear favorites database:', error);
                throw error;
            }
        }
    }

    class SongsDB {
        constructor() {
            this.dbName = 'BuddyMusicSongsDB';
            this.dbVersion = 1;
            this.storeName = 'songs';
            this.init();
        }

        async init() {
            try {
                this.db = await new Promise((resolve, reject) => {
                    const request = indexedDB.open(this.dbName, this.dbVersion);
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                    
                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains(this.storeName)) {
                            db.createObjectStore(this.storeName, { keyPath: 'id' });
                        }
                    };
                });
            } catch (error) {
                console.error('Failed to initialize SongsDB:', error);
            }
        }

        async saveSong(song) {
            try {
                await this.init();
                const songData = {
                    id: `${song.metadata.title}|||${song.metadata.artist}`,
                    metadata: song.metadata,
                    file: await this.fileToArrayBuffer(song.file)
                };
                
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.put(songData);
                    
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Failed to save song:', error);
            }
        }

        async getAllSongs() {
            try {
                await this.init();
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.getAll();
                    
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Failed to get songs:', error);
                return [];
            }
        }

        async clearDatabase() {
            try {
                await this.init();
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.clear();
                    
                    transaction.oncomplete = () => {
                        console.log('Database cleared successfully');
                        resolve();
                    };
                    transaction.onerror = () => reject(transaction.error);
                });
            } catch (error) {
                console.error('Failed to clear database:', error);
                throw error;
            }
        }

        async fileToArrayBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(file);
            });
        }

        async deleteSong(songId) {
            try {
                await this.init();
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.delete(songId);
                    
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Failed to delete song:', error);
                throw error;
            }
        }
    }

    const favoritesDB = new FavoritesDB();
    const songsDB = new SongsDB();

    async function toggleFavorite(event, songMetadata) {
        event.stopPropagation();
        const key = `${songMetadata.title}|||${songMetadata.artist}`;
        const btn = event.currentTarget;
        const settings = getSettings();
        
        if (favorites.has(key)) {
            favorites.delete(key);
            btn.classList.remove('active');
            await favoritesDB.deleteSong(key);
            if (settings.autoSave === 'favorites') {
                await songsDB.deleteSong(key);
            }
        } else {
            favorites.add(key);
            btn.classList.add('active');
            const song = songs.find(s => 
                s.metadata.title === songMetadata.title && 
                s.metadata.artist === songMetadata.artist
            );
            if (song) {
                await favoritesDB.saveSong(song);
                if (settings.autoSave === 'favorites') {
                    await songsDB.saveSong(song);
                }
            }
        }
        
        saveFavorites();
    }

    function isFavorite(songMetadata) {
        return favorites.has(`${songMetadata.title}|||${songMetadata.artist}`);
    }

    elements.fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) return;
        
        // Show compact loading bar for adding songs
        if (window.loadingScreen) {
            window.loadingScreen.updateCompactLoadingBar(0, files.length);
        }
        
        // Use SongManager to load only metadata initially and append to existing songs
        const newSongs = await window.songManager.addSongs(files, getMetadata, (processedCount) => {
            console.log(`Processed ${processedCount}/${files.length} songs`);
            
            // Update compact loading bar progress
            if (window.loadingScreen) {
                window.loadingScreen.updateCompactLoadingBar(processedCount, files.length);
            }
        });
        
        // Append new songs instead of reassigning the array
        songs.push(...newSongs);
        
        // Update the playlist with all songs
        visibleSongs = [...songs];
        updatePlaylistView(visibleSongs);
        
        // Hide compact loading bar
        if (window.loadingScreen) {
            window.loadingScreen.hideCompactLoadingBar();
        }
        
        // Dispatch custom event to notify URL search handler that songs are loaded and displayed
        setTimeout(() => {
            if (window.songLoadedEvent) {
                document.dispatchEvent(window.songLoadedEvent);
                console.log('Dispatched songsLoadedAndDisplayed event');
            }
        }, 100); // Small delay to ensure DOM is updated
        
        if (songs.length > 0) loadSong(0);
    });

    function getMetadata(file) {
        return new Promise((resolve) => {
            if (typeof jsmediatags === 'undefined') {
                console.error('jsmediatags library not loaded');
                resolve(getDefaultMetadata(file));
                return;
            }

            try {
                jsmediatags.read(file, {
                    onSuccess: function(tag) {
                        console.log('Metadata read successfully:', tag);
                        
                        if (!tag || !tag.tags) {
                            console.log('No tags found in file:', file.name);
                            resolve(getDefaultMetadata(file));
                            return;
                        }

                        const { title, artist, album, picture, year, genre } = tag.tags;
                        let coverUrl = null;

                        if (picture) {
                            try {
                                const { data, format } = picture;
                                const base64String = data.reduce((acc, cur) => acc + String.fromCharCode(cur), '');
                                coverUrl = `data:${format};base64,${btoa(base64String)}`;
                            } catch (e) {
                                console.error('Error processing cover art:', e);
                            }
                        }

                        resolve({
                            title: cleanMetadata(title) || file.name,
                            artist: cleanMetadata(artist) || 'Unknown Artist',
                            album: cleanMetadata(album) || 'Unknown Album',
                            year: cleanMetadata(year) || 'Unknown Year',
                            genre: cleanMetadata(genre) || 'Unknown Genre',
                            coverUrl
                        });
                    },
                    onError: function(error) {
                        console.error('Error reading metadata for file:', file.name, error);
                        resolve(getDefaultMetadata(file));
                    }
                });
            } catch (e) {
                console.error('Exception while reading metadata:', e);
                resolve(getDefaultMetadata(file));
            }
        });
    }

    function getDefaultMetadata(file) {
        const filename = file.name.replace(/\.[^/.]+$/, "");
        const parts = filename.split(' - ').map(part => part.trim());
        
        if (parts.length >= 2) {
            return {
                title: parts[1],
                artist: parts[0],
                album: 'Unknown Album',
                coverUrl: null
            };
        }
        
        return {
            title: filename,
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            coverUrl: null
        };
    }

    function cleanMetadata(value) {
        if (!value) return null;
        const cleaned = value
            .replace(/\0/g, '')
            .replace(/^\s+|\s+$/g, '')
            .replace(/\s+/g, ' ');
        
        return cleaned || null;
    }

    function getSettings() {
        return JSON.parse(localStorage.getItem('buddy-music-settings')) || {
            fontSize: 'medium',
            fontFamily: 'inter',
            reduceAnimations: false,
            autoSave: 'favorites',
            useFuzzySearch: true,
            eqEnabled: false,
            eqBass: 0,
            eqMid: 0,
            eqTreble: 0,
            eqPreset: 'flat'
        };
    }

    async function updatePlaylist(files, onProgress) {
        const settings = getSettings();
        const updates = [];
        
        // Ensure files is always an array
        const fileArray = Array.from(files || []);
        
        // Use SongManager to load only metadata initially
        const newSongs = await window.songManager.addSongs(fileArray, getMetadata, onProgress);
        
        // Append new songs instead of reassigning the array
        songs.push(...newSongs);
        
        // Handle database updates for the new songs
        for (const song of newSongs) {
            if (settings.autoSave === 'all') {
                updates.push(songsDB.saveSong(song));
            } else if (settings.autoSave === 'favorites' && isFavorite(song.metadata)) {
                updates.push(songsDB.saveSong(song));
            }
        }
        
        // Update the visible songs list
        visibleSongs = [...songs];
        updatePlaylistView(visibleSongs);
        
        // Dispatch the custom event to notify that songs are loaded and displayed
        if (window.songLoadedEvent) {
            console.log('Dispatching songsLoadedAndDisplayed event');
            document.dispatchEvent(window.songLoadedEvent);
        }
        
        // Handle any database errors
        Promise.all(updates).catch(error => {
            console.error('Error saving songs to database:', error);
        });
        
        return newSongs;
    }

    function createPlaylistItem(song, index, clickHandler) {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        div.dataset.songId = getSongId(song);
        div.innerHTML = `
            <span class="song-title">${song.metadata.title}</span>
            <span class="song-separator"> - </span>
            <span class="song-artist">${song.metadata.artist}</span>
        `;
        
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, song, index);
        });
        
        div.addEventListener('click', () => clickHandler(index));
        
        return div;
    }

    async function checkIfSongIsSaved(song) {
        try {
            const songId = `${song.metadata.title}|||${song.metadata.artist}`;
            const allSongs = await songsDB.getAllSongs();
            const isSaved = allSongs.some(s => s.id === songId);
            return isSaved;
        } catch (error) {
            console.error('Error checking if song is saved:', error);
            return false;
        }
    }

    function showContextMenu(event, song, index) {
        event.preventDefault();
        
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();
        
        // Create and show the menu immediately
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        
        // Initial menu content with loading state for save option
        contextMenu.innerHTML = `
            <ul>
                <li data-action="queue">
                    <span class="material-symbols-rounded">queue_music</span>
                    Add to Queue
                </li>
                <li data-action="favorite">
                    <span class="material-symbols-rounded">favorite</span>
                    ${isFavorite(song.metadata) ? 'Remove from Favorites' : 'Add to Favorites'}
                </li>
                <li data-action="save">
                    <span class="material-symbols-rounded">save</span>
                    Save Locally
                </li>
                <li data-action="delete">
                    <span class="material-symbols-rounded">delete</span>
                    Delete
                </li>
            </ul>
        `;

        // Position and show the menu immediately
        contextMenu.style.top = `${event.pageY}px`;
        contextMenu.style.left = `${event.pageX}px`;
        document.body.appendChild(contextMenu);
        
        // Asynchronously check if the song is saved and update the menu
        checkIfSongIsSaved(song).then(isSaved => {
            const saveItem = contextMenu.querySelector('li[data-action="save"]');
            if (saveItem) {
                if (isSaved) {
                    saveItem.classList.add('disabled');
                    saveItem.innerHTML = `
                        <span class="material-symbols-rounded">save</span>
                        Already Saved
                    `;
                }
            }
        }).catch(error => {
            console.error('Error checking if song is saved:', error);
        });

        // Rest of the click handlers
        contextMenu.addEventListener('click', async (e) => {
            const menuItem = e.target.closest('li');
            if (!menuItem) return;
            const action = menuItem.dataset.action;
            
            if (menuItem.classList.contains('disabled')) {
                contextMenu.remove();
                return;
            }

            switch(action) {
                case 'queue':
                    addToQueue(index);
                    break;
                case 'favorite':
                    toggleFavorite(e, song.metadata);
                    break;
                case 'save':
                    try {
                        await songsDB.saveSong(song);
                        menuItem.innerHTML = `
                            <span class="material-symbols-rounded">check</span>
                            Saved Successfully
                        `;
                        menuItem.classList.add('disabled');
                        setTimeout(() => contextMenu.remove(), 1000);
                    } catch (error) {
                        console.error('Failed to save song:', error);
                        menuItem.innerHTML = `
                            <span class="material-symbols-rounded">error</span>
                            Failed to Save
                        `;
                        setTimeout(() => contextMenu.remove(), 1000);
                    }
                    break;
                case 'delete':
                    if (confirm('Are you sure you want to delete this song?')) {
                        const songId = `${song.metadata.title}|||${song.metadata.artist}`;
                        await Promise.all([
                            songsDB.deleteSong(songId),
                            favoritesDB.deleteSong(songId)
                        ]);
                        favorites.delete(songId);
                        const songIndex = songs.indexOf(song);
                        if (songIndex > -1) {
                            songs.splice(songIndex, 1);
                            updatePlaylistView(songs);
                        }
                    }
                    break;
            }
            
            contextMenu.remove();
        });

        const closeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }

    function addToQueue(songIndex) {
        const song = songs[songIndex];
        if (songMatchesCurrentSearch(song) && !queue.includes(song)) {
            queue.push(song);
            updateQueueView();
        }
    }

    function updateQueueView() {
        elements.queueList.innerHTML = '';
        
        if (queue.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-queue-message';
            emptyMessage.textContent = 'Queue is empty. Right-click songs to add them to queue.';
            elements.queueList.appendChild(emptyMessage);
            return;
        }

        queue.forEach((song, index) => {
            const div = createPlaylistItem(
                song,
                index,
                () => {
                    const songIndex = songs.indexOf(song);
                    loadSong(songIndex);
                    queue.splice(index, 1);
                    updateQueueView();
                }
            );
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-queue-btn';
            removeBtn.innerHTML = '<span class="material-symbols-rounded">remove_circle</span>';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                queue.splice(index, 1);
                updateQueueView();
            });
            
            div.appendChild(removeBtn);
            elements.queueList.appendChild(div);
        });
    }

    function updateDocumentTitle(song) {
        if (song) {
            document.title = `${song.metadata.title} - ${song.metadata.artist}`;
        } else {
            document.title = "Buddy Music";
        }
    }

    const originalLoadSong = loadSong;
    loadSong = async function(index) {
        const song = songs[index];
        if (song) {
            updateDocumentTitle(song);
            if (document.documentElement.getAttribute('data-theme') === 'adaptive') {
                if (song.metadata.coverUrl) {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onerror = () => {
                        requestAnimationFrame(() => {
                            updateAdaptiveTheme({
                                primary: [30, 30, 30],
                                secondary: [45, 45, 45],
                                darkest: [20, 20, 20],
                                lightest: [255, 255, 255],
                                mostColorful: [100, 100, 100]
                            });
                        });
                    };
                    
                    await new Promise((resolve) => {
                        img.onload = async () => {
                            requestAnimationFrame(async () => {
                                const colors = await getImageColors(img);
                                updateAdaptiveTheme(colors);
                                resolve();
                            });
                        };
                        img.src = song.metadata.coverUrl;
                    });
                }
            }
            
            originalLoadSong.call(this, index);
            addToRecentlyPlayed(song);
        }
    };

    let currentlyPlayingSongId = null;

    async function loadSong(index) {
        const song = songs[index];
        if (!song) return;

        try {
            console.log(`Loading song: ${song.metadata.title} by ${song.metadata.artist}`);
            
            // Use SongManager to load the audio data only when needed
            const songData = await window.songManager.loadSong(index);
            
            if (songData && songData.buffer) {
                const blob = new Blob([songData.buffer], { type: song.file.type });
                elements.audioPlayer.src = URL.createObjectURL(blob);
                
                // Log memory usage statistics
                console.log('Memory usage:', window.songManager.getMemoryStats());
            }
        } catch (error) {
            console.error('Error loading song:', error);
        }

        if (!visibleSongs?.length) {
            visibleSongs = [...songs];
        }
        
        if (!songs.length) {
            console.warn('No songs available to play');
            return;
        }

        const visibleIndex = typeof index === 'number' ? index : 0;
        const targetSong = visibleSongs[visibleIndex];
        
        if (!targetSong) {
            console.warn('Could not find song at index:', visibleIndex);
            return;
        }

        currentSongIndex = songs.indexOf(targetSong);
        const metadata = targetSong.metadata;
        const file = targetSong.file;
        
        const songId = getSongId(targetSong);
        
        if (songId !== currentlyPlayingSongId) {
            currentlyPlayingSongId = songId;
            
            if (document.documentElement.getAttribute('data-theme') === 'adaptive' && metadata.coverUrl) {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onerror = () => {
                    updateAdaptiveTheme({
                        primary: [30, 30, 30],
                        secondary: [45, 45, 45],
                        darkest: [20, 20, 20],
                        lightest: [255, 255, 255]
                    });
                };
                img.onload = async () => {
                    const colors = await getImageColors(img);
                    updateAdaptiveTheme(colors);
                };
                img.src = metadata.coverUrl;
            }
        }
        
        if (elements.currentSongTitle) elements.currentSongTitle.textContent = metadata.title;
        if (elements.artistName) elements.artistName.textContent = metadata.artist;
        if (elements.albumName) elements.albumName.textContent = metadata.album;
        if (elements.coverArt) {
            if (metadata.coverUrl) {
                elements.coverArt.src = metadata.coverUrl;
                elements.coverArt.onerror = () => {
                    elements.coverArt.src = './data/images/albumCoverFiller.png';
                };
            } else {
                elements.coverArt.src = './data/images/albumCoverFiller.png';
            }
        }

        if ('mediaSession' in navigator) {
            // Set metadata for the currently playing media
            navigator.mediaSession.metadata = new MediaMetadata({
                title: metadata.title || 'Unknown Title',
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || 'Unknown Album',
                artwork: metadata.coverUrl ? [
                    { src: metadata.coverUrl, sizes: '96x96', type: 'image/jpeg' },
                    { src: metadata.coverUrl, sizes: '128x128', type: 'image/jpeg' },
                    { src: metadata.coverUrl, sizes: '192x192', type: 'image/jpeg' },
                    { src: metadata.coverUrl, sizes: '256x256', type: 'image/jpeg' },
                    { src: metadata.coverUrl, sizes: '384x384', type: 'image/jpeg' },
                    { src: metadata.coverUrl, sizes: '512x512', type: 'image/jpeg' }
                ] : [{ src: './data/images/albumCoverFiller.png', sizes: '512x512', type: 'image/png' }]
            });

            // Update playback state
            navigator.mediaSession.playbackState = 'playing';

            // Add MediaSession action handlers
            navigator.mediaSession.setActionHandler('play', () => {
                console.log('Media Session: play action triggered');
                playAudio();
            });
            
            navigator.mediaSession.setActionHandler('pause', () => {
                console.log('Media Session: pause action triggered');
                pauseAudio();
            });
            
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                console.log('Media Session: previous track action triggered');
                playPrevious();
            });
            
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                console.log('Media Session: next track action triggered');
                playNext();
            });
            
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                console.log('Media Session: seek to action triggered', details);
                if (details.fastSeek && 'fastSeek' in elements.audioPlayer) {
                    elements.audioPlayer.fastSeek(details.seekTime);
                    return;
                }
                elements.audioPlayer.currentTime = details.seekTime;
            });
            
            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                console.log('Media Session: seek backward action triggered');
                const skipTime = details.seekOffset || 10;
                elements.audioPlayer.currentTime = Math.max(elements.audioPlayer.currentTime - skipTime, 0);
            });
            
            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                console.log('Media Session: seek forward action triggered');
                const skipTime = details.seekOffset || 10;
                elements.audioPlayer.currentTime = Math.min(
                    elements.audioPlayer.currentTime + skipTime,
                    elements.audioPlayer.duration
                );
            });
        }

        if (elements.audioPlayer) {
            const url = URL.createObjectURL(file);
            elements.audioPlayer.src = url;
            
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                sourceNode = audioContext.createMediaElementSource(elements.audioPlayer);
                
                // Initialize EQ filters
                initializeEQ();
                
                // Connect audio chain
                connectAudioChain();
                
                dataArray = new Uint8Array(analyser.frequencyBinCount);
            }

            if (document.documentElement.getAttribute('data-theme') === 'adaptive') {
                startVisualization();
            }

            highlightCurrentSong();
            playAudio();
        }
    }

    // EQ Functions
    function initializeEQ() {
        if (!audioContext) return;
        
        // Create biquad filters for EQ
        eqFilters.bass = audioContext.createBiquadFilter();
        eqFilters.mid = audioContext.createBiquadFilter();
        eqFilters.treble = audioContext.createBiquadFilter();
        
        // Configure filter types and frequencies
        eqFilters.bass.type = 'lowshelf';
        eqFilters.bass.frequency.setValueAtTime(320, audioContext.currentTime);
        eqFilters.bass.gain.setValueAtTime(0, audioContext.currentTime);
        
        eqFilters.mid.type = 'peaking';
        eqFilters.mid.frequency.setValueAtTime(1000, audioContext.currentTime);
        eqFilters.mid.Q.setValueAtTime(1, audioContext.currentTime);
        eqFilters.mid.gain.setValueAtTime(0, audioContext.currentTime);
        
        eqFilters.treble.type = 'highshelf';
        eqFilters.treble.frequency.setValueAtTime(3200, audioContext.currentTime);
        eqFilters.treble.gain.setValueAtTime(0, audioContext.currentTime);
    }
    
    function connectAudioChain() {
        if (!sourceNode || !audioContext) return;
        
        if (eqEnabled) {
            // Connect through EQ filters
            sourceNode.connect(eqFilters.bass);
            eqFilters.bass.connect(eqFilters.mid);
            eqFilters.mid.connect(eqFilters.treble);
            eqFilters.treble.connect(analyser);
            analyser.connect(audioContext.destination);
        } else {
            // Direct connection
            sourceNode.connect(analyser);
            analyser.connect(audioContext.destination);
        }
    }
    
    function updateEQFilter(filterType, value) {
        if (!eqFilters[filterType] || !audioContext) return;
        
        const gain = parseFloat(value);
        eqFilters[filterType].gain.setValueAtTime(gain, audioContext.currentTime);
    }
    
    function applyEQPreset(preset) {
        const presets = {
            flat: { bass: 0, mid: 0, treble: 0 },
            rock: { bass: 4, mid: -2, treble: 3 },
            pop: { bass: 2, mid: 1, treble: 2 },
            jazz: { bass: 1, mid: 2, treble: 1 },
            classical: { bass: -1, mid: 1, treble: 2 },
            electronic: { bass: 6, mid: -1, treble: 4 }
        };
        
        if (presets[preset]) {
            const values = presets[preset];
            elements.eqBass.value = values.bass;
            elements.eqMid.value = values.mid;
            elements.eqTreble.value = values.treble;
            
            updateEQFilter('bass', values.bass);
            updateEQFilter('mid', values.mid);
            updateEQFilter('treble', values.treble);
            
            elements.eqBassValue.textContent = `${values.bass} dB`;
            elements.eqMidValue.textContent = `${values.mid} dB`;
            elements.eqTrebleValue.textContent = `${values.treble} dB`;
        }
    }

    function startVisualization() {
        if (!analyser) return;
        
        let currentColors = { ...baseColors };
        const fadeSpeed = 0.97;
        let prevIntensity = 0;
        let prevBassBoost = 0;
        const smoothingFactor = 0.15;
        
        function updateColors() {
            if (document.documentElement.getAttribute('data-theme') !== 'adaptive') {
                return;
            }

            if (!isPlaying) {
                const fadingSpeed = 0.98;
                currentColors = {
                    primary: interpolateColors(currentColors.primary, baseColors.primary, fadingSpeed),
                    secondary: interpolateColors(currentColors.secondary, baseColors.secondary, fadingSpeed),
                    darkest: interpolateColors(currentColors.darkest, baseColors.darkest, fadingSpeed),
                    lightest: baseColors.lightest,
                    mostColorful: interpolateColors(currentColors.mostColorful, baseColors.mostColorful, fadingSpeed)
                };

                if (!isColorsSimilar(currentColors, baseColors)) {
                    requestAnimationFrame(() => {
                        updateAdaptiveTheme(currentColors);
                        requestAnimationFrame(updateColors);
                    });
                }
                return;
            }

            analyser.getByteFrequencyData(dataArray);
            
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            const bassIntensity = dataArray.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
            
            const targetIntensity = Math.min(average / 128, 1) * 0.3;
            const targetBassBoost = Math.min(bassIntensity / 200, 1) * 0.2;
            
            prevIntensity = prevIntensity + (targetIntensity - prevIntensity) * smoothingFactor;
            prevBassBoost = prevBassBoost + (targetBassBoost - prevBassBoost) * smoothingFactor;

            currentColors = {
                primary: interpolateColors(currentColors.primary, baseColors.primary),
                secondary: interpolateColors(currentColors.secondary, baseColors.secondary),
                darkest: interpolateColors(currentColors.darkest, 
                    baseColors.darkest.map(c => Math.min(255, c + prevBassBoost * 30))),
                lightest: baseColors.lightest,
                mostColorful: interpolateColors(currentColors.mostColorful, 
                    baseColors.mostColorful.map(c => Math.min(255, c + prevIntensity * 40)))
            };

            requestAnimationFrame(() => {
                updateAdaptiveTheme(currentColors);
                requestAnimationFrame(updateColors);
            });
        }

        function interpolateColors(current, target, speed = fadeSpeed) {
            return current.map((c, i) => {
                const targetValue = Math.min(255, target[i]);
                return c + (targetValue - c) * (1 - speed);
            });
        }

        function isColorsSimilar(colors1, colors2, threshold = 2) {
            return ['primary', 'secondary', 'darkest', 'mostColorful'].every(key => {
                return colors1[key].every((c, i) => Math.abs(c - colors2[key][i]) < threshold);
            });
        }

        requestAnimationFrame(updateColors);
    }

    function getSongId(song) {
        return `${song.metadata.title}|||${song.metadata.artist}|||${song.metadata.album || ''}`;
    }

    function highlightCurrentSong() {
        const currentSong = songs[currentSongIndex];
        if (!currentSong) return;
        
        const currentSongId = getSongId(currentSong);
        document.querySelectorAll('.playlist-item').forEach(item => {
            const songId = item.dataset.songId;
            item.classList.toggle('active', songId === currentSongId);
        });
    }

    function playAudio() {
        elements.audioPlayer.play()
            .then(() => {
                isPlaying = true;
                elements.playBtn.innerHTML = '<span class="material-symbols-rounded">pause</span>';
                updateDocumentTitle(songs[currentSongIndex]);
                
                // Update Media Session state
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'playing';
                }
            })
            .catch(error => {
                console.error('Error playing audio:', error);
            });
    }

    function pauseAudio() {
        elements.audioPlayer.pause();
        isPlaying = false;
        elements.playBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>';
        updateDocumentTitle(null);
        
        // Update Media Session state
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
        }
    }

    elements.playBtn.addEventListener('click', () => {
        if (isPlaying) pauseAudio();
        else playAudio();
    });

    elements.prevBtn.addEventListener('click', playPrevious);
    
    function playPrevious() {
        if (!songs.length) return;
        
        // If current song has played for more than 5 seconds, restart it
        if (elements.audioPlayer.currentTime > 5) {
            elements.audioPlayer.currentTime = 0;
            return;
        }
        
        // Otherwise, go to the previous song
        if (isShuffled) {
            const currentShuffledIndex = shuffledSongs.indexOf(songs[currentSongIndex]);
            if (currentShuffledIndex > 0) {
                const prevSong = shuffledSongs[currentShuffledIndex - 1];
                const prevIndex = songs.indexOf(prevSong);
                loadSong(prevIndex);
            } else if (loopState === 'all') {
                loadSong(songs.indexOf(shuffledSongs[shuffledSongs.length - 1]));
            }
        } else {
            if (currentSongIndex > 0) {
                loadSong(currentSongIndex - 1);
            } else if (loopState === 'all') {
                loadSong(songs.length - 1);
            }
        }
    }

    elements.nextBtn.addEventListener('click', playNext);

    function playNext() {
        if (!songs.length) return;
        
        if (queue.length > 0) {
            const nextSong = queue.shift();
            const nextIndex = songs.indexOf(nextSong);
            loadSong(nextIndex);
            updateQueueView();
        } else if (isShuffled) {
            const currentShuffledIndex = shuffledSongs.indexOf(songs[currentSongIndex]);
            if (currentShuffledIndex < shuffledSongs.length - 1) {
                const nextSong = shuffledSongs[currentShuffledIndex + 1];
                const nextIndex = songs.indexOf(nextSong);
                loadSong(nextIndex);
            } else if (loopState === 'all') {
                // Re-shuffle when we reach the end, keeping current song first
                const currentSong = songs[currentSongIndex];
                const remainingSongs = songs.filter(song => song !== currentSong);
                for (let i = remainingSongs.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
                }
                shuffledSongs = [currentSong, ...remainingSongs];
                loadSong(songs.indexOf(shuffledSongs[0]));
            }
        } else {
            // Normal sequential playback
            if (currentSongIndex < songs.length - 1) {
                loadSong(currentSongIndex + 1);
            } else if (loopState === 'all') {
                loadSong(0);
            }
        }
    }

    elements.shuffleBtn.addEventListener('click', () => {
        isShuffled = !isShuffled;
        elements.shuffleBtn.classList.toggle('active', isShuffled);
        const iconSpan = elements.shuffleBtn.querySelector('.material-symbols-rounded');
        if (iconSpan) {
            iconSpan.style.color = isShuffled ? '#1DB954' : '';
        }

        if (isShuffled) {
            // Create a new shuffled array, but keep the current song at its position
            const currentSong = songs[currentSongIndex];
            const remainingSongs = songs.filter((_, index) => index !== currentSongIndex);
            
            // Shuffle the remaining songs
            for (let i = remainingSongs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
            }
            
            // Put the current song back at the start of the shuffled list
            shuffledSongs = [currentSong, ...remainingSongs];
            console.log('Shuffled song order:', shuffledSongs.map(song => song.metadata.title));
        }
    });

    elements.loopBtn.addEventListener('click', () => {
        switch (loopState) {
            case 'none':
                loopState = 'single';
                elements.audioPlayer.loop = true;
                elements.loopBtn.innerHTML = '<span class="material-symbols-rounded">repeat_one</span>';
                elements.loopBtn.classList.add('active');
                elements.loopBtn.querySelector('.material-symbols-rounded').style.color = '#1DB954';
                break;
            case 'single':
                loopState = 'all';
                elements.audioPlayer.loop = false;
                elements.loopBtn.innerHTML = '<span class="material-symbols-rounded">repeat</span>';
                elements.loopBtn.classList.add('active');
                elements.loopBtn.querySelector('.material-symbols-rounded').style.color = '#1DB954';
                break;
            case 'all':
                loopState = 'none';
                elements.audioPlayer.loop = false;
                elements.loopBtn.innerHTML = '<span class="material-symbols-rounded">repeat</span>';
                elements.loopBtn.classList.remove('active');
                elements.loopBtn.querySelector('.material-symbols-rounded').style.color = '';
                break;
        }
    });

    elements.audioPlayer.addEventListener('timeupdate', () => {
        const progress = (elements.audioPlayer.currentTime / elements.audioPlayer.duration) * 100;
        elements.progressBar.value = progress;
        updateRangeProgress(elements.progressBar);
        elements.currentTimeSpan.textContent = formatTime(elements.audioPlayer.currentTime);
    });

    elements.audioPlayer.addEventListener('loadedmetadata', () => {
        elements.durationSpan.textContent = formatTime(elements.audioPlayer.duration);
    });

    elements.audioPlayer.addEventListener('ended', () => {
        if (loopState === 'all' || isShuffled) {
            playNext();
        } else if (loopState === 'none') {
            pauseAudio();
            
            // Update Media Session state
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'none';
            }
        }
    });
    
    // Update Media Session position state during playback
    elements.audioPlayer.addEventListener('timeupdate', () => {
        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
            navigator.mediaSession.setPositionState({
                duration: elements.audioPlayer.duration || 0,
                playbackRate: elements.audioPlayer.playbackRate,
                position: elements.audioPlayer.currentTime || 0
            });
        }
    });

    let isDragging = false;
    let fadeOutInterval, fadeInInterval;

    function fadeOutAudio() {
        clearInterval(fadeInInterval);
        fadeOutInterval = setInterval(() => {
            if (elements.audioPlayer.volume > 0.05) {
                elements.audioPlayer.volume = Math.max(0, elements.audioPlayer.volume - 0.1);
            } else {
                elements.audioPlayer.volume = 0;
                clearInterval(fadeOutInterval);
                elements.audioPlayer.pause();
            }
        }, 15);
    }

    function fadeInAudio() {
        clearInterval(fadeOutInterval);
        elements.audioPlayer.play();
        fadeInInterval = setInterval(() => {
            if (elements.audioPlayer.volume < 0.9) {
                elements.audioPlayer.volume = Math.min(1, elements.audioPlayer.volume + 0.1);
            } else {
                elements.audioPlayer.volume = 1;
                clearInterval(fadeInInterval);
            }
        }, 15);
    }

    elements.progressBar.addEventListener('input', (e) => {
        if (!isDragging) {
            isDragging = true;
            fadeOutAudio();
        }
        const time = (elements.audioPlayer.duration / 100) * e.target.value;
        elements.audioPlayer.currentTime = time;
    });

    elements.progressBar.addEventListener('change', () => {
        isDragging = false;
        fadeInAudio();
    });

    elements.volumeControl.addEventListener('input', (e) => {
        elements.audioPlayer.volume = e.target.value / 100;
    });

    elements.volumeControl.addEventListener('dblclick', () => {
        elements.volumeControl.value = 100;
        elements.audioPlayer.volume = 1;
    });

    function showExtendedOptions(event, song) {
        event.preventDefault();
        console.log('Extended options for:', song.metadata.title);
    }

    elements.progressBar.addEventListener('mousemove', (e) => {
        if (e.buttons === 1) {
            const rect = elements.progressBar.getBoundingClientRect();
            const percentage = (e.clientX - rect.left) / rect.width;
            elements.audioPlayer.currentTime = percentage * elements.audioPlayer.duration;
        }
    });

    elements.coverArt.addEventListener('click', () => {
        elements.coverArt.closest('.album-art-wrapper').classList.toggle('maximized');
    });

    function updateSongTitleScroll() {
        const titleElement = elements.currentSongTitle;
        if (titleElement.scrollWidth > titleElement.clientWidth) {
            titleElement.classList.add('scroll');
        } else {
            titleElement.classList.remove('scroll');
        }
    }

    elements.audioPlayer.addEventListener('loadedmetadata', updateSongTitleScroll);

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function initializeTheme() {
        const savedTheme = localStorage.getItem('buddy-music-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (elements.themeSelect) {
            elements.themeSelect.value = savedTheme;
        }
    }

    function changeTheme(themeName) {
        const root = document.documentElement;
        
        // Clear any inline styles set by adaptive theme
        if (root.getAttribute('data-theme') === 'adaptive') {
            // Clear all inline styles completely to ensure no adaptive theme styles remain
            const computedStyle = getComputedStyle(root);
            for (let i = 0; i < computedStyle.length; i++) {
                const property = computedStyle[i];
                if (property.startsWith('--')) {
                    root.style.removeProperty(property);
                }
            }
            
            // Explicitly clear known adaptive theme properties
            const adaptiveProperties = [
                '--bg-primary',
                '--bg-secondary',
                '--bg-tertiary',
                '--text-primary',
                '--text-secondary',
                '--accent-color',
                '--hover-color',
                '--text-tint',
                '--album-glow',
                '--button-text',
                '--button-bg',
                '--button-border',
                '--button-shadow',
                '--channel-gradient',
                '--highlight-shadow',
                '--button-highlight',
                '--player-text',
                '--player-text-secondary',
                '--scrollbar-bg',
                '--scrollbar-thumb',
                '--scrollbar-thumb-hover',
                '--button-active'
            ];
            
            adaptiveProperties.forEach(property => {
                root.style.removeProperty(property);
            });

            // Remove any transition properties
            root.style.removeProperty('transition');
            
            // Reset baseColors to default
            baseColors = {
                primary: [30, 30, 30],
                secondary: [45, 45, 45],
                darkest: [20, 20, 20],
                lightest: [255, 255, 255],
                mostColorful: [100, 100, 100]
            };
        }

        // Set new theme
        root.setAttribute('data-theme', themeName);
        localStorage.setItem('buddy-music-theme', themeName);
    }

    elements.themeSelect.addEventListener('change', (e) => {
        const newTheme = e.target.value;
        changeTheme(newTheme);
        
        if (newTheme === 'adaptive' && songs[currentSongIndex]?.metadata?.coverUrl) {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = async () => {
                const colors = await getImageColors(img);
                updateAdaptiveTheme(colors);
            };
            img.src = songs[currentSongIndex].metadata.coverUrl;
        }
    });

    initializeTheme();

    function savePlaylist() {
        const playlistData = {
            songs: songs.map(song => ({
                name: song.file.name,
                metadata: song.metadata
            }))
        };
        
        const blob = new Blob([JSON.stringify(playlistData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'playlist.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }

    async function loadPlaylist(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
        } catch (e) {
            console.error('Error loading playlist:', e);
        }
    }

    function sortPlaylist(criterion) {
        const sortedSongs = [...songs];
        
        sortedSongs.sort((a, b) => {
            switch(criterion) {
                case 'title':
                    return (a.metadata.title || '').localeCompare(b.metadata.title || '');
                case 'artist':
                    return (a.metadata.artist || '').localeCompare(b.metadata.artist || '');
                case 'album':
                    return (a.metadata.album || '').localeCompare(b.metadata.album || '');
                case 'duration':
                    if (!a.duration) a.duration = getDuration(a.file);
                    if (!b.duration) b.duration = getDuration(b.file);
                    return (a.duration || 0) - (b.duration || 0);
                default:
                    return 0;
            }
        });

        updatePlaylistView(sortedSongs);
    }

    function getDuration(file) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration);
            });
            audio.addEventListener('error', () => {
                resolve(0);
            });
            audio.src = URL.createObjectURL(file);
        });
    }

    elements.sortSelect.addEventListener('change', async (e) => {
        const criterion = e.target.value;
        if (criterion === 'duration') {
            for (let song of songs) {
                if (!song.duration) {
                    song.duration = await getDuration(song.file);
                }
            }
        }
        sortPlaylist(criterion);
    });

    let visibleSongs = [...songs];
    let tempSearchResults = [];

    class VirtualScroller {
        constructor(container, itemHeight, renderItem) {
            this.container = container;
            this.itemHeight = itemHeight;
            this.renderItem = renderItem;
            this.items = [];
            this.cachedItems = new Map();
            this.visibleItems = new Set();
            this.lastScrollTop = 0;
    
            this.container.style.position = 'relative';
            this.innerContainer = document.createElement('div');
            this.container.appendChild(this.innerContainer);
    
            this.container.addEventListener('scroll', this.onScroll.bind(this));
            this.resizeObserver = new ResizeObserver(() => this.render());
            this.resizeObserver.observe(this.container);
        }
    
        setItems(items) {
            this.items = items;
            this.innerContainer.style.height = `${items.length * this.itemHeight}px`;
            
            // Clear all cached items when the song list changes
            this.cachedItems.forEach(element => element.remove());
            this.cachedItems.clear();
            this.visibleItems.clear();
            
            this.render();
        }
    
        render() {
            const containerHeight = this.container.clientHeight;
            const scrollTop = this.container.scrollTop;
            const startIndex = Math.floor(scrollTop / this.itemHeight);
            const endIndex = Math.min(
                startIndex + Math.ceil(containerHeight / this.itemHeight) + 1,
                this.items.length
            );
    
            const newVisibleItems = new Set();
            for (let i = startIndex; i < endIndex; i++) {
                newVisibleItems.add(i);
            }
    
            // Remove items that are no longer visible
            for (const index of this.visibleItems) {
                if (!newVisibleItems.has(index)) {
                    const element = this.cachedItems.get(index);
                    if (element) {
                        element.remove();
                        this.cachedItems.delete(index);
                    }
                }
            }
    
            // Add new visible items
            for (const index of newVisibleItems) {
                if (!this.visibleItems.has(index)) {
                    const item = this.items[index];
                    const element = this.renderItem(item, index);
                    element.style.position = 'absolute';
                    element.style.top = `${index * this.itemHeight}px`;
                    element.style.width = '100%';
                    this.innerContainer.appendChild(element);
                    this.cachedItems.set(index, element);
                }
            }
    
            this.visibleItems = newVisibleItems;
        }
    
        onScroll() {
            window.requestAnimationFrame(() => this.render());
        }
    
        cleanup() {
            this.resizeObserver.disconnect();
            this.cachedItems.clear();
            this.visibleItems.clear();
        }
    }
    
    // Modify updatePlaylistView to use VirtualScroller
    let playlistScroller;
    
    function updatePlaylistView(songList) {
        if (!playlistScroller) {
            playlistScroller = new VirtualScroller(
                elements.playlist,
                40, // height of each playlist item
                (song, index) => createPlaylistItem(song, index, loadSong)
            );
        }
        playlistScroller.setItems(songList);
    }

    // Add debouncing for search to improve performance
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterPlaylist(e.target.value || '');
        }, 300); // 300ms delay for better performance
    });
    
    // Initialize fuzzy search
    const fuzzySearcher = new FuzzySearch();

    function generateArtistAbbreviations(artistName) {
        const words = artistName.toLowerCase().split(' ');
        const abbreviations = new Set();
        
        abbreviations.add(words.map(w => w[0]).join(''));
        
        const numberWords = {
            'to': '2',
            'too': '2',
            'two': '2',
            'for': '4',
            'four': '4',
            'ate': '8',
            'eight': '8'
        };
        
        const variations = words.map(word => numberWords[word] || word[0]);
        abbreviations.add(variations.join(''));
        
        const withoutAnd = words.filter(w => w !== 'and' && w !== '&');
        abbreviations.add(withoutAnd.map(w => w[0]).join(''));
        
        return abbreviations;
    }

    function filterPlaylist(searchTerm) {
        if (!searchTerm) {
            updatePlaylistView(songs);
            hideAddAllToQueue();
            tempSearchResults = [];
            return;
        }

        const searchLower = searchTerm.toLowerCase().trim();
        let filtered = [];

        window.currentSearch = {
            term: searchLower,
            type: 'regular'
        };

        // Check for field-specific search with format field:term
        const fieldSearch = searchLower.match(/^(title|artist|album|genre|year):(.+)$/);
        if (fieldSearch) {
            const [, field, term] = fieldSearch;
            window.currentSearch.type = 'field';
            window.currentSearch.field = field;
            
            // Use fuzzy search but only on the specific field
            filtered = songs.filter(song => {
                const fieldValue = song.metadata[field]?.toString().toLowerCase() || '';
                return fuzzySearcher.stringSimilarity(fieldValue, term) >= fuzzySearcher.threshold;
            });
        }
        // Check for decade search (e.g., "90's" or "90s")
        else if (searchLower.match(/(\d{2})'?s?/)) {
            const decadeMatch = searchLower.match(/(\d{2})'?s?/);
            const decade = decadeMatch[1];
            const yearPrefix = decade === '00' ? '20' : '19';
            const startYear = yearPrefix + decade;
            const endYear = parseInt(startYear) + 10;
            
            window.currentSearch.type = 'decade';
            window.currentSearch.startYear = parseInt(startYear);
            window.currentSearch.endYear = parseInt(endYear);
            
            filtered = songs.filter(song => {
                const songYear = parseInt(song.metadata.year);
                return songYear >= window.currentSearch.startYear && songYear < window.currentSearch.endYear;
            });
        }
        // Check for favorites search
        else if (searchLower === 'fav' || searchLower === 'favorite' || searchLower === 'favorites') {
            window.currentSearch.type = 'favorites';
            filtered = songs.filter(song => isFavorite(song.metadata));
        }
        // Check for exact match with quotes (e.g., "exact phrase")
        else if (searchLower.startsWith('"') && searchLower.endsWith('"')) {
            const exactTerm = searchLower.slice(1, -1);
            window.currentSearch.type = 'exact';
            
            filtered = songs.filter(song => {
                const searchable = `
                    ${song.metadata.title} 
                    ${song.metadata.artist} 
                    ${song.metadata.album}
                    ${song.metadata.year}
                    ${song.metadata.genre}
                `.toLowerCase();
                
                return searchable.includes(exactTerm);
            });
        }
        // Default case: use fuzzy search if enabled, otherwise use basic search
        else {
            if (fuzzySearcher.enabled) {
                window.currentSearch.type = 'fuzzy';
                filtered = fuzzySearcher.search(songs, searchLower, generateArtistAbbreviations);
            } else {
                window.currentSearch.type = 'basic';
                filtered = songs.filter(song => {
                    const searchable = `
                        ${song.metadata.title} 
                        ${song.metadata.artist} 
                        ${song.metadata.album}
                        ${song.metadata.year}
                        ${song.metadata.genre}
                    `.toLowerCase();
                    return searchable.includes(searchLower);
                });
            }
        }

        tempSearchResults = filtered;
        updatePlaylistView(filtered);
        
        if (filtered.length > 0) {
            showAddAllToQueue(filtered);
        } else {
            hideAddAllToQueue();
        }
    }

    function showAddAllToQueue(filteredSongs) {
        let actionsContainer = document.querySelector('.queue-actions');
        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.className = 'queue-actions';
            elements.playlist.parentNode.appendChild(actionsContainer);
        }
        
        // Update the burger menu to include "Add all to playlist"
        actionsContainer.innerHTML = `
            <button class="queue-action-btn queue-all">
                <span class="material-symbols-rounded">queue_music</span>
                Add all to queue (${filteredSongs.length})
            </button>
            <div class="burger-container">
                <button class="queue-action-btn burger-menu">
                    <span class="material-symbols-rounded">more_vert</span>
                </button>
                <div class="burger-dropdown">
                    <button class="favorite-all">
                        <span class="material-symbols-rounded">favorite</span>
                        Favorite all
                    </button>
                    <button class="save-all">
                        <span class="material-symbols-rounded">save</span>
                        Save locally
                    </button>
                    <button class="delete-action delete-all">
                        <span class="material-symbols-rounded">delete</span>
                        Delete all
                    </button>
                </div>
            </div>
        `;

        // Add handlers for the existing buttons
        actionsContainer.querySelector('.queue-all').addEventListener('click', async () => {
            const songsToAdd = tempSearchResults.filter(song => !queue.includes(song));
            if (songsToAdd.length > 0) {
                queue.push(...songsToAdd);
                updateQueueView();
                switchTab('queue');
                showFeedback(actionsContainer.querySelector('.queue-all'), 'Added to queue!');
            }
        });

        // Setup burger menu
        const burgerMenu = actionsContainer.querySelector('.burger-menu');
        const burgerDropdown = actionsContainer.querySelector('.burger-dropdown');
        
        burgerMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            burgerDropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!burgerMenu.contains(e.target)) {
                burgerDropdown.classList.remove('active');
            }
        });

        // Add favorite all handler
        burgerDropdown.querySelector('.favorite-all').addEventListener('click', async () => {
            let count = 0;
            for (const song of tempSearchResults) {
                const key = `${song.metadata.title}|||${song.metadata.artist}`;
                if (!favorites.has(key)) {
                    favorites.add(key);
                    await favoritesDB.saveSong(song);
                    count++;
                }
            }
            saveFavorites();
            showFeedback(burgerMenu, `${count} songs favorited!`);
            burgerDropdown.classList.remove('active');
            updatePlaylistView(songs);
        });

        // Add save all handler
        burgerDropdown.querySelector('.save-all').addEventListener('click', async () => {
            let count = 0;
            for (const song of tempSearchResults) {
                const isSaved = await checkIfSongIsSaved(song);
                if (!isSaved) {
                    await songsDB.saveSong(song);
                    count++;
                }
            }
            showFeedback(burgerMenu, `${count} songs saved!`);
            burgerDropdown.classList.remove('active');
        });

        // Add delete all handler
        burgerDropdown.querySelector('.delete-all').addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete ${filteredSongs.length} songs?`)) {
                for (const song of tempSearchResults) {
                    const songId = `${song.metadata.title}|||${song.metadata.artist}`;
                    await Promise.all([
                        songsDB.deleteSong(songId),
                        favoritesDB.deleteSong(songId)
                    ]);
                    favorites.delete(songId);
                    const songIndex = songs.indexOf(song);
                    if (songIndex > -1) {
                        songs.splice(songIndex, 1);
                    }
                }
                updatePlaylistView(songs);
                showFeedback(burgerMenu, 'Songs deleted!');
                burgerDropdown.classList.remove('active');
            }
        });
        
        actionsContainer.style.display = 'flex';
    }

    function hideAddAllToQueue() {
        const actionsContainer = document.querySelector('.queue-actions');
        if (actionsContainer) {
            actionsContainer.style.display = 'none';
        }
    }

    function showFeedback(button, message) {
        const originalText = button.innerHTML;
        button.innerHTML = `<span class="material-symbols-rounded">check</span>${message}`;
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    }

    function songMatchesCurrentSearch(song) {
        if (!window.currentSearch?.term) return false;

        switch (window.currentSearch.type) {
            case 'decade':
                const songYear = parseInt(song.metadata.year);
                return songYear >= window.currentSearch.startYear && songYear < window.currentSearch.endYear;
            
            case 'favorites':
                return isFavorite(song.metadata);
            
            case 'regular':
                const searchable = `
                    ${song.metadata.title} 
                    ${song.metadata.artist} 
                    ${song.metadata.album}
                    ${song.metadata.year}
                    ${song.metadata.genre}
                `.toLowerCase();
                return searchable.includes(window.currentSearch.term);
            
            default:
                return false;
        }
    }

    function addToQueue(songIndex) {
        const song = songs[songIndex];
        if (songMatchesCurrentSearch(song) && !queue.includes(song)) {
            queue.push(song);
            updateQueueView();
        }
    }

    function addToRecentlyPlayed(song) {
        recentlyPlayed = [song, ...recentlyPlayed.slice(0, 19)];
        updateRecentlyPlayedView();
    }

    elements.sortSelect.addEventListener('change', (e) => {
        sortPlaylist(e.target.value);
    });

    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchTab(tab);
        });
    });

    function switchTab(tab) {
        currentPlaylist = tab;
        elements.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        elements.playlist.style.display = tab === 'main' ? 'block' : 'none';
        elements.queueList.style.display = tab === 'queue' ? 'block' : 'none';
        elements.recentList.style.display = tab === 'recent' ? 'block' : 'none';
    }

    loadSong = function(index) {
        const song = songs[index];
        if (song) {
            addToRecentlyPlayed(song);
            originalLoadSong(index);
        }
    };

    function updateQueueView() {
        elements.queueList.innerHTML = '';
        queue.forEach((song, index) => {
            const div = createPlaylistItem(
                song,
                index,
                (idx) => {
                    // Remove all songs before the clicked song in the queue
                    const clickedSong = queue[idx];
                    // Remove songs before the clicked one
                    queue = queue.slice(idx);
                    // Update the queue view to reflect the changes
                    updateQueueView();
                    // Find the song in the main songs array to play it
                    const songIndex = songs.findIndex(s => 
                        s.metadata.title === clickedSong.metadata.title && 
                        s.metadata.artist === clickedSong.metadata.artist
                    );
                    if (songIndex !== -1) {
                        currentSongIndex = songIndex;
                        loadSong(songIndex);
                    }
                }
            );
            elements.queueList.appendChild(div);
        });
    }

    function updateRecentlyPlayedView() {
        elements.recentList.innerHTML = '';
        recentlyPlayed.forEach((song, index) => {
            const div = createPlaylistItem(
                song,
                index,
                () => addToQueue(songs.findIndex(s => s.file === song.file))
            );
            elements.recentList.appendChild(div);
        });
    }

    function updatePlaylistView(songList) {
        const fragment = document.createDocumentFragment();
        songList.forEach((song, index) => {
            const div = createPlaylistItem(
                song,
                songs.indexOf(song),
                loadSong
            );
            if (songs[currentSongIndex] === song) {
                div.classList.add('active');
            }
            fragment.appendChild(div);
        });

        requestAnimationFrame(() => {
            elements.playlist.innerHTML = '';
            elements.playlist.appendChild(fragment);
            
            // Dispatch the custom event to notify that songs are loaded and displayed
            if (window.songLoadedEvent && window.songs && window.songs.length > 0) {
                console.log('Dispatching songsLoadedAndDisplayed event from updatePlaylistView');
                document.dispatchEvent(window.songLoadedEvent);
            }
        });
    }

    function initializeSettings() {
        const settings = getSettings();
        applySettings(settings);

        elements.fontSizeSelect.value = settings.fontSize;
        elements.fontFamilySelect.value = settings.fontFamily;
        elements.reduceAnimationsToggle.checked = settings.reduceAnimations;
        elements.useFuzzySearchToggle.checked = settings.useFuzzySearch;
        elements.autoSaveSelect.value = settings.autoSave;
        
        // Initialize EQ settings
        eqEnabled = settings.eqEnabled;
        elements.eqEnabled.checked = settings.eqEnabled;
        elements.eqControls.style.display = settings.eqEnabled ? 'block' : 'none';
        elements.eqBass.value = settings.eqBass;
        elements.eqMid.value = settings.eqMid;
        elements.eqTreble.value = settings.eqTreble;
        elements.eqPreset.value = settings.eqPreset;
        elements.eqBassValue.textContent = `${settings.eqBass} dB`;
        elements.eqMidValue.textContent = `${settings.eqMid} dB`;
        elements.eqTrebleValue.textContent = `${settings.eqTreble} dB`;
    }

    function applySettings(settings) {
        document.documentElement.setAttribute('data-font-size', settings.fontSize);
        document.documentElement.setAttribute('data-font', settings.fontFamily);
        document.documentElement.setAttribute('data-reduce-animations', settings.reduceAnimations);

        // If reduce animations is enabled, stop any ongoing animations
        if (settings.reduceAnimations) {
            document.querySelectorAll('.scroll').forEach(el => {
                el.classList.remove('scroll');
            });
        }
        
        // Apply fuzzy search setting
        document.documentElement.setAttribute('data-fuzzy-search', settings.useFuzzySearch);
        
        // Update fuzzy searcher threshold if needed
        if (fuzzySearcher) {
            fuzzySearcher.enabled = settings.useFuzzySearch;
        }
        
        // Apply EQ settings if audio context exists
        if (audioContext && eqFilters.bass) {
            updateEQFilter('bass', settings.eqBass);
            updateEQFilter('mid', settings.eqMid);
            updateEQFilter('treble', settings.eqTreble);
        }
    }

    function saveSettings() {
        const settings = {
            fontSize: elements.fontSizeSelect.value,
            fontFamily: elements.fontFamilySelect.value,
            reduceAnimations: elements.reduceAnimationsToggle.checked,
            useFuzzySearch: elements.useFuzzySearchToggle.checked,
            autoSave: elements.autoSaveSelect.value,
            eqEnabled: elements.eqEnabled.checked,
            eqBass: parseFloat(elements.eqBass.value),
            eqMid: parseFloat(elements.eqMid.value),
            eqTreble: parseFloat(elements.eqTreble.value),
            eqPreset: elements.eqPreset.value
        };
        localStorage.setItem('buddy-music-settings', JSON.stringify(settings));
        applySettings(settings);
    }

    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsPanel.classList.add('active');
    });

    elements.closeSettingsBtn.addEventListener('click', () => {
        elements.settingsPanel.classList.remove('active');
    });

    [
        'fontSizeSelect',
        'fontFamilySelect',
        'reduceAnimationsToggle',
        'useFuzzySearchToggle',
        'autoSaveSelect'
    ].forEach(settingId => {
        elements[settingId].addEventListener('change', saveSettings);
    });
    
    // EQ Event Listeners
    elements.eqEnabled.addEventListener('change', (e) => {
        eqEnabled = e.target.checked;
        elements.eqControls.style.display = eqEnabled ? 'block' : 'none';
        
        // Reconnect audio chain
        if (sourceNode && audioContext) {
            sourceNode.disconnect();
            if (eqFilters.bass) eqFilters.bass.disconnect();
            if (eqFilters.mid) eqFilters.mid.disconnect();
            if (eqFilters.treble) eqFilters.treble.disconnect();
            if (analyser) analyser.disconnect();
            
            connectAudioChain();
        }
        
        saveSettings();
    });
    
    elements.eqBass.addEventListener('input', (e) => {
        const value = e.target.value;
        elements.eqBassValue.textContent = `${value} dB`;
        updateEQFilter('bass', value);
        saveSettings();
    });
    
    elements.eqMid.addEventListener('input', (e) => {
        const value = e.target.value;
        elements.eqMidValue.textContent = `${value} dB`;
        updateEQFilter('mid', value);
        saveSettings();
    });
    
    elements.eqTreble.addEventListener('input', (e) => {
        const value = e.target.value;
        elements.eqTrebleValue.textContent = `${value} dB`;
        updateEQFilter('treble', value);
        saveSettings();
    });
    
    elements.eqPreset.addEventListener('change', (e) => {
        applyEQPreset(e.target.value);
        saveSettings();
    });

    initializeSettings();

    elements.folderInput.addEventListener('change', async (e) => {
        const allFiles = Array.from(e.target.files);
        
        // Filter audio files first
        const audioFiles = allFiles.filter(file => 
            file.type.startsWith('audio/') || 
            file.name.endsWith('.mp3') || 
            file.name.endsWith('.wav') ||
            file.name.endsWith('.ogg') ||
            file.name.endsWith('.m4a')
        );
        
        if (audioFiles.length === 0) {
            alert('No audio files found in the selected folders');
            return;
        }

        // Show loading screen for large folder imports
        if (audioFiles.length > 10 && window.loadingScreen) {
            window.loadingScreen.updateProgress(0, audioFiles.length);
            document.getElementById('loading-screen').classList.remove('hidden');
            document.getElementById('app-container').classList.remove('visible');
            document.getElementById('loading-status').textContent = 'Loading folder...';
        } else {
            // For smaller imports, use the in-app progress indicator
            const progress = document.createElement('div');
            progress.className = 'folder-progress';
            progress.innerHTML = `
                <div class="progress-text">Processing files: 0/${audioFiles.length}</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            `;
            
            const sidebar = document.querySelector('.sidebar');
            const playlist = document.getElementById('playlist');
            sidebar.insertBefore(progress, playlist);
        }

        const startIndex = songs.length;
        let processedFiles = 0;

        try {
            await updatePlaylist(audioFiles, (count) => {
                processedFiles += count;
                const percent = Math.min(100, (processedFiles / audioFiles.length) * 100);
                
                // Update loading screen for large imports
                if (audioFiles.length > 10 && window.loadingScreen) {
                    window.loadingScreen.updateProgress(processedFiles, audioFiles.length);
                } else {
                    // Update in-app progress indicator for smaller imports
                    const progressFill = document.querySelector('.folder-progress .progress-fill');
                    const progressText = document.querySelector('.folder-progress .progress-text');
                    
                    if (progressFill && progressText) {
                        requestAnimationFrame(() => {
                            progressFill.style.width = `${percent}%`;
                            progressText.textContent = `Processing files: ${processedFiles}/${audioFiles.length}`;
                        });
                    }
                }
            });

            if (startIndex === 0 && songs.length > 0) {
                loadSong(0);
            }
        } catch (error) {
            console.error('Error processing files:', error);
        }

        // Hide loading screen if it was shown
        if (audioFiles.length > 10 && window.loadingScreen) {
            window.loadingScreen.hideLoadingScreen();
        } else {
            // Fade out and remove in-app progress indicator
            const progress = document.querySelector('.folder-progress');
            if (progress) {
                await new Promise(resolve => setTimeout(resolve, 500));
                progress.style.opacity = '0';
                progress.style.transition = 'opacity 0.5s ease';
                await new Promise(resolve => setTimeout(resolve, 500));
                progress.remove();
            }
        }
        
        elements.folderInput.value = '';
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (isPlaying) pauseAudio();
                else playAudio();
                break;

            case 'KeyM':
                e.preventDefault();
                elements.audioPlayer.muted = !elements.audioPlayer.muted;
                break;

            case 'ArrowLeft':
                e.preventDefault();
                if (elements.audioPlayer.currentTime >= 10) {
                    elements.audioPlayer.currentTime -= 10;
                } else {
                    elements.audioPlayer.currentTime = 0;
                }
                break;

            case 'ArrowRight':
                e.preventDefault();
                if (elements.audioPlayer.currentTime <= elements.audioPlayer.duration - 10) {
                    elements.audioPlayer.currentTime += 10;
                } else {
                    elements.audioPlayer.currentTime = elements.audioPlayer.duration;
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                const newVolUp = Math.min(1, elements.audioPlayer.volume + 0.1);
                elements.audioPlayer.volume = newVolUp;
                elements.volumeControl.value = newVolUp * 100;
                break;

            case 'ArrowDown':
                e.preventDefault();
                const newVolDown = Math.max(0, elements.audioPlayer.volume - 0.1);
                elements.audioPlayer.volume = newVolDown;
                elements.volumeControl.value = newVolDown * 100;
                break;

            case 'KeyN':
                e.preventDefault();
                playNext();
                break;

            case 'KeyP':
                e.preventDefault();
                playPrevious();
                break;

            case 'KeyL':
                e.preventDefault();
                elements.loopBtn.click();
                break;

            case 'KeyS':
                e.preventDefault();
                elements.shuffleBtn.click();
                break;
        }
    });

    elements.audioPlayer.loop = false;
    elements.loopBtn.innerHTML = '<span class="material-symbols-rounded">repeat</span>';
    elements.loopBtn.style.color = '#1db954';

    // Load songs from databases with loading screen progress updates
    let totalSongsToLoad = 0;
    let songsLoaded = 0;
    
    try {
        // Get counts for progress calculation
        const favoritesCount = (await favoritesDB.getAllSongs()).length;
        const songsDBCount = (await songsDB.getAllSongs()).length;
        totalSongsToLoad = favoritesCount + songsDBCount || 1; // Prevent division by zero
        
        // Update loading screen with initial count
        if (window.loadingScreen) {
            window.loadingScreen.updateProgress(0, totalSongsToLoad);
        }
        
        // Load favorites
        const savedSongs = await favoritesDB.getAllSongs();
        savedSongs.forEach((songData, index) => {
            const key = songData.id;
            favorites.add(key);
            
            const file = new File([songData.file], `${songData.metadata.title}.mp3`, {
                type: 'audio/mpeg'
            });
            
            const exists = songs.some(s => 
                s.metadata.title === songData.metadata.title && 
                s.metadata.artist === songData.metadata.artist
            );
            
            if (!exists) {
                songs.push({
                    file: file,
                    metadata: songData.metadata
                });
            }
            
            // Update loading progress
            songsLoaded++;
            if (window.loadingScreen) {
                window.loadingScreen.updateProgress(songsLoaded, totalSongsToLoad);
            }
        });

        // Load songs from database
        const savedSongsFromDB = await songsDB.getAllSongs();
        savedSongsFromDB.forEach((songData, index) => {
            const file = new File([songData.file], `${songData.metadata.title}.mp3`, {
                type: 'audio/mpeg'
            });
            
            const exists = songs.some(s => 
                s.metadata.title === songData.metadata.title && 
                s.metadata.artist === songData.metadata.artist
            );
            
            if (!exists) {
                songs.push({
                    file: file,
                    metadata: songData.metadata
                });
            }
            
            // Update loading progress
            songsLoaded++;
            if (window.loadingScreen) {
                window.loadingScreen.updateProgress(songsLoaded, totalSongsToLoad);
            }
        });
        
        // If no songs were loaded, hide loading screen
        if (totalSongsToLoad === 0 && window.loadingScreen) {
            window.loadingScreen.hideLoadingScreen();
        }
    } catch (error) {
        console.error('Error loading songs:', error);
        // Hide loading screen in case of error
        if (window.loadingScreen) {
            window.loadingScreen.hideLoadingScreen();
        }
    }

    updatePlaylistView(songs);

    elements.clearDatabaseBtn?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear the local database? This will remove all stored songs.')) {
            try {
                const originalText = elements.clearDatabaseBtn.textContent;
                elements.clearDatabaseBtn.textContent = 'Clearing...';
                elements.clearDatabaseBtn.disabled = true;

                await Promise.all([
                    songsDB.clearDatabase(),
                    favoritesDB.clearDatabase()
                ]);

                // Clear SongManager buffers
                if (window.songManager) {
                    window.songManager.clearAllBuffers();
                    console.log('Song manager buffers cleared');
                }
                
                songs = [];
                favorites = new Set();
                visibleSongs = [];
                queue = [];
                recentlyPlayed = [];
                
                updatePlaylistView([]);
                updateQueueView();
                updateRecentlyPlayedView();

                elements.clearDatabaseBtn.textContent = originalText;
                elements.clearDatabaseBtn.disabled = false;

                alert('Database cleared successfully');
            } catch (error) {
                console.error('Failed to clear database:', error);
                alert('Failed to clear database: ' + error.message);
                
                elements.clearDatabaseBtn.textContent = originalText;
                elements.clearDatabaseBtn.disabled = false;
            }
        }
    });

    async function clearEverything() {
        if (confirm('Are you sure you want to delete ALL data? This includes songs, favorites, and all settings. This cannot be undone.')) {
            try {
                const originalText = elements.clearEverythingBtn.textContent;
                elements.clearEverythingBtn.textContent = 'Deleting...';
                elements.clearEverythingBtn.disabled = true;

                await Promise.all([
                    songsDB.clearDatabase(),
                    favoritesDB.clearDatabase()
                ]);

                localStorage.clear();

                songs = [];
                favorites = new Set();
                visibleSongs = [];
                queue = [];
                recentlyPlayed = [];
                
                updatePlaylistView([]);
                updateQueueView();
                updateRecentlyPlayedView();

                initializeSettings();
                initializeTheme();

                elements.clearEverythingBtn.textContent = originalText;
                elements.clearEverythingBtn.disabled = false;

                alert('All data has been deleted successfully');
                
                window.location.reload();
            } catch (error) {
                console.error('Failed to clear all data:', error);
                alert('Failed to clear all data: ' + error.message);
                
                elements.clearEverythingBtn.textContent = originalText;
                elements.clearEverythingBtn.disabled = false;
            }
        }
    }

    elements.clearEverythingBtn?.addEventListener('click', clearEverything);

    function cleanup() {
        try {
            // Only cleanup if resources exist
            if (typeof audioResourceManager !== 'undefined') {
                audioResourceManager.clearOldBuffers();
                audioResourceManager.audioBuffers.clear();
            }

            if (typeof audioContext !== 'undefined' && audioContext?.state !== 'closed') {
                audioContext.close().catch(console.warn);
            }

            if (elements?.audioPlayer) {
                elements.audioPlayer.pause();
                if (elements.audioPlayer.src) {
                    URL.revokeObjectURL(elements.audioPlayer.src);
                    elements.audioPlayer.src = '';
                    elements.audioPlayer.load();
                }
            }

            if (elements?.coverArt?.src?.startsWith('blob:')) {
                URL.revokeObjectURL(elements.coverArt.src);
            }

            if (playlistScroller) {
                playlistScroller.cleanup();
            }

            // Save app state
            saveFavorites();
            saveSettings();
        } catch (error) {
            console.warn('Cleanup error:', error);
        }
    }

    window.addEventListener('pagehide', cleanup);
    window.addEventListener('beforeunload', cleanup);

    function updateRangeProgress(rangeInput) {
        const value = rangeInput.value;
        const max = rangeInput.max;
        const percentage = (value / max) * 100;
        rangeInput.style.setProperty('--range-progress', `${percentage}%`);
    }

    // Add input event listeners for both range inputs
    elements.progressBar.addEventListener('input', () => {
        updateRangeProgress(elements.progressBar);
    });

    elements.volumeControl.addEventListener('input', () => {
        updateRangeProgress(elements.volumeControl);
    });

    // Initialize progress for volume control
    updateRangeProgress(elements.volumeControl);

    // Update progress bar in the timeupdate event
    elements.audioPlayer.addEventListener('timeupdate', () => {
        const progress = (elements.audioPlayer.currentTime / elements.audioPlayer.duration) * 100;
        elements.progressBar.value = progress;
        updateRangeProgress(elements.progressBar);
        elements.currentTimeSpan.textContent = formatTime(elements.audioPlayer.currentTime);
    });

    // Smart Command Search implementation
    let smartCommandTimeout;
    let isSmartCommandActive = false;
    let smartCommandBox = null;
    
    function createSmartCommandBox() {
        if (smartCommandBox) return;
        
        smartCommandBox = document.createElement('div');
        smartCommandBox.className = 'smart-command-box';
        smartCommandBox.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            max-width: 800px;
            background: var(--bg-primary);
            border: 1px solid var(--text-secondary);
            border-radius: 12px;
            padding: 20px;
            z-index: 9999;
            display: none;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        `;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Type a command (e.g., "Play Dreamer" or "Queue Lady Gaga")';
        input.style.cssText = `
            width: 100%;
            padding: 16px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: none;
            border-radius: 8px;
            font-size: 18px;
        `;
        
        smartCommandBox.appendChild(input);
        document.body.appendChild(smartCommandBox);
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                processSmartCommand(input.value);
                hideSmartCommandBox();
            } else if (e.key === 'Escape') {
                hideSmartCommandBox();
            }
        });
    }
    
    function showSmartCommandBox() {
        if (!smartCommandBox) createSmartCommandBox();
        smartCommandBox.style.display = 'block';
        const input = smartCommandBox.querySelector('input');
        input.value = '';
        input.focus();
        isSmartCommandActive = true;
    }
    
    function hideSmartCommandBox() {
        if (smartCommandBox) {
            smartCommandBox.style.display = 'none';
            isSmartCommandActive = false;
        }
    }
    
    function findBestSongMatch(searchTitle, searchArtist = null) {
        let bestMatch = null;
        let bestScore = 0;

        for (const song of songs) {
            // Calculate similarity for title
            const titleSimilarity = calculateSimilarity(song.metadata.title.toLowerCase(), searchTitle.toLowerCase());
            
            // If artist is provided, include it in scoring
            let score = titleSimilarity;
            if (searchArtist) {
                const artistSimilarity = calculateSimilarity(song.metadata.artist.toLowerCase(), searchArtist.toLowerCase());
                score = (titleSimilarity * 0.7) + (artistSimilarity * 0.3); // Weight title more heavily
            }

            if (score > bestScore && score > 0.4) { // Threshold for minimum match quality
                bestScore = score;
                bestMatch = song;
            }
        }

        return bestMatch;
    }

    function calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.includes(str2) || str2.includes(str1)) return 0.9;

        // Calculate Levenshtein distance
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],     // deletion
                        dp[i][j - 1],     // insertion
                        dp[i - 1][j - 1]  // substitution
                    );
                }
            }
        }

        return 1 - (dp[m][n] / Math.max(m, n));
    }

    function processSmartCommand(command) {
        const cmd = command.toLowerCase().trim();
        let commandProcessed = false;
        
        // Helper function to display feedback in hackin theme
        const showCommandFeedback = (message) => {
            if (document.documentElement.getAttribute('data-theme') === "hackin'") {
                if (window.hackinEffect) {
                    window.hackinEffect.addCustomText(`> ${message}`, false);
                }
            }
        };
        
        // Play specific song with optional artist - enhanced with better matching
        const playMatch = cmd.match(/^(?:play|start)\s+(.+?)(?:\s+by\s+(.+))?$/i);
        if (playMatch) {
            const [_, title, artist] = playMatch;
            const song = findBestSongMatch(title, artist);
            if (song) {
                const index = songs.indexOf(song);
                loadSong(index);
                showCommandFeedback(`Playing "${song.metadata.title}" by ${song.metadata.artist}`);
            } else {
                showCommandFeedback(`Song not found: "${title}"${artist ? ` by ${artist}` : ''}`);
            }
            return;
        }
        
        // Queue all songs by artist - enhanced with more flexible syntax
        const queueArtistMatch = cmd.match(/^(?:queue|add|play all|q|enqueue)\s+(?:songs?\s+(?:by|from|of)\s+)?(.+)$/i);
        if (queueArtistMatch) {
            const artist = queueArtistMatch[1];
            const artistSongs = songs.filter(s => {
                const similarity = calculateSimilarity(s.metadata.artist.toLowerCase(), artist.toLowerCase());
                return similarity > 0.6; // Threshold for artist matching
            });
            if (artistSongs.length > 0) {
                queue.push(...artistSongs);
                updateQueueView();
                switchTab('queue');
                showCommandFeedback(`Added ${artistSongs.length} songs by ${artist} to queue`);
            } else {
                showCommandFeedback(`No songs found by artist: ${artist}`);
            }
            return;
        }
        
        // Create playlist from current queue
        const createPlaylistMatch = cmd.match(/^(?:create|save|make)\s+(?:a\s+)?playlist\s+(?:called|named)?\s+(.+)$/i);
        if (createPlaylistMatch) {
            const playlistName = createPlaylistMatch[1];
            if (queue.length > 0) {
                // Save playlist logic would go here
                // For now, just acknowledge the command
                showCommandFeedback(`Created playlist "${playlistName}" with ${queue.length} songs`);
            } else {
                showCommandFeedback(`Cannot create empty playlist. Add songs to queue first.`);
            }
            return;
        }
        
        // Switch theme - enhanced with more natural language
        const themeMatch = cmd.match(/^(?:switch\s+to\s+|use\s+|theme\s+|change\s+(?:to\s+)?theme\s+(?:to\s+)?)(.+)$/i);
        if (themeMatch) {
            const themeInput = themeMatch[1].toLowerCase();
            // Find closest matching theme
            const themes = Array.from(elements.themeSelect.options).map(opt => opt.value);
            let bestMatch = null;
            let highestSimilarity = 0;
            
            themes.forEach(theme => {
                const similarity = calculateSimilarity(theme.toLowerCase(), themeInput);
                if (similarity > highestSimilarity && similarity > 0.6) {
                    highestSimilarity = similarity;
                    bestMatch = theme;
                }
            });
            
            if (bestMatch) {
                elements.themeSelect.value = bestMatch;
                changeTheme(bestMatch);
                showCommandFeedback(`Theme changed to ${bestMatch}`);
            } else {
                showCommandFeedback(`Theme not found: ${themeInput}`);
            }
            return;
        }

        // Volume control - enhanced with more natural language
        const volumeMatch = cmd.match(/^(?:set\s+)?(?:volume|vol)(?:\s+to)?\s+(\d+)(?:\s*%)?$/i) || 
                           cmd.match(/^(?:set\s+)?(?:volume|vol)(?:\s+to)?\s+((?:max|maximum|full|highest))$/i) ||
                           cmd.match(/^(?:set\s+)?(?:volume|vol)(?:\s+to)?\s+((?:min|minimum|lowest|zero|mute))$/i) ||
                           cmd.match(/^(?:set\s+)?(?:volume|vol)(?:\s+to)?\s+((?:half|mid|middle))$/i);
        if (volumeMatch) {
            let volume;
            const volumeInput = volumeMatch[1].toLowerCase();
            
            if (/^\d+$/.test(volumeInput)) {
                volume = Math.min(100, Math.max(0, parseInt(volumeInput)));
            } else if (['max', 'maximum', 'full', 'highest'].includes(volumeInput)) {
                volume = 100;
            } else if (['min', 'minimum', 'lowest', 'zero', 'mute'].includes(volumeInput)) {
                volume = 0;
            } else if (['half', 'mid', 'middle'].includes(volumeInput)) {
                volume = 50;
            }
            
            elements.volumeControl.value = volume;
            elements.audioPlayer.volume = volume / 100;
            updateRangeProgress(elements.volumeControl);
            showCommandFeedback(`Volume set to ${volume}%`);
            return;
        }

        // Toggle shuffle - enhanced with explicit on/off
        const shuffleMatch = cmd.match(/^(?:shuffle|random)(?:\s+(on|off))?$/i);
        if (shuffleMatch) {
            const shuffleState = shuffleMatch[1]?.toLowerCase();
            
            if (shuffleState === 'on' && !isShuffled) {
                elements.shuffleBtn.click();
                showCommandFeedback('Shuffle mode enabled');
            } else if (shuffleState === 'off' && isShuffled) {
                elements.shuffleBtn.click();
                showCommandFeedback('Shuffle mode disabled');
            } else if (!shuffleState) {
                elements.shuffleBtn.click();
                showCommandFeedback(`Shuffle mode ${isShuffled ? 'enabled' : 'disabled'}`);
            }
            return;
        }

        // Loop mode control - enhanced with better feedback
        const loopMatch = cmd.match(/^(?:loop|repeat)(?:\s+(?:mode|setting)?)?(?:\s+(one|single|track|song|all|everything|off|none))?$/i);
        if (loopMatch) {
            const mode = loopMatch[1]?.toLowerCase();
            let targetState = '';
            
            switch (mode) {
                case 'one':
                case 'single':
                case 'track':
                case 'song':
                    targetState = 'single';
                    break;
                case 'all':
                case 'everything':
                    targetState = 'all';
                    break;
                case 'off':
                case 'none':
                    targetState = 'none';
                    break;
                default:
                    // Just toggle through states
                    elements.loopBtn.click();
                    showCommandFeedback(`Loop mode: ${loopState}`);
                    return;
            }
            
            // Click until we reach the desired state
            while (loopState !== targetState) {
                elements.loopBtn.click();
            }
            
            showCommandFeedback(`Loop mode set to ${loopState}`);
            return;
        }

        // Clear queue - enhanced with confirmation
        const clearQueueMatch = cmd.match(/^(?:clear|empty|remove all from)\s+(?:the\s+)?queue$/i);
        if (clearQueueMatch) {
            const queueCount = queue.length;
            queue = [];
            updateQueueView();
            showCommandFeedback(`Cleared ${queueCount} songs from queue`);
            return;
        }

        // Jump to time in song - enhanced with seconds-only format
        const jumpMatch = cmd.match(/^(?:jump|seek|go|skip)\s+(?:to\s+)?(\d+):(\d{2})$/i) || 
                         cmd.match(/^(?:jump|seek|go|skip)\s+(?:to\s+)?(\d+)\s+(?:seconds|secs|s)$/i);
        if (jumpMatch) {
            let time;
            if (jumpMatch[2]) {
                // Minutes:seconds format
                const minutes = parseInt(jumpMatch[1]);
                const seconds = parseInt(jumpMatch[2]);
                time = (minutes * 60) + seconds;
            } else {
                // Seconds-only format
                time = parseInt(jumpMatch[1]);
            }
            
            if (time <= elements.audioPlayer.duration) {
                elements.audioPlayer.currentTime = time;
                const formattedTime = formatTime(time);
                showCommandFeedback(`Jumped to ${formattedTime}`);
            } else {
                showCommandFeedback(`Time exceeds song duration`);
            }
            return;
        }

        // Search by genre - enhanced with more natural language
        const genreMatch = cmd.match(/^(?:find|search|show|display|list)\s+(?:songs?\s+(?:by|with|in)\s+)?genre\s+(.+)$/i);
        if (genreMatch) {
            const genre = genreMatch[1].toLowerCase();
            const genreSongs = songs.filter(s => {
                const songGenre = (s.metadata.genre || '').toLowerCase();
                return calculateSimilarity(songGenre, genre) > 0.6;
            });
            if (genreSongs.length > 0) {
                visibleSongs = genreSongs;
                updatePlaylistView(genreSongs);
                showCommandFeedback(`Found ${genreSongs.length} songs in genre "${genre}"`);
            } else {
                showCommandFeedback(`No songs found in genre "${genre}"`);
            }
            return;
        }

        // Search by year or decade
        const yearMatch = cmd.match(/^(?:find|search|show|display|list)\s+(?:songs?\s+(?:from|in)\s+)?(?:year\s+)?(\d{4})$/i) ||
                         cmd.match(/^(?:find|search|show|display|list)\s+(?:songs?\s+(?:from|in)\s+)?(?:the\s+)?(\d{2})(?:s|0s)$/i);
        if (yearMatch) {
            let yearSongs = [];
            let yearDisplay = '';
            
            if (yearMatch[1].length === 4) {
                // Exact year
                const year = yearMatch[1];
                yearSongs = songs.filter(s => s.metadata.year === year);
                yearDisplay = year;
            } else {
                // Decade (e.g., 80s, 90s)
                const decade = yearMatch[1];
                const startYear = parseInt(`19${decade}0`); // Assuming 20th century for now
                const endYear = startYear + 9;
                yearSongs = songs.filter(s => {
                    const songYear = parseInt(s.metadata.year);
                    return songYear >= startYear && songYear <= endYear;
                });
                yearDisplay = `${decade}0s`;
            }
            
            if (yearSongs.length > 0) {
                visibleSongs = yearSongs;
                updatePlaylistView(yearSongs);
                showCommandFeedback(`Found ${yearSongs.length} songs from ${yearDisplay}`);
            } else {
                showCommandFeedback(`No songs found from ${yearDisplay}`);
            }
            return;
        }

        // Toggle mute - enhanced with explicit on/off
        const muteMatch = cmd.match(/^(?:mute|unmute)(?:\s+(on|off))?$/i);
        if (muteMatch) {
            const muteState = muteMatch[1]?.toLowerCase();
            
            if ((muteState === 'on' && !elements.audioPlayer.muted) || 
                (muteState === 'off' && elements.audioPlayer.muted) ||
                !muteState) {
                elements.audioPlayer.muted = !elements.audioPlayer.muted;
            }
            
            showCommandFeedback(`Audio ${elements.audioPlayer.muted ? 'muted' : 'unmuted'}`);
            return;
        }

        // Play/Pause toggle - enhanced with more explicit commands
        if (cmd.match(/^(?:play|pause|toggle|resume)$/i)) {
            if (isPlaying) {
                pauseAudio();
                showCommandFeedback('Playback paused');
            } else {
                playAudio();
                showCommandFeedback('Playback resumed');
            }
            return;
        }

        // Previous/Next track - enhanced with more synonyms
        if (cmd.match(/^(?:next|skip|forward|advance)$/i)) {
            playNext();
            showCommandFeedback('Playing next track');
            return;
        }
        if (cmd.match(/^(?:previous|prev|back|backward|last)$/i)) {
            playPrevious();
            showCommandFeedback('Playing previous track');
            return;
        }
        
        // Sort playlist - new feature
        const sortMatch = cmd.match(/^(?:sort|order)\s+(?:by\s+)?(title|name|artist|album|year|duration|length)(?:\s+(asc|ascending|desc|descending))?$/i);
        if (sortMatch) {
            const sortBy = sortMatch[1].toLowerCase();
            const sortOrder = sortMatch[2]?.toLowerCase().startsWith('desc') ? 'desc' : 'asc';
            
            let sortField;
            switch (sortBy) {
                case 'title':
                case 'name':
                    sortField = 'title';
                    break;
                case 'artist':
                    sortField = 'artist';
                    break;
                case 'album':
                    sortField = 'album';
                    break;
                case 'year':
                    sortField = 'year';
                    break;
                case 'duration':
                case 'length':
                    sortField = 'duration';
                    break;
            }
            
            if (sortField) {
                elements.sortSelect.value = `${sortField}-${sortOrder}`;
                sortSongs();
                showCommandFeedback(`Sorted playlist by ${sortField} (${sortOrder === 'asc' ? 'ascending' : 'descending'})`);
            }
            return;
        }
        
        // Show favorites - new feature
        if (cmd.match(/^(?:show|display|list|view)\s+(?:my\s+)?(?:favorites|favourite|liked|starred)(?:\s+songs?)?$/i)) {
            const favoriteSongs = songs.filter(song => {
                const songId = `${song.metadata.title}|||${song.metadata.artist}`;
                return favorites.has(songId);
            });
            
            if (favoriteSongs.length > 0) {
                visibleSongs = favoriteSongs;
                updatePlaylistView(favoriteSongs);
                showCommandFeedback(`Showing ${favoriteSongs.length} favorite songs`);
            } else {
                showCommandFeedback('No favorite songs found');
            }
            return;
        }
        
        // System info - new feature
        if (cmd.match(/^(?:system|info|about|stats|statistics)$/i)) {
            const totalSongs = songs.length;
            const totalArtists = new Set(songs.map(s => s.metadata.artist)).size;
            const totalAlbums = new Set(songs.map(s => s.metadata.album)).size;
            const totalDuration = songs.reduce((total, song) => total + (song.metadata.duration || 0), 0);
            const hours = Math.floor(totalDuration / 3600);
            const minutes = Math.floor((totalDuration % 3600) / 60);
            
            showCommandFeedback(`Library stats: ${totalSongs} songs, ${totalArtists} artists, ${totalAlbums} albums`);
            showCommandFeedback(`Total playtime: ${hours}h ${minutes}m`);
            return;
        }
        
        // Smart Queue - mood/genre based queue generation
        const smartQueueMatch = cmd.match(/^(?:smart|create|generate)\s+queue\s+(?:for|based\s+on|with)\s+(.+)$/i);
        if (smartQueueMatch) {
            const moodOrGenre = smartQueueMatch[1].toLowerCase();
            
            // Clear current queue before adding new songs
            queue = [];
            
            // Find songs matching the mood/genre
            const matchingSongs = songs.filter(song => {
                // Check genre match
                const songGenre = (song.metadata.genre || '').toLowerCase();
                const genreMatch = calculateSimilarity(songGenre, moodOrGenre) > 0.6;
                
                // For mood, we could check song title, album, or other metadata
                // This is a simple implementation - could be enhanced with actual mood analysis
                const songTitle = (song.metadata.title || '').toLowerCase();
                const songAlbum = (song.metadata.album || '').toLowerCase();
                const moodMatch = songTitle.includes(moodOrGenre) || 
                                 songAlbum.includes(moodOrGenre) ||
                                 calculateSimilarity(songTitle + ' ' + songAlbum, moodOrGenre) > 0.5;
                
                return genreMatch || moodMatch;
            });
            
            if (matchingSongs.length > 0) {
                // Add matching songs to queue
                queue.push(...matchingSongs);
                updateQueueView();
                switchTab('queue');
                showCommandFeedback(`Created smart queue with ${matchingSongs.length} songs based on "${moodOrGenre}"`);
            } else {
                showCommandFeedback(`No songs found matching "${moodOrGenre}". Try a different mood or genre.`);
            }
            return;
        }
        
        // Help command - new feature
        if (cmd.match(/^(?:help|commands|\?)$/i)) {
            showCommandFeedback('Available commands: play, queue, volume, shuffle, loop, sort, search, smart queue');
            showCommandFeedback('Type "help [command]" for specific command help');
            return;
        }
        
        // Command-specific help - new feature
        const helpMatch = cmd.match(/^help\s+(.+)$/i);
        if (helpMatch) {
            const helpTopic = helpMatch[1].toLowerCase();
            let helpText = '';
            
            switch (helpTopic) {
                case 'play':
                    helpText = 'Usage: play [song title] by [artist]';
                    break;
                case 'queue':
                case 'add':
                    helpText = 'Usage: queue songs by [artist]';
                    break;
                case 'volume':
                case 'vol':
                    helpText = 'Usage: volume [0-100] or volume max/min/half';
                    break;
                case 'shuffle':
                    helpText = 'Usage: shuffle or shuffle on/off';
                    break;
                case 'loop':
                case 'repeat':
                    helpText = 'Usage: loop or loop one/all/off';
                    break;
                case 'sort':
                    helpText = 'Usage: sort by title/artist/album/year asc/desc';
                    break;
                case 'search':
                case 'find':
                    helpText = 'Usage: find genre [genre] or find year [year]';
                    break;
                case 'smart':
                case 'smart queue':
                    helpText = 'Usage: smart queue [mood/genre] - Creates an AI-generated queue based on mood or genre';
                    break;
                default:
                    helpText = `No help available for "${helpTopic}"`;
            }
            
            showCommandFeedback(helpText);
            return;
        }
        
        // If no command matched
        showCommandFeedback(`Unknown command: ${cmd}`);
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === '.') {
            if (!smartCommandTimeout) {
                smartCommandTimeout = setTimeout(() => {
                    showSmartCommandBox();
                }, 300);
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === '.') {
            if (smartCommandTimeout) {
                clearTimeout(smartCommandTimeout);
                smartCommandTimeout = null;
            }
        }
    });
    
    // Close smart command box when clicking outside
    document.addEventListener('click', (e) => {
        if (isSmartCommandActive && !smartCommandBox.contains(e.target)) {
            hideSmartCommandBox();
        }
    });
});

class QueueManager {
    constructor() {
        this.queue = [];
        this.history = [];
        this.maxHistory = 50;
    }

    add(song) {
        this.queue.push(song);
        this.updateQueueDisplay();
    }

    addNext(song) {
        this.queue.unshift(song);
        this.updateQueueDisplay();
    }

    remove(index) {
        if (index >= 0 && index < this.queue.length) {
            this.queue.splice(index, 1);
            this.updateQueueDisplay();
        }
    }

    clear() {
        this.queue = [];
        this.updateQueueDisplay();
    }

    getNext() {
        return this.queue.shift();
    }

    addToHistory(song) {
        this.history.unshift(song);
        if (this.history.length > this.maxHistory) {
            this.history.pop();
        }
        this.updateRecentDisplay();
    }

    updateQueueDisplay() {
        const queueList = document.getElementById('queue-list');
        queueList.innerHTML = '';
        
        this.queue.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.innerHTML = `
                <span class="song-title">${song.metadata.title}</span>
                <span class="song-artist">${song.metadata.artist}</span>
                <span class="song-duration">${formatTime(song.duration)}</span>
                <button class="remove-from-queue" data-index="${index}">
                    <span class="material-symbols-rounded">remove</span>
                </button>
            `;
            queueList.appendChild(item);
        });
    }

    updateRecentDisplay() {
        const recentList = document.getElementById('recent-list');
        recentList.innerHTML = '';
        
        this.history.forEach((song) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.innerHTML = `
                <span class="song-title">${song.title}</span>
                <span class="song-artist">${song.artist}</span>
                <span class="song-duration">${formatTime(song.duration)}</span>
            `;
            recentList.appendChild(item);
        });
    }
}

const queueManager = new QueueManager();

function playNext() {
    if (!songs.length) return;
    
    if (queue.length > 0) {
        const nextSong = queue.shift();
        const nextIndex = songs.indexOf(nextSong);
        loadSong(nextIndex);
        updateQueueView();
    } else if (isShuffled) {
        const currentShuffledIndex = shuffledSongs.indexOf(songs[currentSongIndex]);
        if (currentShuffledIndex < shuffledSongs.length - 1) {
            const nextSong = shuffledSongs[currentShuffledIndex + 1];
            const nextIndex = songs.indexOf(nextSong);
            loadSong(nextIndex);
        } else if (loopState === 'all') {
            // Re-shuffle when we reach the end, keeping current song first
            const currentSong = songs[currentSongIndex];
            const remainingSongs = songs.filter(song => song !== currentSong);
            for (let i = remainingSongs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
            }
            shuffledSongs = [currentSong, ...remainingSongs];
            loadSong(songs.indexOf(shuffledSongs[0]));
        }
    } else {
        // Normal sequential playback
        if (currentSongIndex < songs.length - 1) {
            loadSong(currentSongIndex + 1);
        } else if (loopState === 'all') {
            loadSong(0);
        }
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-from-queue')) {
        const index = parseInt(e.target.dataset.index);
        queueManager.remove(index);
    }
});

function showExtendedOptions(event, song) {
    event.preventDefault();
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <ul>
            <li data-action="play">Play Now</li>
            <li data-action="queue">Add to Queue</li>
            <li data-action="next">Play Next</li>
            <li data-action="favorite">${song.favorite ? 'Remove from Favorites' : 'Add to Favorites'}</li>
        </ul>
    `;
    
    contextMenu.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        switch(action) {
            case 'play':
                playSong(song);
                break;
            case 'queue':
                queueManager.add(song);
                break;
            case 'next':
                queueManager.addNext(song);
                break;
            case 'favorite':
                toggleFavorite(song);
                break;
        }
        contextMenu.remove();
    });
}

function playSong(song) {
    if (!song) {
        console.warn('No song provided to play');
        return;
    }

    const songId = `${song.metadata.title}|||${song.metadata.artist}|||${song.metadata.album}`;
    
    if (songId !== currentlyPlayingSongId) {
        currentlyPlayingSongId = songId;

        // Create a new audio context only if needed
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Initialize EQ filters
            initializeEQ();
        }

        // Clean up previous audio resources
        if (elements.audioPlayer.src) {
            const oldSrc = elements.audioPlayer.src;
            elements.audioPlayer.src = '';
            URL.revokeObjectURL(oldSrc);
        }

        // Update UI elements
        requestAnimationFrame(() => {
            elements.currentSongTitle.textContent = song.metadata.title;
            elements.artistName.textContent = song.metadata.artist;
            elements.albumName.textContent = song.metadata.album;
            if (song.metadata.coverUrl) {
                elements.coverArt.src = song.metadata.coverUrl;
                elements.coverArt.onerror = () => {
                    elements.coverArt.src = './data/images/albumCoverFiller.png';
                };
            } else {
                elements.coverArt.src = './data/images/albumCoverFiller.png';
            }
        });

        // Handle adaptive theme
        if (document.documentElement.getAttribute('data-theme') === 'adaptive' && song.metadata.coverUrl) {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onerror = () => {
                requestAnimationFrame(() => updateAdaptiveTheme({
                    primary: [30, 30, 30],
                    secondary: [45, 45, 45],
                    darkest: [20, 20, 20],
                    lightest: [255, 255, 255],
                    mostColorful: [100, 100, 100]
                }));
            };
            img.onload = async () => {
                const colors = await getImageColors(img);
                requestAnimationFrame(() => updateAdaptiveTheme(colors));
            };
            img.src = song.metadata.coverUrl;
        }

        // Set up MediaSession API
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.metadata.title,
                artist: song.metadata.artist,
                album: song.metadata.album,
                artwork: song.metadata.coverUrl ? [
                    { src: song.metadata.coverUrl, sizes: '512x512', type: 'image/jpeg' }
                ] : []
            });

            // Add MediaSession action handlers
            navigator.mediaSession.setActionHandler('play', () => {
                playAudio();
            });
            
            navigator.mediaSession.setActionHandler('pause', () => {
                pauseAudio();
            });
            
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                if (currentSongIndex > 0) {
                    loadSong(currentSongIndex - 1);
                } else {
                    loadSong(songs.length - 1);
                }
            });
            
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                playNext();
            });
            
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.fastSeek && 'fastSeek' in elements.audioPlayer) {
                    elements.audioPlayer.fastSeek(details.seekTime);
                    return;
                }
                elements.audioPlayer.currentTime = details.seekTime;
            });
            
            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                const skipTime = details.seekOffset || 10;
                elements.audioPlayer.currentTime = Math.max(elements.audioPlayer.currentTime - skipTime, 0);
            });
            
            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                const skipTime = details.seekOffset || 10;
                elements.audioPlayer.currentTime = Math.min(
                    elements.audioPlayer.currentTime + skipTime,
                    elements.audioPlayer.duration
                );
            });

            // Add shuffle handler
            navigator.mediaSession.setActionHandler('shuffle', () => {
                isShuffled = !isShuffled;
                elements.shuffleBtn.style.color = isShuffled ? '#1db954' : '#fff';
                elements.shuffleBtn.click(); // Trigger the UI update
            });

            // Add loop handler
            navigator.mediaSession.setActionHandler('seekmode', () => {
                switch (loopState) {
                    case 'none':
                        loopState = 'single';
                        elements.audioPlayer.loop = true;
                        elements.loopBtn.innerHTML = '<span class="material-symbols-rounded">repeat_one</span>';
                        break;
                    case 'single':
                        loopState = 'all';
                        elements.audioPlayer.loop = false;
                        elements.loopBtn.innerHTML = '<span class="material-symbols-rounded">repeat</span>';
                        break;
                    case 'all':
                        loopState = 'none';
                        elements.audioPlayer.loop = false;
                        elements.loopBtn.innerHTML = '<span class="material-symbols-rounded">repeat</span>';
                        break;
                }
                elements.loopBtn.style.color = loopState !== 'none' ? '#1db954' : '#fff';
                elements.loopBtn.click(); // Trigger the UI update
            });
        }

        // Create and set up audio source
        const url = URL.createObjectURL(song.file);
        elements.audioPlayer.src = url;
        
        // Set up audio processing
        if (!analyser && audioContext) {
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            if (!sourceNode) {
                sourceNode = audioContext.createMediaElementSource(elements.audioPlayer);
                connectAudioChain();
            }
            
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        }

        if (document.documentElement.getAttribute('data-theme') === 'adaptive') {
            startVisualization();
        }

        queueManager.addToHistory(song);
        highlightCurrentSong();
        updateSongTitleScroll();

        // Clean up URL after loading
        elements.audioPlayer.oncanplay = () => {
            URL.revokeObjectURL(url);
        };
    }

    // Handle playback
    if (elements.autoplayToggle.checked || isPlaying) {
        elements.audioPlayer.play()
            .then(() => {
                isPlaying = true;
                requestAnimationFrame(() => {
                    elements.playBtn.innerHTML = '<span class="material-symbols-rounded">pause</span>';
                });
            })
            .catch(error => {
                console.error('Playback failed:', error);
                isPlaying = false;
                requestAnimationFrame(() => {
                    elements.playBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>';
                });
            });
    }
}

const audioResourceManager = {
    audioBuffers: new Map(),
    maxBuffers: 5,

    async loadAudio(file) {
        if (this.audioBuffers.size >= this.maxBuffers) {
            const oldestKey = this.audioBuffers.keys().next().value;
            this.audioBuffers.delete(oldestKey);
        }

        try {
            const buffer = await file.arrayBuffer();
            this.audioBuffers.set(file.name, buffer);
            return buffer;
        } catch (error) {
            console.error('Error loading audio:', error);
            return null;
        }
    },

    clearOldBuffers() {
        if (this.audioBuffers.size > this.maxBuffers) {
            const deleteCount = this.audioBuffers.size - this.maxBuffers;
            let count = 0;
            for (const key of this.audioBuffers.keys()) {
                if (count >= deleteCount) break;
                this.audioBuffers.delete(key);
                count++;
            }
        }
    }
};

// Add image optimization
function optimizeImage(imageUrl, maxWidth = 300) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const scale = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        
        img.onerror = () => resolve(null);
        img.src = imageUrl;
    });
}