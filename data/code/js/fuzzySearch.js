class FuzzySearch {
    constructor() {
        // Minimum score threshold for matches (0-1)
        this.threshold = 0.4;
        
        // Maximum edit distance for fuzzy matching
        this.maxEditDistance = 5;

        // Default setting
        this.enabled = false;
    }

    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        
        // Create distance matrix
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
        
        // Initialize first row and column
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        // Fill the matrix
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,      // deletion
                    dp[i][j - 1] + 1,      // insertion
                    dp[i - 1][j - 1] + cost // substitution
                );
            }
        }
        
        return dp[m][n];
    }
    
    stringSimilarity(str1, str2) {
        if (!str1 && !str2) return 1; // Both empty = perfect match
        if (!str1 || !str2) return 0; // One empty = no match
        
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        
        // Exact match
        if (s1 === s2) return 1;
        
        // Check if one is contained in the other
        if (s1.includes(s2)) return 0.9;
        if (s2.includes(s1)) return 0.9;
        
        // Calculate edit distance
        const distance = this.levenshteinDistance(s1, s2);
        
        // If distance is too large, consider it not a match
        if (distance > this.maxEditDistance) {
            // Check for partial matches (beginning of words)
            if (s2.startsWith(s1) || s1.startsWith(s2)) {
                return 0.7;
            }
            return 0;
        }
        
        // Convert distance to similarity score (0-1)
        const maxLength = Math.max(s1.length, s2.length);
        return maxLength === 0 ? 1 : 1 - distance / maxLength;
    }

    search(songs, searchTerm, generateArtistAbbreviations) {
        if (!searchTerm) return songs;
        
        const searchLower = searchTerm.toLowerCase().trim();
        const results = [];
        
        // Process each song
        for (const song of songs) {
            let score = 0;
            const metadata = song.metadata;
            
            // Check stuff
            const titleScore = this.stringSimilarity(metadata.title, searchLower);
            const artistScore = this.stringSimilarity(metadata.artist, searchLower);
            const albumScore = this.stringSimilarity(metadata.album, searchLower);
            const genreScore = metadata.genre ? 
                this.stringSimilarity(metadata.genre, searchLower) : 0;
            const yearScore = metadata.year ? 
                this.stringSimilarity(metadata.year.toString(), searchLower) : 0;
            const artistAbbreviations = generateArtistAbbreviations(metadata.artist);
            const hasAbbreviation = artistAbbreviations && artistAbbreviations.has(searchLower);
            
            // Use the highest score from any field
            score = Math.max(
                titleScore * 1.5,  // Title is most important
                artistScore * 1.3, // Artist is very important
                albumScore,        // Album is moderately important
                genreScore * 0.8,  // Genre is less important
                yearScore * 0.7,   // Year is least important
                hasAbbreviation ? 1 : 0 // Perfect match for abbreviation
            );
            
            // Only include songs that meet the threshold
            if (score >= this.threshold) {
                results.push({
                    song: song,
                    score: score
                });
            }
        }
        
        // Sort by score (highest first)
        results.sort((a, b) => b.score - a.score);
        
        // Return just the songs, sorted by relevance
        return results.map(result => result.song);
    }
}

// Export the FuzzySearch class
window.FuzzySearch = FuzzySearch;
// js pmo so much