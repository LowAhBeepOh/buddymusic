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
        folderInput: document.getElementById('folder-input'),
        clearDatabaseBtn: document.getElementById('clear-database'),
        clearEverythingBtn: document.getElementById('clear-everything'),
        autoSaveSelect: document.getElementById('auto-save')
    };

    let audioContext;
    let analyser;
    let dataArray;
    let baseColors = {
        primary: [30, 30, 30],
        secondary: [45, 45, 45],
        darkest: [20, 20, 20],
        lightest: [255, 255, 255],
        mostColorful: [100, 100, 100]
    };

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
        if (!color) return [25, 25, 35];
        
        const hsl = rgbToHsl(color);
        
        // Boost saturation
        hsl[1] = Math.min(1, hsl[1] * 1.5); // 50% saturation boost
        
        // Force brightness to be at least 25%
        hsl[2] = Math.max(0.25, Math.min(0.4, hsl[2])); // Ensure minimum 25% brightness
        
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

    function adjustColorContrast(backgroundColor, textColor, minContrast = 7.5) {
        let adjustedText = [...textColor];
        let contrast = calculateContrast(backgroundColor, adjustedText);
        let attempts = 0;
        
        while (contrast < minContrast && attempts < 100) {
            if (calculateLuminance(backgroundColor) > 0.5) {
                adjustedText = adjustedText.map(c => Math.max(0, c - 40));
            } else {
                adjustedText = adjustedText.map(c => Math.min(255, c + 40));
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
        darkestHsl[2] = Math.max(0.25, darkestHsl[2]); // Force minimum 25% brightness
        darkest = hslToRgb(darkestHsl);
        
        primary = adjustColorBrightnessToPercentage(primary, 0.35);
        secondary = adjustColorBrightnessToPercentage(secondary, 0.35);
        
        const glowColor = calculateGlowColor(mostColorful);
        
        // Ensure text colors have proper contrast
        const textColor = [255, 255, 255]; // Always use white text for better readability
        lightest = textColor;
        const adjustedSecondaryText = [230, 230, 230]; // Light gray that's still very readable
        const textTint = adjustColorContrast(darkest, mostColorful, 8);
        
        // Adjust sidebar colors to ensure they're visible
        const sidebarPrimary = adjustColorContrast(darkest, primary, 7);
        const sidebarSecondary = adjustColorContrast(darkest, secondary, 7);
        
        const toHex = (rgb) => '#' + rgb.map(x => Math.min(255, Math.max(0, Math.round(x))).toString(16).padStart(2, '0')).join('');
        const toRGBA = (rgb, alpha) => `rgba(${rgb.join(', ')}, ${alpha})`;
        
        const cssVariables = {
            '--bg-primary': toHex(darkest),
            '--bg-secondary': `linear-gradient(135deg, ${toHex(sidebarPrimary)} 0%, ${toHex(sidebarSecondary)} 100%)`,
            '--bg-tertiary': `linear-gradient(135deg, ${toHex(sidebarSecondary)} 0%, ${toHex(adjustColorBrightness(sidebarSecondary))} 100%)`,
            '--text-primary': toHex(lightest),
            '--text-secondary': toRGBA(adjustedSecondaryText, 0.95), // Increased opacity for better visibility
            '--accent-color': toHex(lightest),
            '--hover-color': toRGBA(secondary, 0.4),
            '--text-tint': toHex(textTint),
            '--album-glow': toRGBA(glowColor, 0.5),
            '--button-text': toHex([255, 255, 255]) // Ensure buttons always have white text
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
        
        // Ensure minimum saturation and brightness
        hsl[1] = Math.max(0.3, hsl[1]); // Minimum 30% saturation
        hsl[2] = Math.min(Math.max(0.25, hsl[2]), 0.85); // Force brightness between 25% and 85%
        
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
        songs = [];
        await updatePlaylist(files);
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
            autoSave: 'favorites'
        };
    }

    async function updatePlaylist(files, onProgress) {
        const startIndex = songs.length;
        const settings = getSettings();
        const batchSize = 10;
        const updates = [];
        let processed = 0;
        let batchProcessedCount = 0;

        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchPromises = batch.map(async file => {
                try {
                    const metadata = await getMetadata(file);
                    const song = { file, metadata };
                    songs.push(song);

                    if (settings.autoSave === 'all') {
                        updates.push(songsDB.saveSong(song));
                    } else if (settings.autoSave === 'favorites' && isFavorite(metadata)) {
                        updates.push(songsDB.saveSong(song));
                    }
                    return song;
                } catch (error) {
                    console.error('Error processing file:', file.name, error);
                    return null;
                }
            });

            await Promise.all(batchPromises);
            batchProcessedCount = batch.length;
            processed += batch.length;
            if (onProgress) onProgress(batchProcessedCount);
            
            visibleSongs = [...songs];
            updatePlaylistView(visibleSongs);

            await new Promise(resolve => setTimeout(resolve, 0));
        }

        Promise.all(updates).catch(error => {
            console.error('Error saving songs to database:', error);
        });
    }

    function createPlaylistItem(song, index, clickHandler) {
        const div = document.createElement('div');
        div.className = 'playlist-item';
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

    async function showContextMenu(event, song, index) {
        event.preventDefault();
        
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();

        const isSaved = await checkIfSongIsSaved(song);
        
        // Update context menu to include playlist submenu
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <ul>
                <li data-action="queue">
                    <span class="material-symbols-rounded">queue_music</span>
                    Add to Queue
                </li>
                <li data-action="add-to-playlist">
                    <span class="material-symbols-rounded">playlist_add</span>
                    Save to playlist
                    <span class="material-symbols-rounded" style="margin-left: auto;">chevron_right</span>
                </li>
                <li data-action="favorite">
                    <span class="material-symbols-rounded">favorite</span>
                    ${isFavorite(song.metadata) ? 'Remove from Favorites' : 'Add to Favorites'}
                </li>
                <li data-action="save" ${isSaved ? 'class="disabled"' : ''}>
                    <span class="material-symbols-rounded">save</span>
                    ${isSaved ? 'Already Saved' : 'Save Locally'}
                </li>
                <li data-action="delete">
                    <span class="material-symbols-rounded">delete</span>
                    Delete
                </li>
            </ul>
            <div class="context-submenu">
                ${Array.from(playlistManager.playlists.keys()).map(name => `
                    <li data-playlist="${name}">
                        <span class="material-symbols-rounded">playlist_play</span>
                        ${name}
                    </li>
                `).join('')}
            </div>
        `;

        // Position and show the menu
        contextMenu.style.top = `${event.pageY}px`;
        contextMenu.style.left = `${event.pageX}px`;
        document.body.appendChild(contextMenu);

        // Add submenu interactions
        const playlistOption = contextMenu.querySelector('[data-action="add-to-playlist"]');
        const submenu = contextMenu.querySelector('.context-submenu');

        playlistOption.addEventListener('mouseenter', () => {
            submenu.style.display = 'block';
            submenu.style.left = '100%';
            submenu.style.top = playlistOption.offsetTop + 'px';
        });

        contextMenu.addEventListener('mouseleave', () => {
            submenu.style.display = 'none';
        });

        // Add click handlers for playlist options
        submenu.querySelectorAll('li').forEach(option => {
            option.addEventListener('click', () => {
                const playlistName = option.dataset.playlist;
                playlistManager.addToPlaylist(playlistName, song);
                contextMenu.remove();
            });
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
            document.title = "Buddy Music - ver 0.XC";
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
            let audioBuffer = audioResourceManager.audioBuffers.get(song.file.name);
            if (!audioBuffer) {
                audioBuffer = await audioResourceManager.loadAudio(song.file);
            }

            if (audioBuffer) {
                const blob = new Blob([audioBuffer], { type: song.file.type });
                elements.audioPlayer.src = URL.createObjectURL(blob);
                audioResourceManager.clearOldBuffers();
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
        
        const songId = `${metadata.title}|||${metadata.artist}|||${metadata.album}`;
        
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
            navigator.mediaSession.metadata = new MediaMetadata({
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                artwork: metadata.coverUrl ? [{ src: metadata.coverUrl, sizes: '512x512', type: 'image/jpeg' }] : []
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
        }

        if (elements.audioPlayer) {
            const url = URL.createObjectURL(file);
            elements.audioPlayer.src = url;
            
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                const source = audioContext.createMediaElementSource(elements.audioPlayer);
                source.connect(analyser);
                analyser.connect(audioContext.destination);
                dataArray = new Uint8Array(analyser.frequencyBinCount);
            }

            if (document.documentElement.getAttribute('data-theme') === 'adaptive') {
                startVisualization();
            }

            highlightCurrentSong();
            playAudio();
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

    function highlightCurrentSong() {
        document.querySelectorAll('.playlist-item').forEach((item, index) => {
            item.classList.toggle('active', index === currentSongIndex);
        });
    }

    function playAudio() {
        elements.audioPlayer.play();
        isPlaying = true;
        elements.playBtn.innerHTML = '<span class="material-symbols-rounded">pause</span>';
        updateDocumentTitle(songs[currentSongIndex]);
    }

    function pauseAudio() {
        elements.audioPlayer.pause();
        isPlaying = false;
        elements.playBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>';
        updateDocumentTitle(null);
    }

    elements.playBtn.addEventListener('click', () => {
        if (isPlaying) pauseAudio();
        else playAudio();
    });

    elements.prevBtn.addEventListener('click', () => {
        if (!visibleSongs.length) return;
        
        const currentVisibleIndex = visibleSongs.indexOf(songs[currentSongIndex]);
        if (currentVisibleIndex > 0) {
            loadSong(currentVisibleIndex - 1);
        } else {
            loadSong(visibleSongs.length - 1);
        }
    });

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
        document.documentElement.setAttribute('data-theme', themeName);
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

    elements.searchInput.addEventListener('input', (e) => {
        filterPlaylist(e.target.value || '');
    });

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

        const decadeMatch = searchLower.match(/(\d{2})'s?/);
        if (decadeMatch) {
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
        else if (searchLower === 'fav' || searchLower === 'favorite' || searchLower === 'favorites') {
            window.currentSearch.type = 'favorites';
            filtered = songs.filter(song => isFavorite(song.metadata));
        }
        else {
            filtered = songs.filter(song => {
                const searchable = `
                    ${song.metadata.title} 
                    ${song.metadata.artist} 
                    ${song.metadata.album}
                    ${song.metadata.year}
                    ${song.metadata.genre}
                `.toLowerCase();

                const artistAbbreviations = generateArtistAbbreviations(song.metadata.artist);

                return searchable.includes(searchLower) || 
                       [...artistAbbreviations].some(abbr => abbr === searchLower);
            });
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
                    <button class="add-all-to-playlist">
                        <span class="material-symbols-rounded">playlist_add</span>
                        Add all to playlist
                        <span class="material-symbols-rounded" style="margin-left: auto;">chevron_right</span>
                    </button>
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
                <div class="playlist-submenu">
                    ${Array.from(playlistManager.playlists.keys()).map(name => `
                        <button class="playlist-option" data-playlist="${name}">
                            <span class="material-symbols-rounded">playlist_play</span>
                            ${name}
                        </button>
                    `).join('')}
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

        // Add playlist submenu handlers
        const addToPlaylistBtn = actionsContainer.querySelector('.add-all-to-playlist');
        const playlistSubmenu = actionsContainer.querySelector('.playlist-submenu');

        addToPlaylistBtn.addEventListener('mouseenter', () => {
            playlistSubmenu.style.display = 'block';
            playlistSubmenu.style.left = '100%';
            playlistSubmenu.style.top = '0';
        });

        burgerDropdown.addEventListener('mouseleave', () => {
            playlistSubmenu.style.display = 'none';
        });

        playlistSubmenu.querySelectorAll('.playlist-option').forEach(option => {
            option.addEventListener('click', () => {
                const playlistName = option.dataset.playlist;
                tempSearchResults.forEach(song => {
                    playlistManager.addToPlaylist(playlistName, song);
                });
                showFeedback(burgerMenu, `Added to ${playlistName}!`);
                burgerDropdown.classList.remove('active');
                playlistSubmenu.style.display = 'none';
            });
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
        const playlistsEl = document.getElementById('playlists-list');
        playlistsEl.style.display = tab === 'playlists' ? 'block' : 'none';

        if (tab === 'playlists') {
            if (!playlistManager.currentPlaylist) {
                playlistManager.renderPlaylists();
            }
        }
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
                    songs = queue;
                    currentSongIndex = idx;
                    loadSong(idx);
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
        });
    }

    function initializeSettings() {
        const settings = getSettings();
        applySettings(settings);

        elements.fontSizeSelect.value = settings.fontSize;
        elements.fontFamilySelect.value = settings.fontFamily;
        elements.reduceAnimationsToggle.checked = settings.reduceAnimations;
        elements.autoSaveSelect.value = settings.autoSave;
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
    }

    function saveSettings() {
        const settings = {
            fontSize: elements.fontSizeSelect.value,
            fontFamily: elements.fontFamilySelect.value,
            reduceAnimations: elements.reduceAnimationsToggle.checked,
            autoSave: elements.autoSaveSelect.value
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
        'autoSaveSelect'
    ].forEach(settingId => {
        elements[settingId].addEventListener('change', saveSettings);
    });

    initializeSettings();

    elements.folderInput.addEventListener('change', async (e) => {
        const allFiles = Array.from(e.target.files);
        
        // Sort files into folders for progress tracking
        const folders = new Map();
        let totalAudioFiles = 0;
        
        allFiles.forEach(file => {
            const path = file.webkitRelativePath;
            const folder = path.split('/')[0];
            if (!folders.has(folder)) {
                folders.set(folder, []);
            }
            if (file.type.startsWith('audio/') || 
                file.name.endsWith('.mp3') || 
                file.name.endsWith('.wav') ||
                file.name.endsWith('.ogg') ||
                file.name.endsWith('.m4a')) {
                folders.get(folder).push(file);
                totalAudioFiles++;
            }
        });

        if (folders.size === 0 || totalAudioFiles === 0) {
            alert('No audio files found in the selected folders');
            return;
        }

        let processedFiles = 0;
        
        const progress = document.createElement('div');
        progress.className = 'folder-progress';
        progress.innerHTML = `
            <div class="progress-text">Processing files: 0/${totalAudioFiles}</div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
        `;
        
        const sidebar = document.querySelector('.sidebar');
        const playlist = document.getElementById('playlist');
        sidebar.insertBefore(progress, playlist);

        const progressFill = progress.querySelector('.progress-fill');
        const progressText = progress.querySelector('.progress-text');

        const startIndex = songs.length;
        
        // Process folders sequentially
        for (const [folderName, files] of folders) {
            const folderFiles = files.length;
            
            await updatePlaylist(files, (processedCount) => {
                processedFiles += processedCount;
                requestAnimationFrame(() => {
                    const percent = (processedFiles / totalAudioFiles) * 100;
                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = `Processing files: ${processedFiles}/${totalAudioFiles}`;
                });
            });
            
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (startIndex === 0 && songs.length > 0) {
            loadSong(0);
        }
        
        // Fade out and remove progress indicator
        progress.style.opacity = '1';
        await new Promise(resolve => setTimeout(resolve, 500));
        progress.style.opacity = '0';
        progress.style.transition = 'opacity 0.5s ease';
        await new Promise(resolve => setTimeout(resolve, 500));
        progress.remove();
        
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
                if (currentSongIndex > 0) {
                    loadSong(currentSongIndex - 1);
                } else {
                    loadSong(songs.length - 1);
                }
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

    const savedSongs = await favoritesDB.getAllSongs();
    savedSongs.forEach(songData => {
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
    });

    updatePlaylistView(songs);

    const savedSongsFromDB = await songsDB.getAllSongs();
    savedSongsFromDB.forEach(songData => {
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
    });

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
            const source = audioContext.createMediaElementSource(elements.audioPlayer);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
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

class PlaylistManager {
    constructor() {
        this.playlists = new Map();
        this.currentPlaylist = null;
        this.loadPlaylists();
        this.setupListeners();
    }

    loadPlaylists() {
        const saved = localStorage.getItem('buddy-music-playlists');
        if (saved) {
            const data = JSON.parse(saved);
            data.forEach(({name, songs}) => {
                this.playlists.set(name, songs);
            });
        }
    }

    savePlaylists() {
        const data = Array.from(this.playlists.entries()).map(([name, songs]) => ({
            name,
            songs
        }));
        localStorage.setItem('buddy-music-playlists', JSON.stringify(data));
    }

    createPlaylist(name) {
        if (!name || this.playlists.has(name)) {
            throw new Error('Invalid playlist name or playlist already exists');
        }
        this.playlists.set(name, []);
        this.savePlaylists();
        this.renderPlaylists();
    }

    openPlaylist(name) {
        this.currentPlaylist = name;
        document.querySelector('.back-btn').style.display = 'block';
        this.renderPlaylistSongs(name);
    }

    showPlaylists() {
        this.currentPlaylist = null;
        document.querySelector('.back-btn').style.display = 'none';
        this.renderPlaylists();
    }

    renderPlaylists() {
        const container = document.querySelector('.playlists-container');
        container.innerHTML = '';

        if (this.playlists.size === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-playlist-message';
            emptyMessage.textContent = 'No playlists yet. Click the + button to create one.';
            container.appendChild(emptyMessage);
            return;
        }

        this.playlists.forEach((songs, name) => {
            const div = document.createElement('div');
            div.className = 'playlist-item playlist-entry';
            div.innerHTML = `
                <div class="playlist-info">
                    <span class="playlist-title">${name}</span>
                    <span class="playlist-details">${songs.length} songs</span>
                </div>
                <div class="playlist-actions">
                    <button class="play-playlist" title="Play playlist">
                        <span class="material-symbols-rounded">play_arrow</span>
                    </button>
                    <button class="shuffle-playlist" title="Shuffle playlist">
                        <span class="material-symbols-rounded">shuffle</span>
                    </button>
                    <button class="delete-playlist" title="Delete playlist">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            `;

            const playBtn = div.querySelector('.play-playlist');
            const shuffleBtn = div.querySelector('.shuffle-playlist');
            const deleteBtn = div.querySelector('.delete-playlist');

            div.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.openPlaylist(name);
                }
            });

            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playPlaylist(name, false);
            });

            shuffleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playPlaylist(name, true);
            });

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePlaylist(name);
            });

            container.appendChild(div);
        });
    }

    playPlaylist(name, shuffle = false) {
        const playlist = this.playlists.get(name);
        if (!playlist || playlist.length === 0) return;

        // Convert playlist song IDs to actual song objects
        const playlistSongs = playlist
            .map(songId => {
                const [title, artist] = songId.split('|||');
                return songs.find(s => 
                    s.metadata.title === title && 
                    s.metadata.artist === artist
                );
            })
            .filter(song => song); // Remove any null/undefined entries

        if (playlistSongs.length === 0) return;

        // If shuffle is true, randomize the playlist order
        if (shuffle) {
            for (let i = playlistSongs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [playlistSongs[i], playlistSongs[j]] = [playlistSongs[j], playlistSongs[i]];
            }
        }

        // Clear current queue and add playlist songs
        queue.length = 0;
        queue.push(...playlistSongs.slice(1)); // Add all songs except first to queue
        
        // Play the first song immediately
        const firstSong = playlistSongs[0];
        const songIndex = songs.indexOf(firstSong);
        if (songIndex !== -1) {
            loadSong(songIndex);
        }

        // Update queue display
        updateQueueView();
    }

    renderPlaylistSongs(playlistName) {
        const container = document.querySelector('.playlists-container');
        container.innerHTML = ''; // Clear container first
        
        const playlist = this.playlists.get(playlistName);
        if (!playlist) return;

        playlist.forEach(songId => {
            const [title, artist] = songId.split('|||');
            const song = songs.find(s => 
                s.metadata.title === title && 
                s.metadata.artist === artist
            );
            if (song) {
                const div = document.createElement('div');
                div.className = 'playlist-item';
                div.innerHTML = `
                    <span class="song-title">${song.metadata.title}</span>
                    <span class="song-separator"> - </span>
                    <span class="song-artist">${song.metadata.artist}</span>
                `;

                div.addEventListener('click', () => {
                    const songIndex = songs.indexOf(song);
                    if (songIndex !== -1) {
                        loadSong(songIndex);
                    }
                });

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-from-playlist';
                removeBtn.innerHTML = '<span class="material-symbols-rounded">remove</span>';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFromPlaylist(playlistName, songId);
                    div.remove();
                });

                div.appendChild(removeBtn);
                container.appendChild(div);
            }
        });
    }

    deletePlaylist(name) {
        if (confirm(`Are you sure you want to delete playlist "${name}"?`)) {
            // Delete specific playlist
            this.playlists.delete(name);
            
            // Save changes
            const data = Array.from(this.playlists.entries()).map(([name, songs]) => ({
                name,
                songs
            }));
            localStorage.setItem('buddy-music-playlists', JSON.stringify(data));
            
            // Return to playlist list view and re-render
            this.currentPlaylist = null;
            document.querySelector('.back-btn').style.display = 'none';
            this.renderPlaylists();
        }
    }

    addToPlaylist(playlistName, song) {
        const playlist = this.playlists.get(playlistName);
        if (!playlist) return;
        
        const songId = `${song.metadata.title}|||${song.metadata.artist}`;
        if (!playlist.includes(songId)) {
            playlist.push(songId);
            this.savePlaylists();
        }
    }

    removeFromPlaylist(playlistName, songId) {
        const playlist = this.playlists.get(playlistName);
        if (!playlist) return;
        
        const index = playlist.indexOf(songId);
        if (index > -1) {
            playlist.splice(index, 1);
            this.savePlaylists();
        }
    }

    setupListeners() {
        const backBtn = document.querySelector('.back-btn');
        const newPlaylistBtn = document.querySelector('.new-playlist-btn');

        backBtn?.addEventListener('click', () => {
            this.showPlaylists();
        });

        newPlaylistBtn?.addEventListener('click', () => {
            const name = prompt('Enter playlist name:');
            if (name) {
                try {
                    this.createPlaylist(name);
                } catch (e) {
                    alert(e.message);
                }
            }
        });
    }
}

// Update the switchTab function to properly handle playlists view
function switchTab(tab) {
    currentPlaylist = tab;
    elements.tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    elements.playlist.style.display = tab === 'main' ? 'block' : 'none';
    elements.queueList.style.display = tab === 'queue' ? 'block' : 'none';
    elements.recentList.style.display = tab === 'recent' ? 'block' : 'none';
    const playlistsEl = document.getElementById('playlists-list');
    playlistsEl.style.display = tab === 'playlists' ? 'block' : 'none';

    if (tab === 'playlists') {
        if (!playlistManager.currentPlaylist) {
            playlistManager.renderPlaylists();
        }
    }
}

// Initialize playlist manager after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    // Initialize playlist manager
    window.playlistManager = new PlaylistManager();
    playlistManager.setupListeners();
});