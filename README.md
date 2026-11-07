# AutoContentment × Valmora 3D Experience

[![Built with Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Motion with GSAP](https://img.shields.io/badge/GSAP-ScrollTrigger-88CE02?style=for-the-badge&logo=greensock)](https://greensock.com/)
[![Smooth Scroll](https://img.shields.io/badge/Lenis-Inertia_Physics-black?style=for-the-badge)](https://lenis.darkroom.engineering/)
[![Brand Theme](https://img.shields.io/badge/AutoContentment-Emerald_%230C813D-0C813D?style=for-the-badge)](https://autocontentment.com)

A high-performance, scroll-driven 3D automotive experience engineered for **AutoContentment** (`autocontentment.com`) car buyers. Inspired by **Scrolltide's** award-winning **Valmora Grand Tourer** design architecture and viral cinematic WebGL showcases.

---

## 🌟 Key Features

### 1. Cinematic 3D Vehicle Showcase (Three.js WebGL)
- **The Dust Sheet Unveil**: As you scroll, a satin drape lifts and billows with realistic fluid dynamics, unveiling the hand-beaten aluminum grand tourer beneath.
- **Holographic Powertrain Cutaway**: The hood becomes transparent to reveal the 4.0L twin-turbo V8 engine with pulsing diagnostic nodes.
- **Interactive Cursor Physics**: The 3D car and camera subtly tilt and follow your mouse/touch with smooth spring inertia.
- **Bespoke Livery Atelier**: Real-time 3D clearcoat paint switching between AutoContentment Emerald (`#0C813D`), Oxblood Rosso 1964, Modena Onyx Black, Titanium Grigio, and Champagne Gold.

### 2. Sweeping Valmora Tachometer & V8 Sound Synthesizer
- **Analog Tachometer Gauge**: 0 to 8,000 RPM dial with an animated glowing redline needle.
- **Hold-to-Rev Pedal**: Synthesizes authentic multi-harmonic V8 exhaust notes using the native Web Audio API oscillators and low-pass resonant filters.
- **Live Performance Counters**: $0\text{–}100\text{ km/h}$ in 3.6s, Top Speed 324 km/h, Dry Weight 1,180 kg, 610 bhp.

### 3. Real-Time Speech Perception & Scam Shield Triage
- **Live Speech-to-Text Streaming**: Uses the browser's native Web Speech API (`webkitSpeechRecognition`) to transcribe spoken English and Nigerian Pidgin word-for-word onto the screen in real time with zero server lag.
- **Audio Spectrum Equalizer**: Real-time canvas audio visualizer reacting to microphone loudness and frequency.
- **Scam Shield Calculation**: Exposes roadside mechanic scam quotes (e.g. ₦850k gearbox swap vs. ₦70k solenoid fix) and calculates exact money protected (e.g. **₦780,000 Saved**) with celebratory confetti.
- **1-Tap WhatsApp Parts Ordering**: Direct conversion link pre-filled with diagnosed OEM components for AutoContentment's concierge sales desk.

---

## 🚀 Quick Start

No special plugins or app downloads are required. Modern browsers run WebGL natively at 60–120 FPS.

```bash
# Clone the repository
git clone https://github.com/Olumidenana/autocontentment-luxury-3d.git
cd autocontentment-luxury-3d

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 📦 Build & Deployment

```bash
# Production bundle
npm run build

# Preview production build locally
npm run preview
```

Deployable with 1-click on **Vercel**, **Netlify**, or **GitHub Pages**. Configured with `vercel.json`.

---

## 🎨 Design & Attribution
- Inspired by the **Valmora Grand Tourer** showcase on **Scrolltide** (`scrolltide.co`).
- Engineered for **AutoContentment** (`autocontentment.com`).
