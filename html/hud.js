// HUD Logic for QB Core
const playerName = document.getElementById('player-name');
const playerLevel = document.getElementById('player-level');
const armorBar = document.getElementById('armor-bar');
const healthBar = document.getElementById('health-bar');
const staminaBar = document.getElementById('stamina-bar');
const armorValue = document.getElementById('armor-value');

function setBarFill(bar, value) {
    if (!bar) return;
    // Set the width of the ::before pseudo-element
    bar.style.setProperty('--bar-fill', value + '%');
    // Direct DOM manipulation for ::before is not possible, so use style.width if bar is the pseudo
    if (bar.classList.contains('hud-bar-armor') || bar.classList.contains('hud-bar-health') || bar.classList.contains('hud-bar-stamina')) {
        bar.style.setProperty('--bar-fill', value + '%');
        // For fallback, try using a data attribute
        bar.setAttribute('data-bar-fill', value);
        // Try to update the ::before width via inline style (for modern browsers)
        bar.style.setProperty('--bar-before-width', value + '%');
        // But we will use a workaround below
    }
    // Use a workaround: set width on a child element if needed
    let before = bar.querySelector('.bar-fill');
    if (before) before.style.width = value + '%';
}

function updateBarFillCSS() {
    // For each bar, update the ::before width using CSS variables
    document.querySelectorAll('.hud-bar-armor, .hud-bar-health, .hud-bar-stamina').forEach(bar => {
        let val = bar.getAttribute('data-bar-fill') || '0';
        bar.style.setProperty('--bar-before-width', val + '%');
    });
}

function updateHUD({name, health, armor, stamina}) {
    playerName.textContent = name || 'Player';
    const healthVal = Math.max(0, Math.min(health, 100));
    const armorVal = Math.max(0, Math.min(armor, 100));
    // Stamina: 100 = full bar, 0 = empty bar (same as health)
    const staminaVal = typeof stamina === 'number' ? Math.max(0, Math.min(stamina, 100)) : 100;
    // Armor value left, health value right
    armorValue.textContent = armorVal;
    playerLevel.textContent = healthVal;
    playerLevel.style.color = '#a259ff';
    playerLevel.style.textShadow = '0 0 12px #a259ff88';
    armorValue.style.color = '#4e8cff';
    armorValue.style.textShadow = '0 0 8px #4e8cff88';
    // Set bar fill width for ::before pseudo-element
    armorBar.style.setProperty('--bar-before-width', armorVal + '%');
    healthBar.style.setProperty('--bar-before-width', healthVal + '%');
    staminaBar.style.setProperty('--bar-before-width', staminaVal + '%');
    // Fallback for browsers: set data-bar-fill
    armorBar.setAttribute('data-bar-fill', armorVal);
    healthBar.setAttribute('data-bar-fill', healthVal);
    staminaBar.setAttribute('data-bar-fill', staminaVal);
}

// Blinker HUD logic with animation and fallback for SVG arrows
let blinkerState = { left: false, right: false, hazard: false };

function setBlinkers({left, right, hazard}) {
    blinkerState = { left, right, hazard };
    updateBlinkerAnimation();
}

function updateBlinkerAnimation() {
    // Use the SVG polygons directly
    const leftArrow = document.querySelector('.hud-chevron.left svg polygon');
    const rightArrow = document.querySelector('.hud-chevron.right svg polygon');
    if (!leftArrow || !rightArrow) return;
    leftArrow.classList.remove('blinker-animate', 'blinker-active');
    rightArrow.classList.remove('blinker-animate', 'blinker-active');
    if (blinkerState.hazard) {
        leftArrow.classList.add('blinker-animate');
        rightArrow.classList.add('blinker-animate');
    } else if (blinkerState.left) {
        leftArrow.classList.add('blinker-animate');
    } else if (blinkerState.right) {
        rightArrow.classList.add('blinker-animate');
    }
}

// Dynamically update ::before width using CSS variable
const style = document.createElement('style');
style.innerHTML = `
.hud-bar-armor::before { width: var(--bar-before-width, 0%); }
.hud-bar-health::before { width: var(--bar-before-width, 0%); }
.hud-bar-stamina::before { width: var(--bar-before-width, 0%); }
`;
document.head.appendChild(style);

// SPEEDOMETER LOGIC
console.log('[dev-hud] Speedometer NUI script loaded');

const speedoValue = document.getElementById('speedo-value');
const speedoNeedle = document.getElementById('speedo-needle');
const speedoTicks = document.getElementById('speedo-ticks');
const speedoContainer = document.getElementById('speedometer-container');

if (!speedoContainer) {
    console.error('[dev-hud] #speedometer-container not found in DOM!');
} else {
    console.log('[dev-hud] #speedometer-container found');
}

// --- DRAW SEGMENTED ARC AND TICKS ---
function drawSpeedoSegments(numSegments = 10, min = 0, max = 240) {
    const group = document.getElementById('speedo-segments');
    group.innerHTML = '';
    const cx = 150, cy = 150, rOuter = 135, rInner = 105;
    const startAngle = Math.PI, endAngle = 0;
    const totalAngle = Math.PI;
    for (let i = 0; i < numSegments; i++) {
        const segStart = startAngle - (i * totalAngle / numSegments);
        const segEnd = startAngle - ((i + 1) * totalAngle / numSegments);
        const x1o = cx + rOuter * Math.cos(segStart);
        const y1o = cy + rOuter * Math.sin(segStart);
        const x2o = cx + rOuter * Math.cos(segEnd);
        const y2o = cy + rOuter * Math.sin(segEnd);
        const x1i = cx + rInner * Math.cos(segStart);
        const y1i = cy + rInner * Math.sin(segStart);
        const x2i = cx + rInner * Math.cos(segEnd);
        const y2i = cy + rInner * Math.sin(segEnd);
        const d = `M${x1o},${y1o} A${rOuter},${rOuter} 0 0,0 ${x2o},${y2o} L${x2i},${y2i} A${rInner},${rInner} 0 0,1 ${x1i},${y1i} Z`;
        const seg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        seg.setAttribute('d', d);
        seg.setAttribute('fill', 'url(#speedoGradient)');
        seg.setAttribute('opacity', '0.7');
        seg.setAttribute('filter', 'url(#glow)');
        group.appendChild(seg);
    }
}

function drawSpeedoTicks(numTicks = 12) {
    const group = document.getElementById('speedo-ticks');
    group.innerHTML = '';
    const cx = 150, cy = 150, rOuter = 135, rInner = 120;
    for (let i = 0; i <= numTicks; i++) {
        const angle = Math.PI - (i * Math.PI / numTicks);
        const x1 = cx + rInner * Math.cos(angle);
        const y1 = cy + rInner * Math.sin(angle);
        const x2 = cx + rOuter * Math.cos(angle);
        const y2 = cy + rOuter * Math.sin(angle);
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', x1);
        tick.setAttribute('y1', y1);
        tick.setAttribute('x2', x2);
        tick.setAttribute('y2', y2);
        tick.setAttribute('stroke', '#fff');
        tick.setAttribute('stroke-width', '3');
        tick.setAttribute('opacity', '0.85');
        group.appendChild(tick);
    }
}

// --- ANIMATE NEEDLE ---
function setSpeedometerNeedle(speed, min = 0, max = 240) {
    const needle = document.getElementById('speedo-needle');
    const angle = Math.PI - ((speed - min) / (max - min)) * Math.PI;
    const cx = 150, cy = 150, r = 90;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    needle.setAttribute('x2', x2);
    needle.setAttribute('y2', y2);
}

// --- CENTER DIGITAL SPEED ---
function setSpeedometerCenter(speed) {
    document.getElementById('speedo-value').textContent = speed;
}

// --- INIT ---
drawSpeedoSegments(10, 0, 240);
drawSpeedoTicks(12);

function showSpeedometer(show) {
    console.log('[dev-hud] showSpeedometer called with', show);
    if (!speedoContainer) return;
    if (show) {
        speedoContainer.style.display = 'flex';
        setTimeout(() => speedoContainer.classList.add('visible'), 10);
    } else {
        speedoContainer.classList.remove('visible');
        setTimeout(() => speedoContainer.style.display = 'none', 220);
    }
}

window.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'updateHUD') {
        updateHUD(event.data);
    } else if (event.data && event.data.action === 'setBlinkers') {
        setBlinkers(event.data);
    } else if (event.data && event.data.action === 'setSpeedometer') {
        console.log('[dev-hud] Received setSpeedometer NUI message:', event.data);
        // Show/hide
        showSpeedometer(!!event.data.show);
        // Speed
        setSpeedometerCenter(event.data.speed || 0);
        setSpeedometerNeedle(event.data.speed || 0, 0, 240);
    }
});

// Notify client.lua that NUI is ready
window.addEventListener('DOMContentLoaded', function() {
    if (GetParentResourceName) {
        fetch(`https://${GetParentResourceName()}/hudReady`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({})
        });
    }
});
