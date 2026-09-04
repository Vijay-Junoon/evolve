# 🧬 PRIMAL — Evolution & Natural Selection Simulation

> An agent-based artificial life simulation modeling natural selection, genetic diversity, trait inheritance, and ecosystem dynamics in a 2D environment.

---

## 🌍 Overview & Vision

**PRIMAL** is an evolutionary simulation inspired by Darwinian theory and computational biology. The project models how autonomous digital organisms—each equipped with unique physical and biological traits—interact, compete, survive, and evolve inside a shared ecosystem.

By introducing environmental pressures such as finite resources, sensory limitations, and competitive interactions, the simulation demonstrates how complex emergent behaviors arise from simple biological rules.

---

## 📅 Day - 03 Updates & Highlights

Today's progress focused on graduating PRIMAL from a Matplotlib CLI script into a fully animated, browser-based web simulation platform with rich 16-bit retro naturalist aesthetics and active mortality dynamics:

1. **Interactive Web Simulation Platform (Flask + Vanilla JS)**:
   - Replaced Matplotlib visualization with a client-server architecture powered by a Python Flask REST API (`/api/state`, `/api/next-day`, `/api/reset`, `/api/config`) and a zero-dependency HTML5/CSS3/Vanilla JS frontend.
2. **16-bit Retro Naturalist Terrarium UI (Stitch Project 9314891166410478330)**:
   - Designed a 1990s expedition field desk theme with deep forest green, heartwood timber, and aged parchment color palette.
   - 3-column workstation layout: **Expedition Toolkit** (controls, solar rate slider, habitat regulator, presets), **Oak Frame Vitrine** (coordinate rulers, full-perimeter canvas, camera modes), and **Naturalist Ledger & DNA Dossier** (census, segmented biomass meter, allele progress bars).
   - Space Mono and Courier Prime typography with authentic 90° stepped drop shadows.
3. **Step-by-Step Movement & Path Interpolation**:
   - Eliminated abrupt teleportation; organisms now smoothly traverse step-by-step across calculated grid paths.
4. **Vitality Depletion & Critical Mortality Threshold**:
   - Organisms expend energy while moving: each step costs **1 Vitality (Survival Score)** with floating `-1 ❤️` indicators.
   - If an organism's vitality drops below **3**, the specimen succumbs to exhaustion and is removed from the habitat with a red critical death disintegration animation.
5. **Sensory Perception & Fallback DFS Search**:
   - Implemented Chebyshev Field of View (FOV) scanning and fallback recursive Depth-First Search (DFS) with animated exploration sonar trails.
6. **Visual Asset Scaling & Alignment**:
   - Trees rendered as 2x2 expansive canopies (`190%` scale).
   - Organisms enlarged to `190%` for crisp sprite visibility.
   - Food items rendered as compact nutritional deposits (`80%`).
   - Y-axis coordinate ruler numbers aligned with grid rows.

---

## 💻 Architecture & Directory Structure

```
PRIMAL/
│
├── app.py                     # Flask web server & REST API endpoints
├── requirements.txt           # Python dependencies (Flask)
├── .gitignore                 # Git ignore configuration
│
├── simulation/                # Core simulation domain engine
│   ├── __init__.py
│   ├── world.py               # 2D habitat matrix, occupancy & entity management
│   ├── engine.py              # Day cycle orchestrator, path execution & mortality
│   └── algorithms.py          # Chebyshev FOV scanning & recursive DFS exploration
│
├── entities/                  # Object models with biological traits
│   ├── __init__.py
│   ├── character.py           # Organisms with Speed, Strength, Aggression, FOV, Vitality
│   ├── food.py                # Sustenance resources with nutritional score
│   └── tree.py                # Environmental scenery & obstacles
│
├── templates/
│   └── index.html             # 3-column Naturalist Field Desk UI
│
└── static/
    ├── css/
    │   └── style.css          # Stitch theme tokens, stepped shadows & animations
    ├── js/
    │   └── simulation.js      # Animation pipeline, DOM controller & telemetry stream
    └── assets/
        ├── playground.png     # Full-perimeter habitat ground canvas
        ├── characters/        # Organism sprites (character_1.png, character_2.png, character_3.png)
        ├── food/              # Sustenance sprites (apple.png)
        └── environment/       # Scenery sprites (tree.png)
```

---

## 🔬 Core Mechanics

### 1. The Environment (Terrarium Matrix)
The simulation takes place on a configurable two-dimensional grid representing a bounded habitat with full-perimeter terrain. Organisms, food resources, and ancient trees coexist within this coordinate space.

### 2. Specimen Architecture & Biological Trait System
Every specimen spawned into the environment is assigned distinct biological attributes:

* **Speed (⚡)**: Dictates foraging turn priority and movement speed.
* **Strength (💪)**: Determines outcome of physical confrontations and resource disputes.
* **Aggression (👹)**: Governs behavioral tendencies toward rival organisms.
* **Field of View (👁️)**: Sensory vision radius defining how far an organism can detect sustenance.
* **Vitality / Survival Score (❤️)**: Dynamic energy rating tracking health; depleted by **-1 per movement step** and replenished upon consuming food (+Score).
* **Mortality (< 3 Vitality)**: If vitality falls below 3, the organism perishes.

### 3. Sensory FOV Perception & Fallback Recursive Search (DFS)
* **FOV Scanning**: Each day, organisms scan their Field of View radius ($\Delta x \le \text{FOV} \land \Delta y \le \text{FOV}$). If food is spotted, the specimen moves step-by-step toward the target and consumes it.
* **Fallback Recursive DFS**: When no food is detected within sensory range, the organism executes a recursive Depth-First Search across the matrix to locate available sustenance.

---

## 🚀 Running the Web Simulation

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the simulation server**:
   ```bash
   python app.py
   ```

3. **Open the browser**:
   Navigate to `http://127.0.0.1:5000/`

---

## 🎮 Interface Features

* **Expedition Toolkit**: `RUN`, `HALT`, and `STEP 1 DAY [SPACE]` controls with stepped solar rate slider (`0.5x` to `4.0x`).
* **Habitat Regulator**: Real-time matrix resizing (10x10, 12x12, 15x15), organism population, food count, tree density, and daily drop rate.
* **Ecosystem Presets**: One-click configurations (*Standard Temperate Grove*, *Resource Scarcity Crisis*, *Dense Jungle Sanctuary*).
* **DNA Specimen Dossier**: Interactive dossier with segmented pixel meters for Speed, Strength, Aggression, FOV, and Vitality, plus active FOV projection overlay.
* **Biomass Integrity Meter**: 10-segment live health rating reflecting the colony's vitality status.
* **Field Research Journal**: Real-time event stream tracking genesis, sensory scans, DFS search pulses, movements, feedings, and mortality.

---

## 🗺️ Evolutionary Roadmap

* [x] **Phase 1: Spawning & Resource Ecology**
* [x] **Phase 2: Sensory Perception, FOV Detection & Fallback DFS Exploration**
* [ ] **Phase 3: Interactive Web Platform, Animation Pipeline & Mortality Dynamics** *(In Progress)*
* [ ] **Phase 4: Reproduction, Genetic Mutations & Trait Inheritance**
* [ ] **Phase 5: Organism Competition, Combat & Natural Selection**
* [ ] **Phase 6: Multi-Generational Analytics & Population Dynamics**
