// HUD Settings Logic
const form = document.getElementById('hud-settings-form');
const settings = ['health', 'armor', 'sprint', 'breath', 'mic'];
const modal = document.getElementById('settings-modal');
const closeBtn = document.getElementById('close-settings');

form.addEventListener('submit', function(e) {
    e.preventDefault();
    settings.forEach(key => {
        localStorage.setItem(`hud_show_${key}`, document.getElementById(`show-${key}`).checked);
    });
    // Optional: Show a toast or feedback
    closeSettings();
});

closeBtn.addEventListener('click', closeSettings);

function closeSettings() {
    window.close();
}

// ESC key closes modal
window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSettings();
    }
});

// Load settings
settings.forEach(key => {
    const val = localStorage.getItem(`hud_show_${key}`);
    if (val !== null) {
        document.getElementById(`show-${key}`).checked = val === 'true';
    }
});
