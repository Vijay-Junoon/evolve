# 🧬 PRIMAL — Evolution & Natural Selection Simulation

> An agent-based artificial life simulation modeling natural selection, genetic diversity, trait inheritance, and ecosystem dynamics in a 2D environment.

---

## 🌍 Overview & Vision

**PRIMAL** is an evolutionary simulation inspired by Darwinian theory and computational biology. The project models how autonomous digital organisms—each equipped with unique physical and behavioral traits—interact, compete, survive, and evolve inside a shared ecosystem.

By introducing environmental pressures such as finite resources, sensory limitations, and competitive interactions, the simulation demonstrates how complex emergent behaviors arise from simple biological rules.

---

## 🔬 Core Mechanics

### 1. The Environment (Perimeter Matrix)
The simulation takes place on a configurable two-dimensional grid representing a bounded habitat. Organisms and consumable resources coexist within this coordinate space, forming an active testing ground for evolutionary pressures.

### 2. Specimen Architecture & Trait System
Every specimen spawned into the environment is assigned distinct biological attributes that influence its survival capabilities:

* **Speed (⚡)**: Dictates how quickly the specimen navigates the grid toward resources or away from threats.
* **Strength (💪)**: Determines the outcome of physical confrontations and competitive resource disputes.
* **Aggression (👹)**: Governs behavioral tendencies—influencing whether an organism prioritizes passive foraging or hostile competition against rivals.
* **Spatial Coordinates (📍)**: Real-time tracking of organism positioning across the matrix.

### 3. Resource Ecology (Food System)
Nutritional resources are scattered across the terrain to fuel specimen survival. Competition for these limited provisions forms the primary evolutionary catalyst for natural selection.

### 4. Real-Time Visual Observation
The ecosystem state is rendered graphically onto a 2D coordinate plot, utilizing distinct visual glyphs to represent each specimen and resource item in real time.

---

## 🗺️ Evolutionary Roadmap

The development of **PRIMAL** is structured across progressive evolutionary phases:

### 🌱 Phase 1: Spawning & Resource Ecology *(Completed)*
* Initialization of the two-dimensional spatial perimeter.
* Randomized entity generation with variable baseline attributes (Speed, Strength, Aggression).
* Distribution of food items across random coordinate locations.
* Graphical visualization of specimens and resources on a coordinate plane.

### 👁️ Phase 2: Sensory Perception & Movement *(Current Focus)*
* Implementation of a Field of View (FOV) radius for each specimen.
* Proximity detection and distance calculation to locate the nearest food sources.
* Directional pathfinding and autonomous movement mechanics toward detected targets.

### 🧬 Phase 3: Reproduction & Genetic Inheritance
* Energy storage thresholds required for reproduction.
* Trait transmission from parent organisms to offspring.
* Introduction of genetic mutations to drive diversity and trait drift.

### ⚔️ Phase 4: Competition & Natural Selection
* Interaction dynamics when specimens contest the same resource.
* Combat and dominance resolution determined by Strength and Aggression ratios.
* Survival of the fittest: organisms with advantageous trait combinations reproduce more successfully.

### 💀 Phase 5: Mortality & Population Dynamics
* Energy depletion and starvation mechanics over elapsed simulation steps.
* Natural lifespan limits and specimen decay.
* Population equilibrium tracking and carrying capacity analysis.

---

## 📓 Development Journey

### Day 01 — Genesis: Grid Foundation & Entity Spawning
* Established the core 10x10 spatial perimeter for the ecosystem.
* Built the initial character class with randomized physical attributes: Speed (1–7), Strength (1–6), and Aggression (1–9).
* Implemented food item generation and spatial mapping.
* Connected the simulation state to a graphical visualization pipeline using Matplotlib to display emoji-based specimen markers at their exact coordinates.
* **Next Objective**: Implement sensory FOV calculation so organisms can actively detect and navigate toward nearby sustenance.

---
