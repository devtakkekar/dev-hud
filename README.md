# QB Core Responsive HUD Overlay (PvP Style)

A responsive, customizable HUD overlay for QB Core using HTML, CSS, and JavaScript.
( still build in progress not the final build) **

## Features
- Displays bank and cash amount at the top right
- Center-bottom HUD with icons for:
  - Health
  - Armor
  - Sprinting stamina
  - Underwater breathing stamina
  - Mic range
- All HUD logic in JavaScript
- `/hud` command (simulated by pressing `/` in the demo) opens a settings UI for HUD customization

## Usage
1. Open `index.html` in your browser to view the HUD overlay.
2. Press `/` and type `hud` to open the settings page.
3. Adjust which HUD elements are visible in `settings.html` and save your preferences.

## Customization
- Integrate the JavaScript logic with your QB Core framework/game to update HUD values dynamically.
- Replace SVG icons in the `assets/` folder as needed.

## Preview
<img width="489" height="153" alt="Screenshot_5" src="https://github.com/user-attachments/assets/40b15c97-c75a-400f-9009-cf62540b6523" />


## File Structure
- `index.html` — Main HUD overlay
- `hud.css` — Responsive styles
- `hud.js` — HUD logic
- `settings.html` — HUD settings page
- `settings.js` — Settings logic
- `assets/` — SVG icons
