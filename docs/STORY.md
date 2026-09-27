# The story of Inkroads: *The Lost Palette*

This is the story players follow from the first menu to the credits. Every line
quoted here is the text the game shows. The words live in
`src/gameplay/Story.ts` (the colours, clues and ending) and
`src/gameplay/Campaign.ts` (the mission list). Varna's lines and the credits
are in `src/core/locales/en.ts`, under the `camp.*`, `story.*` and `end.*` keys.
If you change a line in the code, update this file too.

---

## In one paragraph

On the night of a great storm, Varna, the old painter who keeps the colours of
Harbour Town, opens her paintbox to catch the lightning. The wind takes all
eight of her colours and scatters them across the sketchbook, one into each
road. Unless they come home before the next full moon, the town fades back to
pencil. The player drives the roads of the sketchbook to find the colours
(from London to Colombo, from the Nile to the neon of Tokyo) and brings them
home one by one. With all eight back, the player takes the palette to the
World's End, a quiet island under the Milky Way at the end of the sketchbook,
and paints the sky. Varna signs the player's name in the corner of the
sketchbook, where the artist signs.

**Genre and tone:** a gentle road-trip fairy tale. No villains, no combat in the
story, nobody gets hurt. The drama is the fading town, and the reward is
colour coming back. It fits the calm, watercolour feel of the game and works
for all ages.

---

## The characters

| Who | Role |
|---|---|
| **You** | A traveller with a little rover and Varna's empty palette. You never speak; the world answers you. |
| **Varna** | The old painter of Harbour Town. White hair in a bun, a lavender dress, a yellow scarf, always at her easel by the harbour (the 🎨 ring). Warm, a little funny, proud of her colours as if they were children. |
| **The eight colours** | Each has a personality: the brave mustard, the flower-shaped pink, the quiet terracotta, the blinking vermilion, the wandering blue, the shy gold, the dancing violet, and the homesick green. |
| **People on the road** | The mission-givers of every chapter (Chef Amara, Aunty Mala, Guard Mei, Surfer Kai and many more), and the tea-picker who keeps the last colour warm. |

---

## How the story is played

- **Prologue.** Walk up to Varna by the harbour in Harbour Town and press **E**.
- **Missions 1–8.** Each colour hides in one chapter. **Finish a lap of that
  chapter** to bring its colour home. After the prologue, the eight can be done
  in **any order**.
- **Finale.** With all eight home, go to the World's End (the ring at the end of
  Harbour Town's quay), walk to the bench at the Edge of the World and **sit
  down (E)**.
- **Menu → Story** shows the journey as a map (done / next / open / locked), a
  progress bar, and a journal page for each colour you've found.
- Talk to Varna any time for a hint about the next colour.
- **Checkpoints** save at the start of every district, on arriving in a town,
  and every 30 s in free roam, so **Continue** on the main menu goes back to
  where you left off.
- **Rewards:** 150 ink per colour; the last colour adds a 1000-ink bonus; the
  finale gives 500 more.

---

## Prologue: *The Storm*

> *Varna, the old painter of Harbour Town, has lost her colours in the storm.
> Find her by the harbour and hear what happened.*

What Varna tells you:

> On the night of the great storm, Varna — the old painter who keeps the
> colours of Harbour Town — opened her paintbox by the harbour to catch the
> lightning. The wind took every colour she had. Eight little clouds of paint
> blew out over the sea and settled somewhere in the sketchbook. Without them
> the town will fade back to pencil by the next full moon. "Bring them home,"
> she says, handing you her empty palette, "one from every road."

---

## The eight missions

Each mission has a **clue** (shown before you set off, and by Varna) and a
**found** page (the journal entry when the colour comes home).

### Mission 1 · The Sketch: *The first stroke*: Mustard Yellow
- **Clue:** Varna's oldest colour always liked the tallest things. Look for it
  where the road climbs the yellow tower.
- **Found:** The mustard was curled up in a window box on Mustard Tower, warm as
  toast. It jumped into the palette the moment you passed. "That one was always
  the bravest," Varna laughs. "Seven to go."

### Mission 2 · Serendib: *The pink by the lake*: Lotus Pink
- **Clue:** A colour the shape of a flower blew toward the island in the south.
  The Lotus Tower would know.
- **Found:** You found the pink folded into a lotus petal at the foot of the
  Lotus Tower, and the kite-flyers on Galle Face swear it was the prettiest
  thing on the green that day.

### Mission 3 · Wonders of the Sketchbook: *Old stone, warm stone*: Temple Terracotta
- **Clue:** Terracotta loves old stone. It will be hiding among the wonders of
  the world, somewhere very, very old.
- **Found:** The terracotta had tucked itself into the rose-red rock of Petra,
  pretending to be a very small ruin. It sighed when you found it — it had been
  enjoying the quiet.

### Mission 4 · Lantern Roads: *A thousand gates*: Lantern Vermilion
- **Clue:** Vermilion hides best among more vermilion. Try the tunnel of a
  thousand gates on the Lantern Roads.
- **Found:** It was the ten-thousandth gate at Fushimi Inari — the only one that
  blinked. Now the palette glows like a lantern at dusk.

### Mission 5 · Postcards: *Postcard blue*: Nile Blue
- **Clue:** Blue went where the water is oldest and the sails are white. Follow
  the postcards to the river.
- **Found:** The blue was riding a felucca up the Nile, trailing a hand in the
  water. It waved you off all the way to Santorini before it agreed to come
  home.

### Mission 6 · City Lights: *Evening in the city*: Golden Hour
- **Clue:** Gold only comes out at the end of the day. Look for it in the city
  lights, where the tower lights up at dusk.
- **Found:** You caught the gold on the Eiffel Tower, just as the lights came on.
  For a second all of Paris was the colour of Varna's palette.

### Mission 7 · Skylines: *Under the neon*: Neon Violet
- **Clue:** Violet is a night owl. It will be dancing somewhere the signs never
  switch off.
- **Found:** The violet was dancing at the Shibuya crossing, bouncing from sign
  to sign. It took three laps of the skylines to talk it down, and it hummed
  all the way home.

### Mission 8 · Island Road Trip: *Home by the hills*: Tea Green
- **Clue:** The last colour went home. Green was born in the tea hills of the
  island — drive the whole road trip, coast to hills to coast.
- **Found:** The green was asleep between two rows of tea above Nuwara Eliya,
  where it had first been mixed. A tea-picker had been keeping it warm under her
  basket. "It missed home," she says.

The last colour is found in Sri Lanka's tea hills, where it was first mixed,
so the journey ends where the palette began.

### What Varna says along the way
- With colours still missing: *"You have brought {n} of 8 colours home. The next
  one is waiting:"* followed by the next clue.
- With all eight home: *"Every colour is home! Take the palette to the World's
  End (the ring at the end of the quay), sit at the Edge of the World, and we'll
  paint the sky."*
- After the ending: *"The town is brighter than ever. Thank you, friend. The
  roads are still there, waiting for you."*

---

## Finale: *The Last Page*

> *All eight colours are home. Take the palette to the Edge of the World, sit
> down, and paint the sky.*

The World's End is a floating island at the edge of the sketchbook: a lake
mirroring snowy mountains, a wildflower meadow, lantern-lit woods, a river
pouring off the edge into the stars, and a sky full of the Milky Way. There are
no shops, no traffic and no missions there.

When you sit on the bench at the Edge of the World, 24 fireworks go up in the
eight colours. Then the last lines appear one by one in the cinematic bars:

> With the last colour in the palette, Varna paints one stroke across the sky
> over Harbour Town, and every roof and boat and street comes back brighter than
> before. "A painter is only as good as her friends," she says, and she writes
> your name in the corner of the sketchbook, where the artist signs. The storm
> is over. The roads are still there, waiting.

### The End
The card shows **The End**, the eight colours as dots, and the rolling credits:

1. *The Lost Palette*
2. Inkroads
3. HelaO2
4. Roads, towns and music painted by the Inkroads team
5. Varna, the painter of Harbour Town
6. And you, who brought the colours home
7. Thank you for playing

Then a single button: **Keep painting**, with *"The whole world is still yours
to explore."*

If you leave the World's End before the credits finish, the ending plays again
the next time you sit at the edge. The reward is only given once.

---

## After the end

The story ends, but the game doesn't. Everything stays open: the five towns,
free-roam mission chains, time trials, paper-plane courses, paint battles,
photo hunts, festivals, your own house, murals and the road studio. The journal
keeps every page, and **Menu → Story** lets you replay any mission.

---

## Notes for the team

- **The 48 chapter missions** (six per chapter) and the **24 open-world
  missions** are side stories. Each giver has a one-line request, such as
  *"The ovens are hot and the Tower café is waiting!"*. They aren't part of the
  main story, so any of them can be changed freely.
- **Translations:** the menus, Varna's hints, the credits and the story screen
  are in all 24 languages. **The story text itself (the prologue, the clues,
  the found pages, the ending) and the mission requests are still English
  only.** Translate them before launching in other languages; they're the
  most-read text in the game.
- **Ideas if you want more story later** (not built):
  - Varna's town slowly regaining colour as colours come home. The technology
    exists in the City's "Colour the City" wash.
  - A short spoken or hummed line for Varna at the prologue and the end.
  - An epilogue postcard from each colour in the mailbox after the credits.
