class Tree:
    """
    Represents an environmental obstacle and ecological scenery object.
    Provides natural habitat structure.
    """
    def __init__(self, tree_id, x, y, sprite="tree.png"):
        self.id = tree_id
        self.x = x
        self.y = y
        self.sprite = sprite

    def get_pos(self):
        return (self.x, self.y)

    def to_dict(self):
        return {
            'id': self.id,
            'x': self.x,
            'y': self.y,
            'type': 'tree',
            'sprite': self.sprite
        }
