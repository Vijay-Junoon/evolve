import random

class Character:
    """
    Represents an autonomous digital organism in the PRIMAL ecosystem.
    Carries biological attributes and features that dictate sensory range,
    foraging capability, and evolutionary fitness.
    """
    def __init__(self, char_id, x, y, features=None, sprite=None, name=None):
        self.id = char_id
        self.x = x
        self.y = y
        
        # Default random features if none provided
        if features is None:
            self.features = {
                'speed': random.randint(1, 7),
                'strength': random.randint(1, 6),
                'aggression': random.randint(1, 9),
                'fov': random.randint(3, 7),
                'survival_score': random.randint(4, 8)
            }
        else:
            self.features = dict(features)
            
        # Ensure survival_score exists
        if 'survival_score' not in self.features:
            self.features['survival_score'] = random.randint(4, 8)
            
        # Visual sprite assignment
        if sprite:
            self.sprite = sprite
        else:
            sprite_choice = ((char_id - 1) % 3) + 1
            self.sprite = f"character_{sprite_choice}.png"
            
        # Organism designation / name
        self.name = name or f"Specimen #{self.id}"
        self.days_survived = 0
        self.food_eaten = 0
        self.last_action = "Spawned into ecosystem"
        self.active_path = []

    def get_pos(self):
        return (self.x, self.y)

    def get_features(self):
        return self.features

    def is_in_fov(self, target_x, target_y):
        """
        Determines whether the target coordinates lie within the specimen's Field of View.
        Uses Chebyshev proximity (maximum delta between axes <= FOV).
        """
        fov = self.features.get('fov', 3)
        return abs(self.x - target_x) <= fov and abs(self.y - target_y) <= fov

    def move_to(self, new_x, new_y):
        """Updates the physical location of the character."""
        self.x = new_x
        self.y = new_y

    def consume_food(self, food_score):
        """Consumes a food item, boosting vitality and record metrics."""
        self.features['survival_score'] = self.features.get('survival_score', 0) + food_score
        self.food_eaten += 1

    def take_step(self, energy_cost=1):
        """Reduces survival score (vitality) by energy cost per movement step."""
        current_score = self.features.get('survival_score', 0)
        self.features['survival_score'] = current_score - energy_cost
        return self.features['survival_score']

    def is_alive(self):
        """Returns True if the character's survival score is 3 or higher. If < 3, organism dies."""
        return self.features.get('survival_score', 0) >= 3

    def end_day(self):
        """Increments age/survival days."""
        self.days_survived += 1

    def to_dict(self):
        """Serializes character state for REST API consumption."""
        return {
            'id': self.id,
            'name': self.name,
            'x': self.x,
            'y': self.y,
            'type': 'character',
            'sprite': self.sprite,
            'features': {
                'speed': self.features.get('speed', 1),
                'strength': self.features.get('strength', 1),
                'aggression': self.features.get('aggression', 1),
                'fov': self.features.get('fov', 3),
                'survival_score': self.features.get('survival_score', 0)
            },
            'is_alive': self.is_alive(),
            'days_survived': self.days_survived,
            'food_eaten': self.food_eaten,
            'last_action': self.last_action
        }
