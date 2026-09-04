import math

def calculate_distance(pos1, pos2):
    """Euclidean distance between two 2D points."""
    return math.sqrt((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2)

def calculate_manhattan(pos1, pos2):
    """Manhattan distance between two 2D points."""
    return abs(pos1[0] - pos2[0]) + abs(pos1[1] - pos2[1])

def find_food_in_fov(character, available_food):
    """
    Scans for food items located within the specimen's Field of View.
    Returns visible food items sorted by proximity (closest first)
    and nutrition score as a tie-breaker.
    """
    char_x, char_y = character.get_pos()
    fov = character.features.get('fov', 3)
    visible_food = []

    for food in available_food:
        fx, fy = food.get_pos()
        if abs(char_x - fx) <= fov and abs(char_y - fy) <= fov:
            dist = calculate_manhattan((char_x, char_y), (fx, fy))
            visible_food.append({
                'food': food,
                'distance': dist,
                'score': food.get_score()
            })

    # Sort primarily by shortest distance, secondarily by highest nutrition score
    visible_food.sort(key=lambda item: (item['distance'], -item['score']))
    return visible_food


def dfs_search_food(grid, start_pos, rows, cols, food_positions=None):
    """
    Recursive Depth-First Search (DFS) algorithm to locate nourishment across the matrix
    when no sustenance is detected within the organism's immediate Field of View.
    
    Explores cardinal directions: Down, Up, Right, Left.
    Records visited coordinates and returns the located food position and exploration trail.
    """
    visited = set()
    explored_steps = []
    
    if food_positions is None:
        food_positions = set()

    found_target = [None]  # Mutable container for recursive closure

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols:
            return False
        if (r, c) in visited:
            return False
            
        visited.add((r, c))
        explored_steps.append([r, c])

        # Check if current cell contains food (grid value 2 or in food_positions)
        if (r, c) in food_positions or (0 <= r < rows and 0 <= c < cols and grid[r][c] == 2):
            found_target[0] = (r, c)
            return True

        # Cardinal exploration sequence (preserving original logic: +r, -r, +c, -c)
        directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        for dr, dc in directions:
            if dfs(r + dr, c + dc):
                return True

        return False

    start_r, start_c = start_pos
    dfs(start_r, start_c)

    return {
        'found_pos': found_target[0],
        'explored_trail': explored_steps,
        'nodes_visited_count': len(visited)
    }


def get_directional_path(start_pos, target_pos):
    """
    Calculates intermediate grid step coordinates from start to target.
    Useful for animating organism movement step by step.
    """
    path = [list(start_pos)]
    curr_x, curr_y = start_pos
    target_x, target_y = target_pos

    while (curr_x, curr_y) != (target_x, target_y):
        if curr_x < target_x:
            curr_x += 1
        elif curr_x > target_x:
            curr_x -= 1
        elif curr_y < target_y:
            curr_y += 1
        elif curr_y > target_y:
            curr_y -= 1
        path.append([curr_x, curr_y])

    return path
