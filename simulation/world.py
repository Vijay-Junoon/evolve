import random
from entities.character import Character
from entities.food import Food
from entities.tree import Tree

class World:
    """
    Manages the 2D habitat perimeter, spatial coordinates, entity collections,
    and cell occupation grid for the PRIMAL ecosystem.
    """
    def __init__(self, rows=10, cols=10):
        self.rows = rows
        self.cols = cols
        self.grid = [[0 for _ in range(cols)] for _ in range(rows)]
        self.characters = []
        self.food_items = []
        self.trees = []
        self._next_char_id = 1
        self._next_food_id = 101
        self._next_tree_id = 501

    def get_empty_positions(self):
        """Returns a list of all unoccupied (row, col) coordinates."""
        occupied = set()
        for c in self.characters:
            occupied.add((c.x, c.y))
        for f in self.food_items:
            occupied.add((f.x, f.y))
        for t in self.trees:
            occupied.add((t.x, t.y))

        empty = []
        for r in range(self.rows):
            for c in range(self.cols):
                if (r, c) not in occupied:
                    empty.append((r, c))
        return empty

    def spawn_characters(self, count=2):
        """Spawns specified number of organisms with randomized attributes."""
        empty_pos = self.get_empty_positions()
        random.shuffle(empty_pos)
        
        spawned = []
        for _ in range(min(count, len(empty_pos))):
            r, c = empty_pos.pop()
            char = Character(
                char_id=self._next_char_id,
                x=r,
                y=c
            )
            self._next_char_id += 1
            self.characters.append(char)
            spawned.append(char)

        self.rebuild_grid()
        return spawned

    def spawn_food(self, count=5, score_range=(2, 7)):
        """Spawns specified number of food nutrition items."""
        empty_pos = self.get_empty_positions()
        random.shuffle(empty_pos)
        
        spawned = []
        for _ in range(min(count, len(empty_pos))):
            r, c = empty_pos.pop()
            score = random.randint(score_range[0], score_range[1])
            food = Food(
                food_id=self._next_food_id,
                x=r,
                y=c,
                score=score,
                sprite="apple.png"
            )
            self._next_food_id += 1
            self.food_items.append(food)
            spawned.append(food)

        self.rebuild_grid()
        return spawned

    def spawn_trees(self, count=3):
        """Spawns environmental decoration / scenery trees."""
        empty_pos = self.get_empty_positions()
        random.shuffle(empty_pos)
        
        spawned = []
        for _ in range(min(count, len(empty_pos))):
            r, c = empty_pos.pop()
            tree = Tree(
                tree_id=self._next_tree_id,
                x=r,
                y=c,
                sprite="tree.png"
            )
            self._next_tree_id += 1
            self.trees.append(tree)
            spawned.append(tree)

        self.rebuild_grid()
        return spawned

    def rebuild_grid(self):
        """Synchronizes the 2D coordinate matrix from entity collections."""
        self.grid = [[0 for _ in range(self.cols)] for _ in range(self.rows)]
        
        # Layer 1: Trees (Grid value: 3)
        for t in self.trees:
            if 0 <= t.x < self.rows and 0 <= t.y < self.cols:
                self.grid[t.x][t.y] = 3

        # Layer 2: Food (Grid value: 2)
        for f in self.food_items:
            if 0 <= f.x < self.rows and 0 <= f.y < self.cols:
                self.grid[f.x][f.y] = 2

        # Layer 3: Characters (Grid value: 1)
        for c in self.characters:
            if 0 <= c.x < self.rows and 0 <= c.y < self.cols:
                self.grid[c.x][c.y] = 1

    def get_food_at(self, x, y):
        """Finds food item at specified coordinate, if present."""
        for food in self.food_items:
            if food.x == x and food.y == y:
                return food
        return None

    def remove_character(self, char):
        """Removes a deceased character from the ecosystem."""
        if char in self.characters:
            self.characters.remove(char)
        self.rebuild_grid()

    def remove_food(self, food):
        """Removes a consumed food item from the ecosystem."""
        if food in self.food_items:
            self.food_items.remove(food)
        self.rebuild_grid()

    def get_food_positions(self):
        """Returns set of all current food (x, y) coordinates."""
        return {(f.x, f.y) for f in self.food_items}

    def to_dict(self):
        """Returns complete serializable dictionary of the ecosystem."""
        return {
            'rows': self.rows,
            'cols': self.cols,
            'grid': self.grid,
            'characters': [c.to_dict() for c in self.characters],
            'food': [f.to_dict() for f in self.food_items],
            'trees': [t.to_dict() for t in self.trees]
        }
