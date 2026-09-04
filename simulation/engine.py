import random
from simulation.world import World
from simulation.algorithms import find_food_in_fov, dfs_search_food, get_directional_path

class SimulationEngine:
    """
    Main controller for the PRIMAL evolution simulation.
    Orchestrates daily cycles, organism behaviors, sensory scanning,
    recursive search algorithms, event logging, and telemetry analysis.
    """
    def __init__(self, config=None):
        self.config = {
            'rows': 10,
            'cols': 10,
            'characters': 2,
            'food': 6,
            'trees': 3,
            'daily_food_spawn': 2,
            **(config or {})
        }
        self.world = None
        self.day = 1
        self.status = "READY"
        self.all_events = []
        self.stats_history = []
        self.initialize()

    def initialize(self, custom_config=None):
        """Initializes a new ecosystem with the configured parameters."""
        if custom_config:
            self.config.update(custom_config)

        rows = self.config.get('rows', 10)
        cols = self.config.get('cols', 10)
        num_chars = self.config.get('characters', 2)
        num_food = self.config.get('food', 6)
        num_trees = self.config.get('trees', 3)

        self.world = World(rows=rows, cols=cols)
        self.day = 1
        self.status = "INITIALIZED"
        self.all_events = []
        self.stats_history = []

        # Spawning entities
        chars = self.world.spawn_characters(num_chars)
        food_items = self.world.spawn_food(num_food)
        trees = self.world.spawn_trees(num_trees)

        # Log genesis events
        init_event = {
            'type': 'genesis',
            'day': 1,
            'message': f"ECOSYSTEM GENESIS: Grid ({rows}x{cols}) initialized with {len(chars)} specimens, {len(food_items)} food caches, and {len(trees)} trees."
        }
        self.all_events.append(init_event)

        for c in chars:
            self.all_events.append({
                'type': 'spawn_character',
                'character_id': c.id,
                'name': c.name,
                'pos': [c.x, c.y],
                'features': c.features,
                'message': f"{c.name} spawned at ({c.x}, {c.y}) [SPD: {c.features['speed']}, STR: {c.features['strength']}, AGG: {c.features['aggression']}, FOV: {c.features['fov']}, VIT: {c.features['survival_score']}]"
            })

        for f in food_items:
            self.all_events.append({
                'type': 'spawn_food',
                'food_id': f.id,
                'pos': [f.x, f.y],
                'score': f.score,
                'message': f"Nutritional resource #{f.id} (yield: +{f.score}) spawned at ({f.x}, {f.y})"
            })

        self._record_telemetry()
        return self.get_state()

    def simulate_day(self):
        """
        Executes one full simulation day.
        Every organism performs sensory evaluation -> movement -> foraging/DFS -> nutrition consumption.
        """
        current_day = self.day
        day_events = []
        
        day_start_event = {
            'type': 'day_start',
            'day': current_day,
            'message': f"══════════ DAY {current_day:02d} SIMULATION INITIATED ══════════"
        }
        day_events.append(day_start_event)
        self.all_events.append(day_start_event)

        # Sort characters by speed (fastest organisms get priority in foraging)
        active_characters = list(self.world.characters)
        active_characters.sort(key=lambda c: c.features.get('speed', 1), reverse=True)

        for char in active_characters:
            if char not in self.world.characters:
                continue

            old_x, old_y = char.get_pos()
            fov = char.features.get('fov', 3)
            
            # Check if organism starts day with critical vitality
            if not char.is_alive():
                death_event = {
                    'type': 'death',
                    'day': current_day,
                    'character_id': char.id,
                    'character_name': char.name,
                    'death_pos': [old_x, old_y],
                    'final_vitality': char.features.get('survival_score', 0),
                    'message': f"💀 MORTALITY: {char.name} starved at ({old_x}, {old_y}) (Vitality < 3 threshold)."
                }
                day_events.append(death_event)
                self.all_events.append(death_event)
                self.world.remove_character(char)
                continue

            # Step 1: Scan Field of View
            visible_food = find_food_in_fov(char, self.world.food_items)
            
            if visible_food:
                # Food detected inside FOV
                best_target = visible_food[0]['food']
                target_x, target_y = best_target.get_pos()
                
                detect_event = {
                    'type': 'fov_detect',
                    'day': current_day,
                    'character_id': char.id,
                    'character_name': char.name,
                    'char_pos': [old_x, old_y],
                    'target_food_id': best_target.id,
                    'target_food_pos': [target_x, target_y],
                    'fov': fov,
                    'message': f"🎯 {char.name} detected food at ({target_x}, {target_y}) within FOV radius {fov}."
                }
                day_events.append(detect_event)
                self.all_events.append(detect_event)

                # Move step-by-step to target with -1 vitality depletion per step
                planned_path = get_directional_path((old_x, old_y), (target_x, target_y))
                actual_path = [[old_x, old_y]]
                died_in_transit = False
                death_pos = None

                for step_coord in planned_path[1:]:
                    step_x, step_y = step_coord
                    char.move_to(step_x, step_y)
                    actual_path.append([step_x, step_y])

                    new_vitality = char.take_step(1)
                    if new_vitality < 3:
                        died_in_transit = True
                        death_pos = [step_x, step_y]
                        break

                move_event = {
                    'type': 'move',
                    'day': current_day,
                    'character_id': char.id,
                    'character_name': char.name,
                    'from': [old_x, old_y],
                    'to': [char.x, char.y],
                    'path': actual_path,
                    'method': 'fov_navigation',
                    'died_in_transit': died_in_transit,
                    'final_vitality': char.features['survival_score'],
                    'message': f"🐾 {char.name} moved from ({old_x}, {old_y}) to ({char.x}, {char.y}) [Vitality: {char.features['survival_score']}]."
                }
                day_events.append(move_event)
                self.all_events.append(move_event)

                if died_in_transit:
                    death_event = {
                        'type': 'death',
                        'day': current_day,
                        'character_id': char.id,
                        'character_name': char.name,
                        'death_pos': death_pos,
                        'final_vitality': char.features['survival_score'],
                        'message': f"💀 MORTALITY: {char.name} collapsed from exhaustion at ({death_pos[0]}, {death_pos[1]})! Vitality dropped to {char.features['survival_score']} (< 3 threshold)."
                    }
                    day_events.append(death_event)
                    self.all_events.append(death_event)
                    self.world.remove_character(char)
                    continue

                # Survived transit -> Consume food
                food_score = best_target.get_score()
                char.consume_food(food_score)
                char.last_action = f"Foraged in FOV (+{food_score} Vitality)"
                self.world.remove_food(best_target)

                eat_event = {
                    'type': 'eat',
                    'day': current_day,
                    'character_id': char.id,
                    'character_name': char.name,
                    'food_id': best_target.id,
                    'food_score': food_score,
                    'new_survival_score': char.features['survival_score'],
                    'position': [target_x, target_y],
                    'message': f"🍎 {char.name} consumed food #{best_target.id}! Vitality rose to {char.features['survival_score']} (+{food_score})."
                }
                day_events.append(eat_event)
                self.all_events.append(eat_event)

            else:
                # Step 2: No food in FOV -> Fallback recursive DFS search
                dfs_init_event = {
                    'type': 'dfs_init',
                    'day': current_day,
                    'character_id': char.id,
                    'character_name': char.name,
                    'char_pos': [old_x, old_y],
                    'fov': fov,
                    'message': f"🔍 Nothing in FOV ({fov}). {char.name} initiated recursive DFS exploration."
                }
                day_events.append(dfs_init_event)
                self.all_events.append(dfs_init_event)

                food_coords = self.world.get_food_positions()
                dfs_res = dfs_search_food(
                    self.world.grid,
                    (old_x, old_y),
                    self.world.rows,
                    self.world.cols,
                    food_positions=food_coords
                )

                found_pos = dfs_res.get('found_pos')
                explored_trail = dfs_res.get('explored_trail', [])
                nodes_visited = dfs_res.get('nodes_visited_count', 0)

                if found_pos:
                    fx, fy = found_pos
                    target_food = self.world.get_food_at(fx, fy)

                    dfs_success_event = {
                        'type': 'dfs_success',
                        'day': current_day,
                        'character_id': char.id,
                        'character_name': char.name,
                        'found_pos': [fx, fy],
                        'explored_trail': explored_trail,
                        'nodes_visited': nodes_visited,
                        'message': f"✨ DFS succeeded! {char.name} located sustenance at ({fx}, {fy}) after exploring {nodes_visited} cells."
                    }
                    day_events.append(dfs_success_event)
                    self.all_events.append(dfs_success_event)

                    if target_food:
                        planned_path = get_directional_path((old_x, old_y), (fx, fy))
                        actual_path = [[old_x, old_y]]
                        died_in_transit = False
                        death_pos = None

                        for step_coord in planned_path[1:]:
                            step_x, step_y = step_coord
                            char.move_to(step_x, step_y)
                            actual_path.append([step_x, step_y])

                            new_vitality = char.take_step(1)
                            if new_vitality < 3:
                                died_in_transit = True
                                death_pos = [step_x, step_y]
                                break

                        move_event = {
                            'type': 'move',
                            'day': current_day,
                            'character_id': char.id,
                            'character_name': char.name,
                            'from': [old_x, old_y],
                            'to': [char.x, char.y],
                            'path': actual_path,
                            'method': 'dfs_exploration',
                            'died_in_transit': died_in_transit,
                            'final_vitality': char.features['survival_score'],
                            'message': f"🐾 {char.name} navigated along DFS path to ({char.x}, {char.y}) [Vitality: {char.features['survival_score']}]."
                        }
                        day_events.append(move_event)
                        self.all_events.append(move_event)

                        if died_in_transit:
                            death_event = {
                                'type': 'death',
                                'day': current_day,
                                'character_id': char.id,
                                'character_name': char.name,
                                'death_pos': death_pos,
                                'final_vitality': char.features['survival_score'],
                                'message': f"💀 MORTALITY: {char.name} collapsed from exhaustion at ({death_pos[0]}, {death_pos[1]})! Vitality dropped to {char.features['survival_score']} (< 3 threshold)."
                            }
                            day_events.append(death_event)
                            self.all_events.append(death_event)
                            self.world.remove_character(char)
                            continue

                        # Survived -> Consume discovered food
                        food_score = target_food.get_score()
                        char.consume_food(food_score)
                        char.last_action = f"Located via DFS (+{food_score} Vitality)"
                        self.world.remove_food(target_food)

                        eat_event = {
                            'type': 'eat',
                            'day': current_day,
                            'character_id': char.id,
                            'character_name': char.name,
                            'food_id': target_food.id,
                            'food_score': food_score,
                            'new_survival_score': char.features['survival_score'],
                            'position': [fx, fy],
                            'message': f"🍎 {char.name} consumed discovered food! Vitality rose to {char.features['survival_score']} (+{food_score})."
                        }
                        day_events.append(eat_event)
                        self.all_events.append(eat_event)
                else:
                    dfs_fail_event = {
                        'type': 'dfs_fail',
                        'day': current_day,
                        'character_id': char.id,
                        'character_name': char.name,
                        'explored_trail': explored_trail,
                        'nodes_visited': nodes_visited,
                        'message': f"⚠️ DFS search concluded. No accessible food found on grid for {char.name}."
                    }
                    day_events.append(dfs_fail_event)
                    self.all_events.append(dfs_fail_event)
                    char.last_action = "Searched grid (No food available)"
                    
                    # Deduct 1 metabolism vitality for exhaustive search
                    new_vitality = char.take_step(1)
                    if new_vitality < 3:
                        death_event = {
                            'type': 'death',
                            'day': current_day,
                            'character_id': char.id,
                            'character_name': char.name,
                            'death_pos': [old_x, old_y],
                            'final_vitality': char.features['survival_score'],
                            'message': f"💀 MORTALITY: {char.name} collapsed from exhaustion after failed foraging (Vitality: {char.features['survival_score']} < 3)."
                        }
                        day_events.append(death_event)
                        self.all_events.append(death_event)
                        self.world.remove_character(char)
                        continue

            # Age specimen
            char.end_day()

        # Step 3: Ecosystem Resource Replenishment
        daily_spawn = self.config.get('daily_food_spawn', 2)
        if daily_spawn > 0 and len(self.world.food_items) < 8:
            newly_spawned = self.world.spawn_food(daily_spawn)
            if newly_spawned:
                replenish_event = {
                    'type': 'food_replenished',
                    'day': current_day,
                    'count': len(newly_spawned),
                    'message': f"🌱 Environmental regeneration: {len(newly_spawned)} new food items spawned."
                }
                day_events.append(replenish_event)
                self.all_events.append(replenish_event)

        self.world.rebuild_grid()

        # Step 4: Daily wrap-up and telemetry
        day_end_event = {
            'type': 'day_end',
            'day': current_day,
            'message': f"────────── DAY {current_day:02d} CONCLUDED ──────────"
        }
        day_events.append(day_end_event)
        self.all_events.append(day_end_event)

        telemetry = self._record_telemetry()
        self.day += 1

        return {
            'status': 'success',
            'completed_day': current_day,
            'next_day': self.day,
            'events': day_events,
            'telemetry': telemetry,
            'state': self.get_state()
        }

    def _record_telemetry(self):
        """Computes live telemetry metrics across the ecosystem."""
        chars = self.world.characters
        food = self.world.food_items
        
        population = len(chars)
        scores = [c.features.get('survival_score', 0) for c in chars]
        avg_score = round(sum(scores) / population, 2) if population > 0 else 0
        max_score = max(scores) if scores else 0
        
        top_char = None
        if chars:
            best_c = max(chars, key=lambda c: c.features.get('survival_score', 0))
            top_char = {
                'id': best_c.id,
                'name': best_c.name,
                'score': best_c.features.get('survival_score', 0),
                'sprite': best_c.sprite
            }

        telemetry = {
            'day': self.day,
            'population': population,
            'food_remaining': len(food),
            'trees_count': len(self.world.trees),
            'avg_survival_score': avg_score,
            'max_survival_score': max_score,
            'top_organism': top_char
        }
        
        self.stats_history.append(telemetry)
        return telemetry

    def reset(self, config=None):
        """Resets ecosystem state with optional new configurations."""
        return self.initialize(config)

    def get_state(self):
        """Returns complete serializable world snapshot."""
        scores = [c.features.get('survival_score', 0) for c in self.world.characters]
        population = len(self.world.characters)
        avg_score = round(sum(scores) / population, 2) if population > 0 else 0
        max_score = max(scores) if scores else 0

        return {
            'day': self.day,
            'status': self.status,
            'config': self.config,
            'world': self.world.to_dict(),
            'telemetry': {
                'day': self.day,
                'population': population,
                'food_remaining': len(self.world.food_items),
                'trees_count': len(self.world.trees),
                'avg_survival_score': avg_score,
                'max_survival_score': max_score
            },
            'recent_events': self.all_events[-30:]
        }
