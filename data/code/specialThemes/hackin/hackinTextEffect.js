class HackinEffect {
    constructor() {
        // Timing configurations (in milliseconds)
        this.config = {
            displayTime: 8000,      // How long each text stays visible
            fadeOutTime: 500,       // How long the fade out animation takes
            commandInterval: 1500,   // Time between new commands
            messageInterval: 1250,   // Time between new messages
            typewriterSpeed: 10,    // Time per character for typing
            initialDelay: 750      // Delay before first command after theme change
        };

        this.texts = [
            // System Messages
            'SYSTEM OPERATIONAL',
            'BUFFER STATUS: OPTIMAL',
            'DECODING AUDIO PACKETS...',
            'NEURAL NETWORK: ACTIVE',
            'AI ASSISTANT: ONLINE',
            'ANALYZING MUSIC PATTERNS',
            'PROCESSING AUDIO SIGNATURES',
            'CALCULATING BPM RANGES',
            'GENRE DETECTION: ENABLED',
            'MOOD ANALYSIS: RUNNING',
            
            // Fun Messages
            'JUDGING YOUR MUSIC TASTE...',
            'RICK ROLL DETECTION: ACTIVE',
            'SEARCHING FOR BETTER SONGS',
            'DOWNLOADING MORE RAM',
            'DELETING SYSTEM32 (JK)',
            'HACKING THE MAINFRAME',
            'ENCRYPTING YOUR GUILTY PLEASURES',
            'HIDING YOUR SPOTIFY HISTORY',
            'DETECTING CRINGE LEVELS',
            'MEASURING BASS FREQUENCIES',
            
            // Meta Comments
            'OH NO... WHO LISTENS TO THIS?',
            'ACTUALLY, THIS ONE IS GOOD',
            'PROCESSING RECOMMENDATIONS',
            'CHECKING MUSIC BLOGS',
            'ACCESSING UNDERGROUND SERVERS',
            'SCANNING SOUNDCLOUD REPOS',
            'FINDING SIMILAR ARTISTS',
            'ANALYZING LISTENING PATTERNS',
            'OPTIMIZING PLAYLIST ORDER',
            'CALCULATING MOOD TRANSITIONS'
        ];

        this.directories = [
            // System Directories
            'cd /root/music/player',
            'ls -la /usr/local/audio',
            'cat /etc/audio/config.conf',
            'tail -f /var/log/audio.log',
            'ps aux | grep audio',
            'netstat -tulpn | grep player',
            'systemctl status audio',
            
            // Audio Processing
            '> stream_buffer: 256KB',
            '> codec: FLAC/MP3/OGG',
            '> bitrate: VBR 320kbps',
            '> channels: 2 (stereo)',
            '> sample_rate: 44100 Hz',
            '> volume_level: ${current_vol}%',
            '> equalizer: custom',
            
            // File Operations
            'mkdir -p /tmp/audio/cache',
            'chmod 755 /usr/bin/player',
            'chown user:audio /dev/snd/*',
            'mount /dev/music /mnt/songs',
            'rsync -avz /music/ /backup/',
            
            // Dynamic Content
            'find /music -name "*.mp3"',
            'grep -r "favorite" /etc/player/',
            'du -sh /var/cache/audio/*',
            'journalctl -u audio.service',
            
            // Network Operations
            'curl -I music.server:8080',
            'wget https://cdn.music/track',
            'ssh audio@localhost -p 22',
            'ping -c 3 music.server'
        ];

        // Dynamic text generators
        this.generators = {
            systemStatus: () => {
                const metrics = ['CPU', 'RAM', 'CACHE', 'BUFFER'];
                const status = ['OPTIMAL', 'NORMAL', 'GOOD', 'EXCELLENT'];
                return `${metrics[Math.floor(Math.random() * metrics.length)]}: ${status[Math.floor(Math.random() * status.length)]}`;
            },
            
            audioMetrics: () => {
                const time = new Date().toLocaleTimeString();
                return `[${time}] Audio metrics: ${Math.floor(Math.random() * 100)}% utilization`;
            },
            
            networkStatus: () => {
                return `Connection: ${Math.floor(Math.random() * 200)}ms latency`;
            },
            
            songAnalysis: (currentSong) => {
                if (!currentSong) return 'No song playing';
                return `Analyzing: "${currentSong}" - Processing audio patterns...`;
            }
        };

        this.container = document.querySelector('.player-section');
        this.activeTexts = new Set();
        this.maxTexts = 40;
        this.typewriterSpeed = this.config.typewriterSpeed;
        
        // Create text container
        this.textContainer = document.createElement('div');
        this.textContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            user-select: none;
            font-family: "Courier New", monospace;
            color: #00ff00;
            opacity: 0.3;
            z-index: 0;
            padding: 20px;
            text-align: left;
            overflow: hidden;
            font-size: 14px;
            line-height: 1.2;
        `;

        // Initialize
        this.init();
    }

    init() {
        this.container.appendChild(this.textContainer);
        this.observeTheme();
        this.setupEventListeners();
        
        // Initial check for theme
        if (document.documentElement.getAttribute('data-theme') === "hackin'") {
            this.start();
        }
    }

    setupEventListeners() {
        // Theme change event
        const themeSelect = document.getElementById('settings-theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                if (document.documentElement.getAttribute('data-theme') === "hackin'") {
                    this.addCustomText(`config set theme="${e.target.value}"`, true);
                    this.addCustomText('> theme activated successfully', false);
                }
            });
        }

        // Volume change event
        const volumeControl = document.getElementById('volume');
        if (volumeControl) {
            volumeControl.addEventListener('change', (e) => {
                if (document.documentElement.getAttribute('data-theme') === "hackin'") {
                    this.addCustomText(`audio set volume=${e.target.value}`, true);
                    this.addCustomText('> volume level adjusted', false);
                }
            });
        }

        // Audio player events
        const audioPlayer = document.getElementById('audio-player');
        if (audioPlayer) {
            audioPlayer.addEventListener('play', () => {
                if (document.documentElement.getAttribute('data-theme') === "hackin'") {
                    const currentSong = document.getElementById('current-song')?.textContent || 'unknown';
                    this.addCustomText(`play "${currentSong}"`, true);
                    this.addCustomText('> initializing playback', false);
                }
            });

            audioPlayer.addEventListener('pause', () => {
                if (document.documentElement.getAttribute('data-theme') === "hackin'") {
                    this.addCustomText('audio stream paused', true);
                }
            });
        }

        // File addition event
        document.addEventListener('fileAdded', (e) => {
            if (document.documentElement.getAttribute('data-theme') === "hackin'") {
                const count = e.detail?.count || 1;
                this.addCustomText(`processing ${count} new file${count > 1 ? 's' : ''}`, true);
                this.addCustomText('> scanning metadata...', false);
            }
        });
    }

    async addCustomText(text, isCommand = false) {
        if (document.documentElement.getAttribute('data-theme') !== "hackin'") return;
        
        if (this.activeTexts.size >= this.maxTexts) {
            const oldestText = this.textContainer.firstChild;
            if (oldestText) {
                oldestText.remove();
                this.activeTexts.delete(oldestText);
            }
        }

        const element = document.createElement('div');
        element.style.cssText = `
            opacity: 0;
            transform: translateX(-20px);
            transition: opacity 0.3s, transform 0.3s;
            margin-bottom: 4px;
            color: ${isCommand ? '#00ff00' : '#00cc00'};
            ${text.startsWith('>') ? 'padding-left: 20px;' : ''}
            white-space: pre;
        `;

        this.textContainer.appendChild(element);
        this.activeTexts.add(element);

        // Force reflow
        void element.offsetHeight;
        
        element.style.opacity = '1';
        element.style.transform = 'translateX(0)';

        const prefix = isCommand ? '$ ' : '';
        await this.typewriterEffect(element, prefix + text);

        setTimeout(() => {
            if (element && element.parentNode === this.textContainer) {
                element.style.opacity = '0';
                element.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    if (element && element.parentNode === this.textContainer) {
                        element.remove();
                        this.activeTexts.delete(element);
                    }
                }, this.config.fadeOutTime);
            }
        }, this.config.displayTime);
    }

    typewriterEffect(element, text) {
        return new Promise(resolve => {
            let i = 0;
            const speed = this.typewriterSpeed;
            element.textContent = '';
            
            function addChar() {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(addChar, speed);
                } else {
                    resolve();
                }
            }
            
            addChar();
        });
    }

    async addText(isCommand = false) {
        if (document.documentElement.getAttribute('data-theme') !== "hackin'") return;
        
        let text;
        if (isCommand) {
            // Get a directory command or generate a dynamic one
            if (Math.random() < 0.3) { // 30% chance for dynamic content
                const currentSong = document.getElementById('current-song')?.textContent;
                const currentVol = document.getElementById('volume')?.value || 100;
                
                text = this.directories[Math.floor(Math.random() * this.directories.length)]
                    .replace('${current_vol}', currentVol)
                    .replace('track', currentSong?.toLowerCase().replace(/\s+/g, '-') || 'unknown');
            } else {
                text = this.directories[Math.floor(Math.random() * this.directories.length)];
            }
        } else {
            // Get a status message or generate a dynamic one
            if (Math.random() < 0.4) { // 40% chance for dynamic content
                const generators = Object.values(this.generators);
                const generator = generators[Math.floor(Math.random() * generators.length)];
                text = generator(document.getElementById('current-song')?.textContent);
            } else {
                text = this.texts[Math.floor(Math.random() * this.texts.length)];
            }
        }

        await this.addCustomText(text, isCommand);
    }

    start() {
        if (this.intervals) this.stop();
        
        this.textContainer.style.display = 'block';
        this.intervals = [
            setInterval(() => this.addText(false), this.config.messageInterval),
            setInterval(() => this.addText(true), this.config.commandInterval)
        ];
        
        // Add initial texts with configured delay
        this.addText(false);
        setTimeout(() => this.addText(true), this.config.initialDelay);
    }

    stop() {
        this.textContainer.style.display = 'none';
        if (this.intervals) {
            this.intervals.forEach(interval => clearInterval(interval));
            this.intervals = null;
        }
        this.textContainer.innerHTML = '';
        this.activeTexts.clear();
    }

    observeTheme() {
        const observer = new MutationObserver(() => {
            const isHackinTheme = document.documentElement.getAttribute('data-theme') === "hackin'";
            if (isHackinTheme) {
                this.start();
            } else {
                this.stop();
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });

        // Initial check
        if (document.documentElement.getAttribute('data-theme') === "hackin'") {
            this.start();
        }
    }

    // Method to update timing configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.typewriterSpeed = this.config.typewriterSpeed;
        
        // Restart intervals if active
        if (this.intervals) {
            this.stop();
            this.start();
        }
    }
}

// Initialize only when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.hackinEffect = new HackinEffect();
});

// Custom events for the app
window.dispatchSongEvent = (eventName, songDetails) => {
    const event = new CustomEvent(eventName, {
        detail: songDetails
    });
    document.dispatchEvent(event);
};