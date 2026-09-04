class Food:
    """
    Represents a consumable nutritional resource scattered across the ecosystem.
    Provides sustenance and increases the survival score of organisms.
    """
    def __init__(self, food_id, x, y, score=None, sprite="apple.png"):
        self.id = food_id
        self.x = x
        self.y = y
        self.score = score if score is not None else 5
        self.sprite = sprite

    def get_pos(self):
        return (self.x, self.y)

    def get_score(self):
        return self.score

    def to_dict(self):
        return {
            'id': self.id,
            'x': self.x,
            'y': self.y,
            'type': 'food',
            'sprite': self.sprite,
            'score': self.score
        }
