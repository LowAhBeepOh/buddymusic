(function() {
    function updateThemeBasedOnTime() {
        const hour = new Date().getHours();
        // Daytime: use "silver" theme; Nighttime: use "dark" theme
        const desiredTheme = (hour >= 7 && hour < 19) ? 'silver' : 'dark';
        if (document.documentElement.getAttribute('data-theme') !== desiredTheme) {
            document.documentElement.setAttribute('data-theme', desiredTheme);
            localStorage.setItem('buddy-music-theme', desiredTheme);
            console.log('Theme switched to:', desiredTheme);
        }
    }
    window.addEventListener('load', () => {
        updateThemeBasedOnTime();
        setInterval(updateThemeBasedOnTime, 60000); // Check every minute
    });
})();
