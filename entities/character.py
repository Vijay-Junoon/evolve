class Character:

  def __init__(self,x,y,features):
    self.x = x
    self.y = y
    self.features = features

  def getPos(self):
    return (self.x,self.y)
  
  def displayFeatures(self):
    print(f"Position 📍: {self.x,self.y}")
    for key,val in self.features.items():
      print(f"{key}: {val}")

  