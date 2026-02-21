# Bowling Layout Adapter

A web-based tool for converting bowling ball layouts between different systems and recalculating layouts when a bowler's PAP (Positive Axis Point) changes. Built for pro shop operators and bowlers who need quick, accurate conversions.

🌐 **Live Site**: [https://heejhwang.github.io/layout_adapter/](https://heejhwang.github.io/layout_adapter/)

## Features

### Layout Converter
Convert layouts between three major systems with real-time calculations:
- **Dual Angle** — Drilling Angle, Pin to PAP, VAL Angle
- **VLS (Pin Buffer)** — Pin to PAP, PSA to PAP, Pin Buffer
- **2LS** — Pin to PAP, PSA to PAP, Pin to COG

### PAP Adjuster
Recalculate an existing layout for a new PAP to maintain the same ball reaction. Supports all three layout systems.

### 3D Visualization
Interactive 3D bowling ball preview powered by Three.js, showing layout points, drilling holes, and reference lines in real time.

### Additional Features
- **Bilingual UI** — Full English / 한국어 support with one-click toggle
- **Hand & Grip Selection** — Right/Left hand, 3-Finger/Thumbless
- **Slider-based Input** — Intuitive sliders with fraction display (e.g. `4 1/2"`) alongside text input
- **Validation Warnings** — Alerts for geometrically impossible or unusual layout values
- **2LS Presets** — Quick-apply preset configurations for common 2LS layouts
- **Responsive Design** — Optimized for both desktop and mobile

## How to Use

1. Open `index.html` in any modern web browser, or visit the [live site](https://heejhwang.github.io/layout_adapter/).
2. **Converter**: Select your source and target systems, enter the PAP and layout values, and see the converted values instantly.
3. **PAP Adjuster**: Enter the old PAP, the current layout, and the new PAP. The tool will provide the adjusted layout parameters.

## Project Structure

```
layout_adapter/
├── index.html        # Main HTML entry point
├── style.css         # UI styling with glassmorphism, responsive breakpoints
├── app.js            # Application logic, state management, UI rendering
├── layout-math.js    # Core math: spherical geometry conversions between systems
├── visualizer.js     # Three.js 3D bowling ball visualizer
├── i18n.js           # Internationalization (EN/KO translations)
└── README.md
```

## Technology

- Vanilla HTML, CSS, JavaScript — **no build step required**
- [Three.js](https://threejs.org/) (r128) for 3D visualization, loaded via CDN
- [Google Fonts (Outfit)](https://fonts.google.com/specimen/Outfit) for typography
