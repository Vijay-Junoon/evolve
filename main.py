from entities.character import Character
from entities.foodItem import Food

import random
import matplotlib.pyplot as plt

fig,ax = plt.subplots()

# ! Constants
# * Perimeter Size
ROWS = 10
COLS = 10
perimeter = [[0] * COLS for i in range(ROWS)]

# * Entites
CHARACTERS = 5
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

entities = {}

def spawnCharacters():
  for character in range(CHARACTERS):
    x = random.randint(0,COLS-1)
    y = random.randint(0,ROWS-1)
    features = {'speed ⚡': random.randint(1,7),'strength 💪': random.randint(1,6), 'aggression 👹': random.randint(1,9)}
    entities[names[character]] = Character(x,y,features)
    print(f"Specimen: {names[character]}")
    entities[names[character]].displayFeatures()
    print()

def spawnFood():
  for foodItem in range(FOOD):
    x = random.randint(0,COLS-1)
    y = random.randint(0,ROWS-1)

    entities[food_names[foodItem]] = Food(x,y)

spawnCharacters()
spawnFood()
print(entities)


for entity in entities:
  x,y = entities[entity].getPos()
  ax.text(x,y,entity,fontsize=20, ha="center", va="center",fontname="Segoe UI Emoji")

ax.set_xlim(0, COLS)
ax.set_ylim(0, ROWS)

plt.show()