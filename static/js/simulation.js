/**
 * PRIMAL — Pixel Terrarium Evolution Simulator
 * Naturalist Field Station Controller & Telemetry Engine
 * Matching Stitch Project 9314891166410478330 (16-bit Retro Vivarium)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    const state = {
        world: {
            rows: 10,
            cols: 10,
            grid: [],
            characters: [],
            food: [],
            trees: []
        },
        day: 1,
        cyclesTicked: 1,
        status: 'INITIALIZED',
        selectedOrganismId: null,
        isAutoRunning: false,
        autoRunTimeout: null,
        isAnimating: false,
        speedDelays: {
            1: 1200, // 0.5x
            2: 700,  // 1.0x
            3: 300,  // 2.0x
            4: 100   // 4.0x
        },
        speedLabels: {
            1: '0.5x (1.2s)',
            2: '1.0x (700ms)',
            3: '2.0x (300ms)',
            4: '4.0x (100ms)'
        },
        currentSpeedLevel: 2,
        fovScannerActive: false
    };

    // --- DOM Elements ---
    const elements = {
        // Grid & Canvas
        worldGrid: document.getElementById('world-grid'),
        worldCanvasWrapper: document.getElementById('world-canvas-wrapper'),
        rulerCols: document.getElementById('ruler-cols'),
        rulerRows: document.getElementById('ruler-rows'),
        vitrineDimLabel: document.getElementById('vitrine-dim-label'),
        chamberCoordTag: document.getElementById('chamber-coord-tag'),
        rulerXMax: document.getElementById('ruler-x-max'),
        
        // Header Telemetry
        headerDayText: document.getElementById('header-day-text'),
        headerPopText: document.getElementById('header-pop-text'),
        headerFoodText: document.getElementById('header-food-text'),
        cycleCounterDisplay: document.getElementById('cycle-counter-display'),
        systemStatusDot: document.getElementById('system-status-dot'),
        systemStatusLabel: document.getElementById('system-status-label'),
        
        // Playback & Controls
        btnRun: document.getElementById('btn-run'),
        btnPause: document.getElementById('btn-pause'),
        btnNext: document.getElementById('btn-next'),
        runBtnText: document.getElementById('run-btn-text'),
        speedSlider: document.getElementById('speed-slider'),
        rateDisplay: document.getElementById('rate-display'),
        
        // Habitat Config
        cfgGridSize: document.getElementById('cfg-grid-size'),
        cfgCharacters: document.getElementById('cfg-characters'),
        cfgFood: document.getElementById('cfg-food'),
        cfgTrees: document.getElementById('cfg-trees'),
        cfgDailyFood: document.getElementById('cfg-daily-food'),
        btnApplyConfig: document.getElementById('btn-apply-config'),
        
        // Roster & Bar counts
        rosterCount: document.getElementById('roster-count'),
        specimenRosterList: document.getElementById('specimen-roster-list'),
        barPopCount: document.getElementById('bar-pop-count'),
        barFoodCount: document.getElementById('bar-food-count'),
        barTreeCount: document.getElementById('bar-tree-count'),
        
        // Camera toolbar
        btnCamAll: document.getElementById('btn-cam-all'),
        btnRehighlightFov: document.getElementById('btn-rehighlight-fov'),
        
        // Status ribbon
        activeActionText: document.getElementById('active-action-text'),
        
        // Ledger & Dossier
        ledgerDayBadge: document.getElementById('ledger-day-badge'),
        statPopulation: document.getElementById('stat-population'),
        statFood: document.getElementById('stat-food'),
        statAvgScore: document.getElementById('stat-avg-score'),
        statMaxScore: document.getElementById('stat-max-score'),
        integrityStatusText: document.getElementById('integrity-status-text'),
        biomassMeter: document.getElementById('biomass-meter'),
        microEventText: document.getElementById('micro-event-text'),
        
        inspectorHeaderName: document.getElementById('inspector-header-name'),
        inspectorHeaderTag: document.getElementById('inspector-header-tag'),
        inspectorContent: document.getElementById('inspector-content'),
        
        // Journal stream
        logTerminalStream: document.getElementById('log-terminal-stream'),
        chkAutoScroll: document.getElementById('chk-auto-scroll'),
        btnClearLog: document.getElementById('btn-clear-log'),
        footerCoordTracker: document.getElementById('footer-coord-tracker')
    };

    // =========================================================================
    // API INTERACTION METHODS
    // =========================================================================

    /**
     * Fetches current state from Python Flask backend.
     */
    async function fetchState() {
        try {
            const res = await fetch('/api/state');
            const data = await res.json();
            if (data.status === 'success' && data.data) {
                applyServerState(data.data);
            }
        } catch (err) {
            console.error('Error fetching state:', err);
            appendLog('SYSTEM', 'badge-error', 'Failed to connect to simulation backend.');
        }
    }

    /**
     * Advances simulation by one day cycle and visualizes step animations.
     */
    async function executeNextDay() {
        if (state.isAnimating) return;

        state.isAnimating = true;
        updateRigStatus('SIMULATING CYCLE', 'running');
        if (elements.btnNext) elements.btnNext.disabled = true;

        try {
            const res = await fetch('/api/next-day', { method: 'POST' });
            const data = await res.json();

            if (data.status === 'success') {
                state.cyclesTicked++;
                if (elements.cycleCounterDisplay) {
                    elements.cycleCounterDisplay.textContent = `CYCLES: ${state.cyclesTicked} TICKS`;
                }

                // Play animations sequentially for the day's events
                await playDayEvents(data.events, data.telemetry);
                
                // Synchronize final world state
                applyServerState(data.state);
                
                updateRigStatus(state.isAutoRunning ? 'AUTO RUNNING' : 'ACTIVE RIG', state.isAutoRunning ? 'running' : 'ready');
            } else {
                appendLog('ERROR', 'badge-error', data.message || 'Simulation cycle failed.');
                updateRigStatus('CYCLE ERROR', 'ready');
            }
        } catch (err) {
            console.error('Error advancing day:', err);
            appendLog('ERROR', 'badge-error', 'Network error during simulation step.');
            updateRigStatus('DISCONNECTED', 'ready');
        } finally {
            state.isAnimating = false;
            if (elements.btnNext) elements.btnNext.disabled = false;

            // If auto-run is still enabled, schedule next day
            if (state.isAutoRunning) {
                const delay = state.speedDelays[state.currentSpeedLevel] || 700;
                state.autoRunTimeout = setTimeout(executeNextDay, delay);
            }
        }
    }

    /**
     * Resets the ecosystem with custom or current config parameters.
     */
    async function resetWorld(customConfig = null) {
        if (state.isAutoRunning) {
            toggleAutoRun(false);
        }

        const configPayload = customConfig || {
            rows: parseInt(elements.cfgGridSize.value, 10),
            cols: parseInt(elements.cfgGridSize.value, 10),
            characters: parseInt(elements.cfgCharacters.value, 10),
            food: parseInt(elements.cfgFood.value, 10),
            trees: parseInt(elements.cfgTrees.value, 10),
            daily_food_spawn: parseInt(elements.cfgDailyFood.value, 10)
        };

        try {
            const res = await fetch('/api/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configPayload)
            });
            const data = await res.json();

            if (data.status === 'success' && data.data) {
                state.selectedOrganismId = null;
                state.cyclesTicked = 1;
                if (elements.cycleCounterDisplay) {
                    elements.cycleCounterDisplay.textContent = 'CYCLES: 1 TICK';
                }
                applyServerState(data.data);
                appendLog('GENESIS', 'badge-primary', `Genesis regenerated: ${configPayload.rows}x${configPayload.cols} matrix with ${configPayload.characters} organisms, ${configPayload.food} food.`);
                setActionMessage(`Ecosystem matrix respawned: ${configPayload.rows}×${configPayload.cols} tiles.`);
                if (elements.microEventText) {
                    elements.microEventText.textContent = `Chamber reset. Fresh specimen cohort deployed across ${configPayload.rows}×${configPayload.cols} habitat.`;
                }
            }
        } catch (err) {
            console.error('Error resetting world:', err);
            appendLog('ERROR', 'badge-error', 'Failed to reset terrarium.');
        }
    }

    // =========================================================================
    // STATE SYNCHRONIZATION & DOM RENDERING
    // =========================================================================

    /**
     * Applies full state dictionary from backend.
     */
    function applyServerState(serverState) {
        state.world = serverState.world;
        state.day = serverState.day;
        state.status = serverState.status;

        // Update CSS grid layout variables
        document.documentElement.style.setProperty('--grid-cols', state.world.cols);
        document.documentElement.style.setProperty('--grid-rows', state.world.rows);

        const dayFormatted = `DAY ${String(state.day).padStart(2, '0')}`;
        if (elements.headerDayText) elements.headerDayText.textContent = dayFormatted;
        if (elements.ledgerDayBadge) elements.ledgerDayBadge.textContent = dayFormatted;

        // Update plaques and rulers
        if (elements.vitrineDimLabel) {
            elements.vitrineDimLabel.textContent = `DIM: ${state.world.rows}×${state.world.cols} TILES`;
        }
        if (elements.rulerXMax) {
            elements.rulerXMax.textContent = `X: ${String(state.world.cols - 1).padStart(2, '0')}`;
        }
        
        // Render rulers and grid
        renderRulers(state.world.rows, state.world.cols);
        renderGrid();

        // Update telemetry and ledger
        updateTelemetryUI(serverState.telemetry);

        // Update specimen list & inspector
        renderRosterList();
        renderOrganismInspector();
    }

    /**
     * Generates coordinate rulers along top and left.
     */
    function renderRulers(rows, cols) {
        if (!elements.rulerCols || !elements.rulerRows) return;

        // Column numbers
        elements.rulerCols.innerHTML = '';
        for (let c = 0; c < cols; c++) {
            const span = document.createElement('span');
            span.textContent = c;
            elements.rulerCols.appendChild(span);
        }

        // Row numbers
        elements.rulerRows.innerHTML = '';
        for (let r = 0; r < rows; r++) {
            const span = document.createElement('span');
            span.textContent = r;
            elements.rulerRows.appendChild(span);
        }
    }

    /**
     * Renders CSS Grid cells and layered entity sprites.
     */
    function renderGrid() {
        if (!elements.worldGrid) return;
        elements.worldGrid.innerHTML = '';
        const { rows, cols, characters, food, trees } = state.world;

        // Create lookup maps for fast cell entity retrieval
        const charMap = new Map();
        characters.forEach(c => {
            const key = `${c.x},${c.y}`;
            if (!charMap.has(key)) {
                charMap.set(key, []);
            }
            charMap.get(key).push(c);
        });

        const foodMap = new Map();
        food.forEach(f => foodMap.set(`${f.x},${f.y}`, f));

        const treeMap = new Map();
        trees.forEach(t => treeMap.set(`${t.x},${t.y}`, t));

        // Generate cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.id = `cell-${r}-${c}`;

                const key = `${r},${c}`;

                // Layer 2: Trees (Enlarged 2x2 canopy)
                if (treeMap.has(key)) {
                    const treeObj = treeMap.get(key);
                    const treeLayer = document.createElement('div');
                    treeLayer.className = 'entity-layer tree-layer';
                    const img = document.createElement('img');
                    img.src = '/static/assets/environment/tree.png';
                    img.alt = 'Tree Canopy';
                    img.className = 'tree-sprite';
                    treeLayer.appendChild(img);
                    cell.appendChild(treeLayer);
                }

                // Layer 3: Food
                if (foodMap.has(key)) {
                    const foodObj = foodMap.get(key);
                    const foodLayer = document.createElement('div');
                    foodLayer.className = 'entity-layer food-layer';
                    
                    const foodContainer = document.createElement('div');
                    foodContainer.className = 'food-container';
                    foodContainer.id = `food-${foodObj.id}`;

                    const img = document.createElement('img');
                    img.src = `/static/assets/food/${foodObj.sprite || 'apple.png'}`;
                    img.alt = 'Food Deposit';
                    img.className = 'food-sprite';

                    const scoreBadge = document.createElement('span');
                    scoreBadge.className = 'food-score-badge';
                    scoreBadge.textContent = `+${foodObj.score}`;

                    foodContainer.appendChild(img);
                    foodContainer.appendChild(scoreBadge);
                    foodLayer.appendChild(foodContainer);
                    cell.appendChild(foodLayer);
                }

                // Layer 4: Characters / Organisms (Enlarged 190% sprites)
                if (charMap.has(key)) {
                    const charsInCell = charMap.get(key);
                    const charLayer = document.createElement('div');
                    charLayer.className = 'entity-layer organism-layer';

                    charsInCell.forEach(charObj => {
                        const charContainer = document.createElement('div');
                        charContainer.className = 'organism-container';
                        charContainer.id = `char-${charObj.id}`;
                        if (state.selectedOrganismId === charObj.id) {
                            charContainer.classList.add('selected');
                        }

                        const img = document.createElement('img');
                        const spritePath = charObj.sprite ? `/static/assets/characters/${charObj.sprite}` : '/static/assets/characters/character_1.png';
                        img.src = spritePath;
                        img.alt = charObj.name;
                        img.className = 'organism-sprite';

                        const badge = document.createElement('span');
                        badge.className = 'organism-badge';
                        badge.textContent = `❤️ ${charObj.features.survival_score}`;

                        charContainer.appendChild(img);
                        charContainer.appendChild(badge);
                        charLayer.appendChild(charContainer);
                    });
                    cell.appendChild(charLayer);
                }

                // Hover tracker
                cell.addEventListener('mouseenter', () => {
                    const coordStr = `[X: ${String(c).padStart(2, '0')} / Y: ${String(r).padStart(2, '0')}]`;
                    if (elements.chamberCoordTag) elements.chamberCoordTag.textContent = `COORD: ${coordStr}`;
                    if (elements.footerCoordTracker) elements.footerCoordTracker.textContent = `GRID: ${coordStr}`;
                });

                // Click event
                cell.addEventListener('click', () => {
                    handleCellClick(r, c);
                });

                elements.worldGrid.appendChild(cell);
            }
        }

        // Re-apply FOV highlight if an organism is selected
        if (state.selectedOrganismId) {
            highlightOrganismFOV(state.selectedOrganismId);
        }
    }

    /**
     * Handles clicking on a grid cell to select an organism or inspect cell coordinates.
     */
    function handleCellClick(row, col) {
        const char = state.world.characters.find(c => c.x === row && c.y === col);
        if (char) {
            selectOrganism(char.id);
        } else {
            const food = state.world.food.find(f => f.x === row && f.y === col);
            if (food) {
                setActionMessage(`Inspecting Food Resource #${food.id} at (${row}, ${col}) — Nutrition: +${food.score} Vitality`);
            } else {
                const tree = state.world.trees.find(t => t.x === row && t.y === col);
                if (tree) {
                    setActionMessage(`Inspecting Ancient Tree Canopy at (${row}, ${col}) — Natural Shade & Cover`);
                } else {
                    setActionMessage(`Inspecting Habitat Tile (${row}, ${col}) — Fertile Soil`);
                }
            }
        }
    }

    /**
     * Selects an organism, renders DNA inspection panel, and highlights FOV.
     */
    function selectOrganism(charId) {
        state.selectedOrganismId = charId;
        renderOrganismInspector();
        renderRosterList();
        highlightOrganismFOV(charId);
        
        const char = state.world.characters.find(c => c.id === charId);
        if (char) {
            setActionMessage(`Inspecting Specimen ${char.name} at (${char.x}, ${char.y}) [FOV: ${char.features.fov}, Vitality: ${char.features.survival_score}]`);
        }
    }

    /**
     * Highlights the Field of View bounding box for an organism.
     */
    function highlightOrganismFOV(charId) {
        // Clear existing FOV classes
        document.querySelectorAll('.grid-cell.in-fov, .grid-cell.fov-origin').forEach(el => {
            el.classList.remove('in-fov', 'fov-origin');
        });

        if (!charId) return;
        const char = state.world.characters.find(c => c.id === charId);
        if (!char) return;

        const fov = char.features.fov || 3;
        const originCell = document.getElementById(`cell-${char.x}-${char.y}`);
        if (originCell) {
            originCell.classList.add('fov-origin');
        }

        for (let r = char.x - fov; r <= char.x + fov; r++) {
            for (let c = char.y - fov; c <= char.y + fov; c++) {
                if (r >= 0 && r < state.world.rows && c >= 0 && c < state.world.cols) {
                    const cell = document.getElementById(`cell-${r}-${c}`);
                    if (cell) {
                        cell.classList.add('in-fov');
                    }
                }
            }
        }
    }

    // =========================================================================
    // EVENT ANIMATION PIPELINE
    // =========================================================================

    /**
     * Plays simulation events in sequence.
     */
    async function playDayEvents(events, finalTelemetry) {
        const baseSpeed = state.speedDelays[state.currentSpeedLevel] || 700;
        const stepDelay = Math.max(90, Math.floor(baseSpeed * 0.4));

        for (const ev of events) {
            logEventToTerminal(ev);

            switch (ev.type) {
                case 'day_start':
                    setActionMessage(ev.message);
                    if (elements.microEventText) elements.microEventText.textContent = ev.message;
                    await sleep(stepDelay * 0.4);
                    break;

                case 'fov_detect':
                    setActionMessage(ev.message);
                    if (elements.microEventText) elements.microEventText.textContent = ev.message;
                    highlightOrganismFOV(ev.character_id);
                    // Flash target food
                    const foodEl = document.getElementById(`food-${ev.target_food_id}`);
                    if (foodEl) {
                        foodEl.style.transform = 'scale(1.4)';
                        await sleep(stepDelay);
                        foodEl.style.transform = '';
                    }
                    break;

                case 'dfs_init':
                    setActionMessage(ev.message);
                    if (elements.microEventText) elements.microEventText.textContent = ev.message;
                    highlightOrganismFOV(ev.character_id);
                    await sleep(stepDelay * 0.6);
                    break;

                case 'dfs_success':
                case 'dfs_fail':
                    setActionMessage(ev.message);
                    if (elements.microEventText) elements.microEventText.textContent = ev.message;
                    if (ev.explored_trail && ev.explored_trail.length > 0) {
                        await animateDfsTrail(ev.explored_trail, ev.found_pos);
                    }
                    break;

                case 'move':
                    setActionMessage(ev.message);
                    if (elements.microEventText) elements.microEventText.textContent = ev.message;
                    await animateMovement(ev.character_id, ev.from, ev.to, ev.path);
                    break;

                case 'death':
                    setActionMessage(ev.message);
                    if (elements.microEventText) elements.microEventText.textContent = ev.message;
                    await animateDeath(ev.character_id, ev.death_pos, ev.final_vitality);
                    break;

                case 'eat':
                    setActionMessage(ev.message);
                    if (elements.microEventText) elements.microEventText.textContent = ev.message;
                    await animateEating(ev.position, ev.food_score, ev.character_id, ev.new_survival_score);
                    break;

                case 'reproduce':
                    setActionMessage(ev.message);
                    if (elements.microEventText) elements.microEventText.textContent = ev.message;
                    await animateReproduction(ev.position, ev.parent_id, ev.child_id, ev.parent_vitality);
                    break;

                case 'food_replenished':
                    setActionMessage(ev.message);
                    if (elements.microEventText) elements.microEventText.textContent = ev.message;
                    await sleep(stepDelay * 0.4);
                    break;

                case 'day_end':
                    setActionMessage(ev.message);
                    if (elements.microEventText) elements.microEventText.textContent = ev.message;
                    await sleep(stepDelay * 0.4);
                    break;
            }
        }
    }

    /**
     * Animates DFS search exploration trail cell by cell.
     */
    async function animateDfsTrail(trail, foundPos) {
        const pulseDelay = Math.min(50, Math.max(15, Math.floor(400 / trail.length)));
        
        for (const [r, c] of trail) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (cell) {
                cell.classList.add('dfs-explored');
            }
            await sleep(pulseDelay);
        }

        if (foundPos) {
            const targetCell = document.getElementById(`cell-${foundPos[0]}-${foundPos[1]}`);
            if (targetCell) {
                targetCell.classList.add('dfs-target');
            }
        }

        await sleep(220);

        document.querySelectorAll('.grid-cell.dfs-explored, .grid-cell.dfs-target').forEach(el => {
            el.classList.remove('dfs-explored', 'dfs-target');
        });
    }

    /**
     * Animates organism movement step-by-step with -1 vitality depletion.
     */
    async function animateMovement(charId, fromPos, toPos, path) {
        const charContainer = document.getElementById(`char-${charId}`);
        if (!charContainer) return;

        const stepPath = (path && path.length > 0) ? path : [fromPos, toPos];
        const baseSpeed = state.speedDelays[state.currentSpeedLevel] || 700;
        const stepDelay = Math.max(100, Math.min(220, Math.floor(baseSpeed / Math.max(1, stepPath.length))));

        // Highlight movement path trail
        for (const [r, c] of stepPath) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (cell) cell.classList.add('motion-trail');
        }

        const charObj = state.world.characters.find(c => c.id === charId);

        // Step cell by cell
        for (let i = 0; i < stepPath.length; i++) {
            const [r, c] = stepPath[i];
            const targetCell = document.getElementById(`cell-${r}-${c}`);

            if (targetCell) {
                let entityLayer = targetCell.querySelector('.entity-layer.organism-layer');
                if (!entityLayer) {
                    entityLayer = document.createElement('div');
                    entityLayer.className = 'entity-layer organism-layer';
                    targetCell.appendChild(entityLayer);
                }

                entityLayer.appendChild(charContainer);
                
                charContainer.classList.remove('organism-stepping');
                void charContainer.offsetWidth; // Reflow
                charContainer.classList.add('organism-stepping');

                // Deplete 1 vitality for each movement step
                if (i > 0) {
                    const dmgBurst = document.createElement('div');
                    dmgBurst.className = 'step-damage-burst';
                    dmgBurst.textContent = '-1 ❤️';
                    targetCell.appendChild(dmgBurst);
                    setTimeout(() => {
                        if (dmgBurst.parentNode) dmgBurst.parentNode.removeChild(dmgBurst);
                    }, 600);

                    if (charObj) {
                        charObj.features.survival_score = Math.max(0, charObj.features.survival_score - 1);
                        const badge = charContainer.querySelector('.organism-badge');
                        if (badge) {
                            badge.textContent = `❤️ ${charObj.features.survival_score}`;
                        }
                    }
                }
            }

            if (state.selectedOrganismId === charId && charObj) {
                charObj.x = r;
                charObj.y = c;
                highlightOrganismFOV(charId);
                renderOrganismInspector();
            }

            await sleep(stepDelay);
        }

        // Clean up motion trail highlights
        document.querySelectorAll('.grid-cell.motion-trail').forEach(el => {
            el.classList.remove('motion-trail');
        });

        if (charObj) {
            charObj.x = toPos[0];
            charObj.y = toPos[1];
            if (state.selectedOrganismId === charId) {
                renderOrganismInspector();
                highlightOrganismFOV(charId);
            }
        }
    }

    /**
     * Animates red death disintegration when an organism's vitality drops below 3.
     */
    async function animateDeath(charId, deathPos, finalVitality) {
        const [r, c] = deathPos;
        const cell = document.getElementById(`cell-${r}-${c}`);
        const charContainer = document.getElementById(`char-${charId}`);

        if (cell) {
            cell.classList.add('death-flare');

            const deathBadge = document.createElement('div');
            deathBadge.className = 'death-burst';
            deathBadge.textContent = '💀 VITALITY CRITICAL (<3)';
            cell.appendChild(deathBadge);

            setTimeout(() => {
                if (deathBadge.parentNode) deathBadge.parentNode.removeChild(deathBadge);
                cell.classList.remove('death-flare');
            }, 1400);
        }

        if (charContainer) {
            charContainer.classList.add('dying');
            await sleep(1000);
            if (charContainer.parentNode) {
                charContainer.parentNode.removeChild(charContainer);
            }
        }

        // Remove from state characters array
        const charIdx = state.world.characters.findIndex(c => c.id === charId);
        if (charIdx !== -1) {
            state.world.characters.splice(charIdx, 1);
        }

        if (state.selectedOrganismId === charId) {
            highlightOrganismFOV(null);
            elements.inspectorContent.innerHTML = `
                <div class="empty-inspector-msg">
                    <span style="color: var(--color-error); font-weight: 700;">💀 SPECIMEN DECEASED: Succumbed to exhaustion (Vitality &lt; 3)</span>
                </div>
            `;
            state.selectedOrganismId = null;
        }

        renderRosterList();
        await sleep(150);
    }

    /**
     * Spawns floating vitality bonus and absorption animation when food is eaten.
     */
    async function animateEating(position, foodScore, charId, newScore) {
        const [r, c] = position;
        const cell = document.getElementById(`cell-${r}-${c}`);
        
        if (cell) {
            const foodContainer = cell.querySelector('.food-container');
            if (foodContainer) {
                foodContainer.style.transform = 'scale(0) rotate(25deg)';
                foodContainer.style.opacity = '0';
                setTimeout(() => {
                    if (foodContainer.parentNode) {
                        foodContainer.parentNode.removeChild(foodContainer);
                    }
                }, 250);
            }

            const burst = document.createElement('div');
            burst.className = 'eat-burst';
            burst.textContent = `+${foodScore} 🍎`;
            cell.appendChild(burst);

            const charContainer = document.getElementById(`char-${charId}`);
            if (charContainer) {
                const badge = charContainer.querySelector('.organism-badge');
                if (badge) {
                    badge.textContent = `❤️ ${newScore}`;
                }
                charContainer.style.transform = 'translate(-50%, -50%) scale(1.35)';
                await sleep(180);
                charContainer.style.transform = '';
            }

            setTimeout(() => {
                if (burst.parentNode) burst.parentNode.removeChild(burst);
            }, 1000);
        }

        await sleep(120);
    }

    /**
     * Animates organism reproduction burst when survival score reaches >= 15.
     */
    async function animateReproduction(position, parentId, childId, parentVitality) {
        const [r, c] = position;
        const cell = document.getElementById(`cell-${r}-${c}`);
        
        if (cell) {
            cell.classList.add('reproduce-flare');

            const burst = document.createElement('div');
            burst.className = 'reproduce-burst';
            burst.textContent = `🐣 REPRODUCED!`;
            cell.appendChild(burst);

            const parentContainer = document.getElementById(`char-${parentId}`);
            if (parentContainer) {
                const badge = parentContainer.querySelector('.organism-badge');
                if (badge && parentVitality !== undefined) {
                    badge.textContent = `❤️ ${parentVitality}`;
                }
                parentContainer.style.transform = 'translate(-50%, -50%) scale(1.35)';
                await sleep(200);
                parentContainer.style.transform = '';
            }

            setTimeout(() => {
                if (burst.parentNode) burst.parentNode.removeChild(burst);
                cell.classList.remove('reproduce-flare');
            }, 1200);
        }

        await sleep(250);
    }

    // =========================================================================
    // TELEMETRY & RETRO INSPECTOR UI
    // =========================================================================

    /**
     * Updates top and right sidebar telemetry statistics and biomass bar.
     */
    function updateTelemetryUI(telemetry) {
        if (!telemetry) return;

        const pop = telemetry.population;
        const food = telemetry.food_remaining;
        const trees = state.world.trees ? state.world.trees.length : 3;

        // Top Header
        if (elements.headerPopText) elements.headerPopText.textContent = `POP: ${pop}`;
        if (elements.headerFoodText) elements.headerFoodText.textContent = `FOOD: ${food}`;

        // Center Quick Action Bar
        if (elements.barPopCount) elements.barPopCount.textContent = pop;
        if (elements.barFoodCount) elements.barFoodCount.textContent = food;
        if (elements.barTreeCount) elements.barTreeCount.textContent = trees;

        // Roster Count
        if (elements.rosterCount) elements.rosterCount.textContent = pop;

        // Ledger Table
        if (elements.statPopulation) elements.statPopulation.textContent = `${pop} Organisms`;
        if (elements.statFood) elements.statFood.textContent = `${food} Available`;
        if (elements.statAvgScore) elements.statAvgScore.textContent = `${telemetry.avg_survival_score} Pts`;
        if (elements.statMaxScore) elements.statMaxScore.textContent = `${telemetry.max_survival_score} Pts`;

        // Biomass Meter Calculation
        const avgScore = parseFloat(telemetry.avg_survival_score) || 0;
        let integrity = 'STABLE';
        let filledSegments = 7;

        if (avgScore >= 7) {
            integrity = 'OPTIMAL';
            filledSegments = 10;
        } else if (avgScore >= 5) {
            integrity = 'STABLE';
            filledSegments = 7;
        } else if (avgScore >= 3.5) {
            integrity = 'MODERATE';
            filledSegments = 5;
        } else {
            integrity = 'CRITICAL';
            filledSegments = 2;
        }

        if (elements.integrityStatusText) {
            elements.integrityStatusText.textContent = integrity;
            elements.integrityStatusText.style.color = integrity === 'CRITICAL' ? 'var(--color-error)' : 'var(--color-primary)';
        }

        if (elements.biomassMeter) {
            elements.biomassMeter.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                const seg = document.createElement('div');
                seg.className = 'meter-seg';
                if (i < filledSegments) {
                    seg.classList.add(integrity === 'CRITICAL' ? 'bg-error' : 'bg-primary');
                } else {
                    seg.classList.add('bg-surface-dim');
                }
                elements.biomassMeter.appendChild(seg);
            }
        }
    }

    /**
     * Renders detailed Retro DNA Dossier with segmented trait meters.
     */
    function renderOrganismInspector() {
        const char = state.world.characters.find(c => c.id === state.selectedOrganismId);
        
        if (!char) {
            if (elements.inspectorHeaderName) elements.inspectorHeaderName.textContent = 'SPECIMEN DOSSIER';
            if (elements.inspectorHeaderTag) elements.inspectorHeaderTag.textContent = 'STANDBY';
            elements.inspectorContent.innerHTML = `
                <div class="empty-inspector-msg">
                    <span>🔍 Click any organism on the matrix or in the roster to inspect biological traits and Field of View</span>
                </div>
            `;
            return;
        }

        if (elements.inspectorHeaderName) elements.inspectorHeaderName.textContent = `DOSSIER // #${char.id}`;
        if (elements.inspectorHeaderTag) elements.inspectorHeaderTag.textContent = 'ACTIVE TARGET';

        const f = char.features;
        const spriteSrc = char.sprite ? `/static/assets/characters/${char.sprite}` : '/static/assets/characters/character_1.png';

        // Helper to generate retro segmented meter
        const renderSegmentedMeter = (val, max, colorClass) => {
            let segHtml = '';
            const totalSegs = 10;
            const filledCount = Math.min(totalSegs, Math.round((val / max) * totalSegs));
            for (let i = 0; i < totalSegs; i++) {
                const activeClass = i < filledCount ? colorClass : 'bg-surface-dim';
                segHtml += `<div class="meter-seg ${activeClass}"></div>`;
            }
            return `<div class="segmented-pixel-meter">${segHtml}</div>`;
        };

        elements.inspectorContent.innerHTML = `
            <div class="inspector-card-active">
                <div class="inspector-profile">
                    <div class="inspector-avatar">
                        <img src="${spriteSrc}" alt="${char.name}">
                    </div>
                    <div class="inspector-info">
                        <h3>${char.name}</h3>
                        <span class="inspector-coords">Location: [X: ${String(char.y).padStart(2, '0')} / Y: ${String(char.x).padStart(2, '0')}]</span>
                    </div>
                </div>

                <div class="inspector-stats-row">
                    <div class="inspector-stat-pill">
                        <span class="pill-lbl">Age / Cycles</span>
                        <span class="pill-val">${char.days_survived || 0} Days</span>
                    </div>
                    <div class="inspector-stat-pill">
                        <span class="pill-lbl">Food Consumed</span>
                        <span class="pill-val">${char.food_eaten || 0} Items</span>
                    </div>
                </div>

                <div class="trait-bars-container">
                    <div class="trait-row">
                        <div class="trait-meta">
                            <span class="trait-name">⚡ Speed Allele (Priority)</span>
                            <span class="trait-val font-bold">${f.speed} / 10</span>
                        </div>
                        ${renderSegmentedMeter(f.speed, 10, 'bg-secondary')}
                    </div>

                    <div class="trait-row">
                        <div class="trait-meta">
                            <span class="trait-name">💪 Strength Allele</span>
                            <span class="trait-val font-bold">${f.strength} / 10</span>
                        </div>
                        ${renderSegmentedMeter(f.strength, 10, 'bg-primary')}
                    </div>

                    <div class="trait-row">
                        <div class="trait-meta">
                            <span class="trait-name">👹 Aggression Allele</span>
                            <span class="trait-val font-bold">${f.aggression} / 10</span>
                        </div>
                        ${renderSegmentedMeter(f.aggression, 10, 'bg-error')}
                    </div>

                    <div class="trait-row">
                        <div class="trait-meta">
                            <span class="trait-name">👁️ Field of View (FOV)</span>
                            <span class="trait-val font-bold">${f.fov} Tile Radius</span>
                        </div>
                        ${renderSegmentedMeter(f.fov, 7, 'bg-tertiary')}
                    </div>

                    <div class="trait-row">
                        <div class="trait-meta">
                            <span class="trait-name">❤️ Vitality (Survival)</span>
                            <span class="trait-val font-bold text-error">${f.survival_score} Pts</span>
                        </div>
                        ${renderSegmentedMeter(f.survival_score, 12, 'bg-error')}
                    </div>
                </div>

                <button id="btn-toggle-fov" class="pixel-btn btn-timber full-width" style="margin-top: 10px;">
                    <span>👁️ TRIGGER FOV SCANNER</span>
                </button>
            </div>
        `;

        const btnToggleFov = document.getElementById('btn-toggle-fov');
        if (btnToggleFov) {
            btnToggleFov.addEventListener('click', () => {
                highlightOrganismFOV(char.id);
            });
        }
    }

    /**
     * Renders specimen roster list in the left workbench.
     */
    function renderRosterList() {
        if (!elements.specimenRosterList) return;
        elements.specimenRosterList.innerHTML = '';
        
        state.world.characters.forEach(c => {
            const item = document.createElement('div');
            item.className = 'roster-item';
            if (state.selectedOrganismId === c.id) {
                item.classList.add('active');
            }

            const spriteSrc = c.sprite ? `/static/assets/characters/${c.sprite}` : '/static/assets/characters/character_1.png';

            item.innerHTML = `
                <div class="roster-left">
                    <img src="${spriteSrc}" class="roster-thumb" alt="${c.name}">
                    <span class="roster-name">${c.name}</span>
                </div>
                <span class="roster-score">❤️ ${c.features.survival_score}</span>
            `;

            item.addEventListener('click', () => {
                selectOrganism(c.id);
            });

            elements.specimenRosterList.appendChild(item);
        });
    }

    // =========================================================================
    // FIELD JOURNAL TERMINAL STREAM
    // =========================================================================

    /**
     * Appends formatted log entry to the research journal stream.
     */
    function logEventToTerminal(ev) {
        let badgeClass = 'badge-primary';
        let badgeLabel = 'INFO';

        switch (ev.type) {
            case 'genesis':
                badgeClass = 'badge-primary';
                badgeLabel = 'GENESIS';
                break;
            case 'day_start':
            case 'day_end':
                badgeClass = 'badge-secondary';
                badgeLabel = `DAY ${ev.day || state.day}`;
                break;
            case 'fov_detect':
                badgeClass = 'badge-tertiary';
                badgeLabel = 'FOV SCAN';
                break;
            case 'dfs_init':
            case 'dfs_success':
            case 'dfs_fail':
                badgeClass = 'badge-secondary';
                badgeLabel = 'DFS SEARCH';
                break;
            case 'move':
                badgeClass = 'badge-primary';
                badgeLabel = 'NAVIGATE';
                break;
            case 'death':
                badgeClass = 'badge-error';
                badgeLabel = 'MORTALITY';
                break;
            case 'eat':
                badgeClass = 'badge-primary';
                badgeLabel = 'FEED';
                break;
            case 'reproduce':
                badgeClass = 'badge-primary';
                badgeLabel = 'REPRODUCE';
                break;
            case 'food_replenished':
                badgeClass = 'badge-tertiary';
                badgeLabel = 'ECOLOGY';
                break;
            default:
                badgeClass = 'badge-primary';
                badgeLabel = 'SYSTEM';
        }

        appendLog(badgeLabel, badgeClass, ev.message);
    }

    function appendLog(badgeLabel, badgeClass, message) {
        if (!elements.logTerminalStream) return;
        const entry = document.createElement('div');
        entry.className = 'log-entry';

        const time = new Date().toLocaleTimeString('en-US', { hour12: false });

        entry.innerHTML = `
            <span class="log-time">[${time}]</span>
            <span class="log-badge ${badgeClass}">${badgeLabel}</span>
            <span class="log-msg">${escapeHtml(message)}</span>
        `;

        elements.logTerminalStream.appendChild(entry);

        if (elements.chkAutoScroll && elements.chkAutoScroll.checked) {
            elements.logTerminalStream.scrollTop = elements.logTerminalStream.scrollHeight;
        }
    }

    // =========================================================================
    // CONTROLLER & PRESETS
    // =========================================================================

    function toggleAutoRun(forceState = null) {
        state.isAutoRunning = forceState !== null ? forceState : !state.isAutoRunning;

        if (state.isAutoRunning) {
            if (elements.btnRun) elements.btnRun.classList.add('active');
            if (elements.runBtnText) elements.runBtnText.textContent = 'RUNNING';
            updateRigStatus('AUTO RUNNING', 'running');
            executeNextDay();
        } else {
            if (elements.btnRun) elements.btnRun.classList.remove('active');
            if (elements.runBtnText) elements.runBtnText.textContent = 'RUN';
            if (state.autoRunTimeout) {
                clearTimeout(state.autoRunTimeout);
                state.autoRunTimeout = null;
            }
            updateRigStatus('ACTIVE RIG', 'ready');
        }
    }

    function setSpeed(level) {
        state.currentSpeedLevel = parseInt(level, 10);
        if (elements.rateDisplay) {
            elements.rateDisplay.textContent = state.speedLabels[state.currentSpeedLevel] || '1.0x';
        }
    }

    function updateRigStatus(statusText, dotClass) {
        if (elements.systemStatusLabel) elements.systemStatusLabel.textContent = statusText;
        if (elements.systemStatusDot) {
            elements.systemStatusDot.className = `capture-dot ${dotClass}`;
        }
    }

    function setActionMessage(msg) {
        if (elements.activeActionText) elements.activeActionText.textContent = msg;
    }

    // =========================================================================
    // EVENT LISTENERS SETUP
    // =========================================================================

    // Playback buttons
    if (elements.btnRun) {
        elements.btnRun.addEventListener('click', () => {
            toggleAutoRun(true);
        });
    }

    if (elements.btnPause) {
        elements.btnPause.addEventListener('click', () => {
            toggleAutoRun(false);
        });
    }

    if (elements.btnNext) {
        elements.btnNext.addEventListener('click', () => {
            if (!state.isAutoRunning) {
                executeNextDay();
            }
        });
    }

    // Keyboard Spacebar trigger
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
            if (!state.isAutoRunning && !state.isAnimating) {
                executeNextDay();
            }
        }
    });

    if (elements.btnApplyConfig) {
        elements.btnApplyConfig.addEventListener('click', () => {
            resetWorld();
        });
    }

    if (elements.btnClearLog) {
        elements.btnClearLog.addEventListener('click', () => {
            elements.logTerminalStream.innerHTML = '';
            appendLog('SYSTEM', 'badge-primary', 'Journal stream cleared.');
        });
    }

    if (elements.speedSlider) {
        elements.speedSlider.addEventListener('input', (e) => {
            setSpeed(e.target.value);
        });
    }

    // Camera toolbar buttons
    if (elements.btnCamAll) {
        elements.btnCamAll.addEventListener('click', () => {
            highlightOrganismFOV(null);
            setActionMessage('Camera mode: Full Biome overview active.');
        });
    }

    if (elements.btnRehighlightFov) {
        elements.btnRehighlightFov.addEventListener('click', () => {
            if (state.selectedOrganismId) {
                highlightOrganismFOV(state.selectedOrganismId);
                setActionMessage(`FOV scanner re-projected for Specimen #${state.selectedOrganismId}`);
            } else if (state.world.characters.length > 0) {
                selectOrganism(state.world.characters[0].id);
            }
        });
    }

    // Experiment Presets
    document.querySelectorAll('.preset-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            if (preset === 'standard') {
                elements.cfgGridSize.value = '10';
                elements.cfgCharacters.value = '2';
                elements.cfgFood.value = '6';
                elements.cfgTrees.value = '3';
                elements.cfgDailyFood.value = '2';
                resetWorld();
            } else if (preset === 'scarcity') {
                elements.cfgGridSize.value = '12';
                elements.cfgCharacters.value = '4';
                elements.cfgFood.value = '3';
                elements.cfgTrees.value = '2';
                elements.cfgDailyFood.value = '1';
                resetWorld();
            } else if (preset === 'jungle') {
                elements.cfgGridSize.value = '12';
                elements.cfgCharacters.value = '3';
                elements.cfgFood.value = '9';
                elements.cfgTrees.value = '7';
                elements.cfgDailyFood.value = '3';
                resetWorld();
            }
        });
    });

    // Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            setActionMessage(`Tab selected: [${tab.textContent.trim()}] active view.`);
        });
    });

    // Utility
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#039;');
    }

    // --- Genesis Bootstrapping ---
    fetchState();
    setSpeed(2);
});
