
class Food:
  def __init__(self,x,y,foodScore):
    self.x = x
    self.y = y
    self.foodScore = foodScore

  def getPos(self):
    return (self.x,self.y)

  def getScore(self):
    return self.foodScore