class SongManager {
    constructor() {
        this.songs = [];
        this.songMetadata = new Map(); // Maps song ID to metadata
        this.audioBuffers = new Map(); // Maps song ID to audio buffer
        this.maxBuffers = 20; // Maximum number of audio buffers to keep in memory
        this.currentSongId = null;
        this.nextSongId = null;
    }

    /**
     * Add songs to the manager (metadata only)
     * @param {Array} files - Array of File objects
     * @param {Function} getMetadataFn - Function to extract metadata from a file
     * @param {Function} onProgress - Optional callback for progress updates
     * @returns {Promise<Array>} - Array of song objects with metadata
     */
    async addSongs(files, getMetadataFn, onProgress) {
        const batchSize = 10;
        let processed = 0;
        const newSongs = [];

        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchPromises = batch.map(async file => {
                try {
                    const metadata = await getMetadataFn(file);
                    const song = { 
                        file, 
                        metadata,
                        id: this.generateSongId(metadata)
                    };
                    
                    this.songs.push(song);
                    this.songMetadata.set(song.id, {
                        metadata: song.metadata,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size
                    });
                    
                    newSongs.push(song);
                    return song;
                } catch (error) {
                    console.error('Error processing file:', file.name, error);
                    return null;
                }
            });

            const batchResults = await Promise.all(batchPromises);
            const validResults = batchResults.filter(result => result !== null);
            processed += validResults.length;
            if (onProgress) onProgress(validResults.length);
            
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        return newSongs.filter(song => song !== null);
    }

    /**
     * Generate a unique ID for a song based on its metadata
     * @param {Object} metadata - Song metadata
     * @returns {String} - Unique song ID
     */
    generateSongId(metadata) {
        return `${metadata.title}|||${metadata.artist}`;
    }

    /**
     * Get all songs (metadata only)
     * @returns {Array} - Array of song objects
     */
    getAllSongs() {
        return this.songs;
    }

    /**
     * Preload audio for a song
     * @param {Number} index - Index of the song in the songs array
     * @returns {Promise<ArrayBuffer>} - Audio buffer for the song
     */
    async preloadSong(index) {
        if (index < 0 || index >= this.songs.length) return null;
        
        const song = this.songs[index];
        this.nextSongId = song.id;
        
        // If already loaded, return the buffer
        if (this.audioBuffers.has(song.id)) {
            return this.audioBuffers.get(song.id);
        }
        
        // Load the audio buffer
        return this.loadAudioBuffer(song);
    }

    /**
     * Load a song for playback
     * @param {Number} index - Index of the song in the songs array
     * @returns {Promise<Object>} - Object with song metadata and audio buffer
     */
    async loadSong(index) {
        if (index < 0 || index >= this.songs.length) return null;
        
        const song = this.songs[index];
        this.currentSongId = song.id;
        
        // If already loaded, return the buffer
        let audioBuffer = this.audioBuffers.get(song.id);
        if (!audioBuffer) {
            audioBuffer = await this.loadAudioBuffer(song);
        }
        
        // Preload the next song if available
        if (index + 1 < this.songs.length) {
            this.preloadSong(index + 1).catch(err => {
                console.warn('Failed to preload next song:', err);
            });
        }
        
        // Clean up old buffers
        this.clearOldBuffers();
        
        return {
            metadata: song.metadata,
            file: song.file,
            buffer: audioBuffer
        };
    }

    /**
     * Load audio buffer for a song
     * @param {Object} song - Song object
     * @returns {Promise<ArrayBuffer>} - Audio buffer for the song
     */
    async loadAudioBuffer(song) {
        try {
            console.log(`Loading audio buffer for: ${song.metadata.title}`);
            
            // Check if we need to clear space
            if (this.audioBuffers.size >= this.maxBuffers) {
                // Find a buffer to remove (not the current or next song)
                for (const [id, _] of this.audioBuffers) {
                    if (id !== this.currentSongId && id !== this.nextSongId) {
                        this.audioBuffers.delete(id);
                        console.log(`Removed buffer for song ID: ${id}`);
                        break;
                    }
                }
                
                // If we couldn't remove any buffer, remove the oldest one
                if (this.audioBuffers.size >= this.maxBuffers) {
                    const oldestKey = this.audioBuffers.keys().next().value;
                    this.audioBuffers.delete(oldestKey);
                    console.log(`Removed oldest buffer for song ID: ${oldestKey}`);
                }
            }
            
            // Load the buffer
            const buffer = await song.file.arrayBuffer();
            this.audioBuffers.set(song.id, buffer);
            return buffer;
        } catch (error) {
            console.error('Error loading audio buffer:', error);
            return null;
        }
    }

    /**
     * Clear old audio buffers to free up memory
     */
    clearOldBuffers() {
        if (this.audioBuffers.size <= this.maxBuffers) return;
        
        const deleteCount = this.audioBuffers.size - this.maxBuffers;
        let count = 0;
        
        // Keep current and next song buffers
        for (const [id, _] of this.audioBuffers) {
            if (count >= deleteCount) break;
            if (id !== this.currentSongId && id !== this.nextSongId) {
                this.audioBuffers.delete(id);
                count++;
            }
        }
        
        // If we still need to delete more, delete the oldest ones
        if (count < deleteCount) {
            for (const id of this.audioBuffers.keys()) {
                if (count >= deleteCount) break;
                if (id !== this.currentSongId && id !== this.nextSongId) {
                    this.audioBuffers.delete(id);
                    count++;
                }
            }
        }
    }

    /**
     * Clear all audio buffers
     */
    clearAllBuffers() {
        this.audioBuffers.clear();
        console.log('Cleared all audio buffers');
    }

    /**
     * Get memory usage statistics
     * @returns {Object} - Memory usage statistics
     */
    getMemoryStats() {
        let totalSize = 0;
        const bufferSizes = {};
        
        for (const [id, buffer] of this.audioBuffers) {
            const size = buffer.byteLength;
            bufferSizes[id] = (size / (1024 * 1024)).toFixed(2) + ' MB';
            totalSize += size;
        }
        
        return {
            totalBuffers: this.audioBuffers.size,
            totalSongs: this.songs.length,
            totalSize: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
            bufferSizes
        };
    }
}

// Create a global instance
window.songManager = new SongManager();