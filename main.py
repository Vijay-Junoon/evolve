from entities.character import Character
from entities.foodItem import Food

import random
from matplotlib.colors import ListedColormap
import matplotlib.pyplot as plt

fig,ax = plt.subplots()

# ! Character - 1, Food - 2, Empty - 0
# ! Constants
# * Perimeter Size
ROWS = 15
COLS = 15
perimeter = [[0] * COLS for i in range(ROWS)]

# * Entites
CHARACTERS = 3
FOOD = 5

names = [
    "👽",
    "🛸",
    "🧬",
    "🔬",
    "🪐",
    "⚡",
    "🌌",
    "☄️",
    "🛰️",
    "🤖",
    "🌙",
    "🔭",
    "👾",
    "🧪",
    "💫",
    "🌠",
    "☢️",
    "🛸",
    "🧬",
    "👽",
]
food_names = [
    "🧃",
    "🍫",
    "🍎",
    "🍕",
    "🍔",
    "🍩",
    "🍪",
    "🍌",
    "🍓"
]

entities = {'Character': [], 'Food': []}

def spawnCharacters():
  for character in range(CHARACTERS):
    x = random.randint(0,COLS-1)
    y = random.randint(0,ROWS-1)
    perimeter[x][y] = 1
    features = {'speed': random.randint(1,7),'strength': random.randint(1,6), 'aggression': random.randint(1,9),'fov': random.randint(3,7),'survival_score': random.randint(1,5)}
    entities['Character'].append(Character(x,y,features))

def spawnFood():
  for foodItem in range(FOOD):
    x = random.randint(0,COLS-1)
    y = random.randint(0,ROWS-1)
    foodScore = random.randint(2,7)
    perimeter[x][y] = 2
    entities['Food'].append(Food(x,y,foodScore))

visited = set()
def searchFood(char,r,c):
  if r < 0 or r >= ROWS or c < 0 or c >= COLS or (r,c) in visited: 
    return False

  visited.add((r,c))
  if perimeter[r][c] == 2:
    perimeter[char.x][char.y] = 0
    char.x,char.y = r,c
    perimeter[r][c] = 1
    return True

  return (searchFood(char,r+1,c) or
  searchFood(char,r-1,c) or
  searchFood(char,r,c+1) or
  searchFood(char,r,c-1)
  )

spawnCharacters()
spawnFood()

colourMap = ['green', 'red', 'blue']
cmap = ListedColormap(colourMap)
plt.figure(1)
plt.imshow(perimeter, cmap=cmap)
plt.colorbar()
plt.show(block = False)
for char in entities['Character']:
  features = char.getFeatures()
  fov = features['fov']
  print(f"FOV: {fov}, survival_score: {features['survival_score']}")
  x,y = char.getPos()
  for foodItem in entities['Food']:
    food_x,food_y = foodItem.getPos()
    if perimeter[food_x][food_y] != 2:
      continue
    food_score = foodItem.getScore()
    if abs(x - food_x) <= fov and abs(y-food_y) <= fov:
      print(f"Character at {x,y} can eat food item at {food_x,food_y}")
      print(f"Character at {x,y} ate food item at {food_x,food_y}")
      features['survival_score'] += food_score
      print(f"Character survival score: {features['survival_score']}")
      perimeter[x][y] = 0
      char.x,char.y = food_x,food_y
      perimeter[food_x][food_y] = 1
      break
  else:
    print("Nothing found in FOV. Search initiated.")
    searchFood(char,x,y)
    print(f"Character at {x,y} can eat food item at {char.x,char.y}")
    print(f"Character at {x,y} ate food item at {char.x,char.y}")

plt.figure(2)
plt.imshow(perimeter, cmap=cmap)
plt.colorbar()
plt.show()

