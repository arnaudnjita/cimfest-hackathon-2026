# CIMFEST Hackathon 2026 - Live Stage Display & Organizer Cockpit

Official customizable 3D split-flap mechanical countdown timer and remote organizer cockpit built for the **CIMFEST Hackathon 2026** (Buea, Cameroon).

---

## Architecture

This application consists of two synchronized, zero-server client interfaces that communicate in real-time across browser tabs, windows, or projector monitors using the native HTML5 `BroadcastChannel` API and `localStorage`:

### 1. Live Stage Display (`/` or `/stage` or `cimfest_stage.html`)
- **3D Mechanical Split-Flap Clock**: 60fps physics-driven split flaps with realistic upper/lower folding leaves, lighting gradients, and mechanical click SFX.
- **Brand Typography**: Primary typography in **Bebas Neue** with **Cabinet Grotesk** and **Plus Jakarta Sans** brand styling.
- **Cyber Liquid Neon Progress Tube**: Luminous fluid conduit with pulsing wave animations, cylindrical glass reflection, and glowing meniscus indicator.
- **Multiple Display Formats**:
  - `DD : HH : MM : SS` (Full 4-unit multi-day sprint)
  - `HH : MM : SS` (Hours, minutes, seconds)
  - `MM : SS` (Minutes & seconds for lightning rounds & pitch demos)
  - `AUTO` (Smart adaptive granularity)
- **Live Broadcast Announcement Overlay**: Centered announcement banner with neon glow border for urgent organizer alerts.
- **Theatre Fullscreen Mode**: Press `F` to enter borderless projection mode (hides headers/footers to dedicate 90%+ screen space to the timer).

### 2. Organizer Control Cockpit (`/admin` or `cimfest_admin.html`)
- **Remote Timer Control**: Start, pause, reset, adjust time (+15m, +5m, -5m).
- **Fast-Forward to Live Clock**: 1-click sync button that advances the timer to current live time and updates the progress tube with exact elapsed time.
- **1-Click Presets**: 48h (Full Hackathon), 24h (Halfway), 12h (Overnight), 4h (Sprint), 1h (Code Freeze), 30m (Submissions), 10m/5m/3m (Pitch Decks & Judge Q&A).
- **Remote Announcement Ticker**: Push custom broadcast alerts directly to the big stage screen.
- **Session Phase Manager**: Update stage badge (e.g. *Main Hacking Sprint*, *Mentor Checkpoint*, *Final Polish*, *Pitch Sessions*).
- **Audio & FX Remote**: Trigger remote screen flash, chimes, victory fanfare, master volume, and mute.
- **Live Stage Digit Typography Switcher**: Switch fonts on stage between Bebas Neue, Cabinet Grotesk, Anton, Impact, and JetBrains Mono.

---

## Deployment & Hosting

Hosted live on Vercel with clean URL routing.

- **Stage View**: [https://cimfest-hackathon-2026.vercel.app](https://cimfest-hackathon-2026.vercel.app)
- **Admin Cockpit**: [https://cimfest-hackathon-2026.vercel.app/admin](https://cimfest-hackathon-2026.vercel.app/admin)

---

## Partners & Sponsors
CIMFEST × NERVTEK × AFRICA BLOCKCHAIN FESTIVAL × WEB3BRIDGE
