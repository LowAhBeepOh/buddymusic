document.addEventListener('DOMContentLoaded', () => {
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
        highContrastToggle: document.getElementById('high-contrast'),
        reduceAnimationsToggle: document.getElementById('reduce-animations'),
        defaultVolumeSlider: document.getElementById('default-volume'),
        autoplayToggle: document.getElementById('autoplay'),
        folderInput: document.getElementById('folder-input')
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

    // Improved version that provides better color sampling and analysis
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

    // Adjusts color brightness while maintaining color saturation
    function adjustColorBrightness(color) {
        if (!color) return [25, 25, 35];
        const brightness = (color[0] * 299 + color[1] * 587 + color[2] * 114) / 1000;
        const maxBrightness = 255;
        
        if (brightness > maxBrightness / 2) {
            const darknessFactor = Math.min(0.25, 0.8 - (brightness / maxBrightness));
            return color.map(c => {
                const darkened = Math.max(15, Math.round(c * darknessFactor));
                const saturated = darkened * 1.2;
                return Math.min(255, Math.round(saturated));
            });
        }
        return color.map(c => Math.min(255, Math.round(c * 1.1)));
    }

    // Helper functions for calculating color contrast ratios
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

    // Ensures text remains readable by maintaining minimum contrast ratio
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

    // Updates theme colors based on album art while ensuring accessibility
    function updateAdaptiveTheme(colorData) {
        const root = document.documentElement;
        let { primary, secondary, darkest, lightest, mostColorful } = colorData;
        
        primary = adjustColorBrightnessToPercentage(primary, 0.35);
        secondary = adjustColorBrightnessToPercentage(secondary, 0.35);
        
        const darkestBrightness = (darkest[0] * 299 + darkest[1] * 587 + darkest[2] * 114) / 1000;
        if (darkestBrightness > 128) {
            darkest = primary.map(c => Math.max(20, Math.round(c * 0.3)));
        }
        
        const isDarkBackground = calculateLuminance(darkest) < 0.5;
        const textColor = isDarkBackground ? [255, 255, 255] : [0, 0, 0];
        lightest = adjustColorContrast(darkest, textColor, 8);
        const adjustedSecondaryText = adjustColorContrast(secondary, textColor, 7);
        const textTint = adjustColorContrast(darkest, mostColorful, 8);
        
        const sidebarPrimary = adjustColorContrast(darkest, primary, 7);
        const sidebarSecondary = adjustColorContrast(darkest, secondary, 7);
        
        const toHex = (rgb) => '#' + rgb.map(x => Math.min(255, Math.max(0, Math.round(x))).toString(16).padStart(2, '0')).join('');
        const toRGBA = (rgb, alpha) => `rgba(${rgb.join(', ')}, ${alpha})`;
        
        const cssVariables = {
            '--bg-primary': toHex(darkest),
            '--bg-secondary': `linear-gradient(135deg, ${toHex(sidebarPrimary)} 0%, ${toHex(sidebarSecondary)} 100%)`,
            '--bg-tertiary': `linear-gradient(135deg, ${toHex(sidebarSecondary)} 0%, ${toHex(adjustColorBrightness(sidebarSecondary))} 100%)`,
            '--text-primary': toHex(lightest),
            '--text-secondary': toRGBA(adjustedSecondaryText, 0.8),
            '--accent-color': toHex(lightest),
            '--hover-color': toRGBA(secondary, 0.4),
            '--text-tint': toHex(textTint)
        };

        requestAnimationFrame(() => {
            Object.entries(cssVariables).forEach(([property, value]) => {
                root.style.setProperty(property, value);
            });
        });
    }

    function adjustColorBrightnessToPercentage(color, percentage) {
        const brightness = (color[0] * 299 + color[1] * 587 + color[2] * 114) / 1000;
        const factor = percentage * 255 / brightness;
        return color.map(c => Math.min(255, Math.round(c * factor)));
    }

    // Element validation
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Element not found: ${key}`);
        }
    }

    let songs = [];
    let currentSongIndex = 0;
    let isPlaying = false;
    let isShuffled = false;
    let loopState = 'none';
    let queue = [];
    let recentlyPlayed = [];
    let currentPlaylist = 'main';

    let favorites = new Set(JSON.parse(localStorage.getItem('buddy-music-favorites') || '[]'));

    function saveFavorites() {
        localStorage.setItem('buddy-music-favorites', JSON.stringify([...favorites]));
    }

    function toggleFavorite(event, songMetadata) {
        event.stopPropagation();
        const key = `${songMetadata.title}|||${songMetadata.artist}`;
        const btn = event.currentTarget;
        
        if (favorites.has(key)) {
            favorites.delete(key);
            btn.classList.remove('active');
        } else {
            favorites.add(key);
            btn.classList.add('active');
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

    async function updatePlaylist(files) {
        const startIndex = songs.length;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const metadata = await getMetadata(file);
            songs.push({ file, metadata });
        }
        
        visibleSongs = [...songs];
        
        updatePlaylistView(visibleSongs);
    }

    function createPlaylistItem(song, index, clickHandler) {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        div.innerHTML = `
            <span class="song-title">${song.metadata.title}</span>
            <span class="song-separator"> - </span>
            <span class="song-artist">${song.metadata.artist}</span>
            <button class="favorite-btn ${isFavorite(song.metadata) ? 'active' : ''}">
                <span class="material-symbols-rounded">favorite</span>
            </button>
        `;
        
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            addToQueue(index);
            const feedback = document.createElement('div');
            feedback.className = 'queue-feedback';
            feedback.textContent = 'Added to queue';
            div.appendChild(feedback);
            setTimeout(() => feedback.remove(), 1000);
        });
        
        div.addEventListener('click', () => clickHandler(index));
        
        const favoriteBtn = div.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', (e) => toggleFavorite(e, song.metadata));
        
        return div;
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

    const originalLoadSong = loadSong;
    loadSong = async function(index) {
        const song = songs[index];
        if (song) {
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

    function loadSong(index) {
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
            elements.coverArt.src = metadata.coverUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        }

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                artwork: metadata.coverUrl ? [{ src: metadata.coverUrl, sizes: '512x512', type: 'image/jpeg' }] : []
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

    // Update startVisualization function
    function startVisualization() {
        if (!analyser) return;
        
        let currentColors = { ...baseColors };
        const fadeSpeed = 0.97; // Slower fade
        let prevIntensity = 0;
        let prevBassBoost = 0;
        const smoothingFactor = 0.15;
        
        function updateColors() {
            if (document.documentElement.getAttribute('data-theme') !== 'adaptive') {
                return;
            }

            // Handle fade back to base colors when not playing
            if (!isPlaying) {
                const fadingSpeed = 0.98;
                currentColors = {
                    primary: interpolateColors(currentColors.primary, baseColors.primary, fadingSpeed),
                    secondary: interpolateColors(currentColors.secondary, baseColors.secondary, fadingSpeed),
                    darkest: interpolateColors(currentColors.darkest, baseColors.darkest, fadingSpeed),
                    lightest: baseColors.lightest,
                    mostColorful: interpolateColors(currentColors.mostColorful, baseColors.mostColorful, fadingSpeed)
                };

                // Continue animation until colors are back to base
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
            
            // Smooth out the intensity changes
            const targetIntensity = Math.min(average / 128, 1) * 0.3; // Reduced intensity
            const targetBassBoost = Math.min(bassIntensity / 200, 1) * 0.2; // Reduced bass boost
            
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
    }

    function pauseAudio() {
        elements.audioPlayer.pause();
        isPlaying = false;
        elements.playBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>';
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
        if (!visibleSongs || !visibleSongs.length) return;
        
        if (queue.length > 0) {
            const nextSong = queue.shift();
            const nextIndex = songs.indexOf(nextSong);
            loadSong(nextIndex);
            updateQueueView();
        } else if (isShuffled) {
            const currentVisibleIndex = visibleSongs.indexOf(songs[currentSongIndex]);
            let nextIndex;
            
            do {
                nextIndex = Math.floor(Math.random() * visibleSongs.length);
            } while (nextIndex === currentVisibleIndex && visibleSongs.length > 1);
            
            loadSong(nextIndex);
        } else {
            const currentVisibleIndex = visibleSongs.indexOf(songs[currentSongIndex]);
            if (currentVisibleIndex < visibleSongs.length - 1) {
                loadSong(currentVisibleIndex + 1);
            } else if (loopState === 'all') {
                loadSong(0);
            }
        }
    }

    elements.shuffleBtn.addEventListener('click', () => {
        isShuffled = !isShuffled;
        elements.shuffleBtn.style.color = isShuffled ? '#1db954' : '#fff';
    });

    elements.loopBtn.addEventListener('click', () => {
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
    });

    elements.audioPlayer.addEventListener('timeupdate', () => {
        const progress = (elements.audioPlayer.currentTime / elements.audioPlayer.duration) * 100;
        elements.progressBar.value = progress;
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

    // Double-click volume slider to reset to 100%
    elements.volumeControl.addEventListener('dblclick', () => {
        elements.volumeControl.value = 100;
        elements.audioPlayer.volume = 1;
    });

    // Right-click song for extended options
    function showExtendedOptions(event, song) {
        event.preventDefault();
        // Implement extended options logic here
        console.log('Extended options for:', song.metadata.title);
    }

    // Hover scrubbing in progress bar
    elements.progressBar.addEventListener('mousemove', (e) => {
        if (e.buttons === 1) {
            const rect = elements.progressBar.getBoundingClientRect();
            const percentage = (e.clientX - rect.left) / rect.width;
            elements.audioPlayer.currentTime = percentage * elements.audioPlayer.duration;
        }
    });

    // Click album art to maximize
    elements.coverArt.addEventListener('click', () => {
        elements.coverArt.parentElement.classList.toggle('maximized');
    });

    // Scroll song title if too long
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

    function updatePlaylistView(songList) {
        elements.playlist.innerHTML = '';
        visibleSongs = songList;
        
        songList.forEach((song, index) => {
            const div = createPlaylistItem(
                song,
                songs.indexOf(song),
                loadSong
            );
            if (songs[currentSongIndex] === song) {
                div.classList.add('active');
            }
            elements.playlist.appendChild(div);
        });
    }

    elements.searchInput.addEventListener('input', (e) => {
        filterPlaylist(e.target.value || '');
    });

    function filterPlaylist(searchTerm) {
        if (!searchTerm) {
            updatePlaylistView(songs);
            hideAddAllToQueue();
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
                return searchable.includes(searchLower);
            });
        }

        updatePlaylistView(filtered);
        
        if (filtered.length > 0) {
            showAddAllToQueue(filtered);
        } else {
            hideAddAllToQueue();
        }
    }

    function showAddAllToQueue(filteredSongs) {
        let addAllBtn = document.querySelector('.add-all-to-queue');
        if (!addAllBtn) {
            addAllBtn = document.createElement('button');
            addAllBtn.className = 'add-all-to-queue';
            addAllBtn.innerHTML = `
                <span class="material-symbols-rounded">queue</span>
                Add all to queue (${filteredSongs.length} songs)
            `;
            addAllBtn.addEventListener('click', () => {
                const songsToAdd = filteredSongs.filter(song => !queue.includes(song));
                if (songsToAdd.length > 0) {
                    queue.push(...songsToAdd);
                    updateQueueView();
                    
                    addAllBtn.innerHTML = '<span class="material-symbols-rounded">check</span> Added to queue!';
                    setTimeout(() => {
                        addAllBtn.innerHTML = `
                            <span class="material-symbols-rounded">queue</span>
                            Add all to queue (${filteredSongs.length} songs)
                        `;
                    }, 1000);
                }
            });
            elements.playlist.parentNode.appendChild(addAllBtn);
        } else {
            addAllBtn.innerHTML = `
                <span class="material-symbols-rounded">queue</span>
                Add all to queue (${filteredSongs.length} songs)
            `;
        }
        addAllBtn.style.display = 'flex';
    }

    function hideAddAllToQueue() {
        const addAllBtn = document.querySelector('.add-all-to-queue');
        if (addAllBtn) {
            addAllBtn.style.display = 'none';
        }
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
        elements.playlist.innerHTML = '';
        songList.forEach((song, index) => {
            const div = createPlaylistItem(
                song,
                songs.indexOf(song),
                loadSong
            );
            if (songs[currentSongIndex] === song) {
                div.classList.add('active');
            }
            elements.playlist.appendChild(div);
        });
    }

    function initializeSettings() {
        const settings = JSON.parse(localStorage.getItem('buddy-music-settings')) || {
            fontSize: 'medium',
            highContrast: false,
            reduceAnimations: false,
            defaultVolume: 100,
            autoplay: false
        };

        applySettings(settings);

        elements.fontSizeSelect.value = settings.fontSize;
        elements.highContrastToggle.checked = settings.highContrast;
        elements.reduceAnimationsToggle.checked = settings.reduceAnimations;
        elements.defaultVolumeSlider.value = settings.defaultVolume;
        elements.autoplayToggle.checked = settings.autoplay;
    }

    function applySettings(settings) {
        document.documentElement.setAttribute('data-font-size', settings.fontSize);
        document.documentElement.setAttribute('data-high-contrast', settings.highContrast);
        document.documentElement.setAttribute('data-reduce-animations', settings.reduceAnimations);
        if (elements.audioPlayer) {
            elements.audioPlayer.volume = settings.defaultVolume / 100;
        }
    }

    function saveSettings() {
        const settings = {
            fontSize: elements.fontSizeSelect.value,
            highContrast: elements.highContrastToggle.checked,
            reduceAnimations: elements.reduceAnimationsToggle.checked,
            defaultVolume: elements.defaultVolumeSlider.value,
            autoplay: elements.autoplayToggle.checked
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
        'highContrastToggle',
        'reduceAnimationsToggle',
        'defaultVolumeSlider',
        'autoplayToggle'
    ].forEach(settingId => {
        elements[settingId].addEventListener('change', saveSettings);
    });

    initializeSettings();

    elements.folderInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files).filter(file => 
            file.type.startsWith('audio/') || 
            file.name.endsWith('.mp3') || 
            file.name.endsWith('.wav') ||
            file.name.endsWith('.ogg') ||
            file.name.endsWith('.m4a')
        );

        if (files.length === 0) {
            alert('No audio files found in the selected folder');
            return;
        }

        const startIndex = songs.length;
        await updatePlaylist(files);
        
        if (startIndex === 0 && songs.length > 0) {
            loadSong(0);
        }
        
        elements.folderInput.value = '';
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Only handle shortcuts if not typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault(); // Prevent page scroll
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
});