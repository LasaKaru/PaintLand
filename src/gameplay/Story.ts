/**
 * Story mode, "The Lost Palette". Varna, the old painter of Harbour Town,
 * opened her paintbox one stormy night and the wind took her eight colours,
 * scattering one into each chapter of the sketchbook. Finish a lap of a
 * chapter (after the story has begun) to bring its colour home; each one
 * adds a page to the journal, and all eight end the story.
 */

export interface StoryPage {
  /** The chapter the colour is hiding in. */
  chapter: string;
  colour: string;
  hex: string;
  title: string;
  /** Read before you set off (a hint where the colour hides). */
  clue: string;
  /** Read once you've found it. */
  found: string;
}

export const STORY_TITLE = 'The Lost Palette';

export const STORY_INTRO =
  'On the night of the great storm, Varna — the old painter who keeps the colours of Harbour Town — opened her paintbox by the harbour to catch the lightning. The wind took every colour she had. Eight little clouds of paint blew out over the sea and settled somewhere in the sketchbook. Without them the town will fade back to pencil by the next full moon. “Bring them home,” she says, handing you her empty palette, “one from every road.”';

export const STORY_PAGES: StoryPage[] = [
  {
    chapter: 'sketch',
    colour: 'Mustard Yellow',
    hex: '#f4d23b',
    title: 'The first stroke',
    clue: 'Varna’s oldest colour always liked the tallest things. Look for it where the road climbs the yellow tower.',
    found: 'The mustard was curled up in a window box on Mustard Tower, warm as toast. It jumped into the palette the moment you passed. “That one was always the bravest,” Varna laughs. “Seven to go.”',
  },
  {
    chapter: 'serendib',
    colour: 'Lotus Pink',
    hex: '#e8559a',
    title: 'The pink by the lake',
    clue: 'A colour the shape of a flower blew toward the island in the south. The Lotus Tower would know.',
    found: 'You found the pink folded into a lotus petal at the foot of the Lotus Tower, and the kite-flyers on Galle Face swear it was the prettiest thing on the green that day.',
  },
  {
    chapter: 'wonders',
    colour: 'Temple Terracotta',
    hex: '#c96a3a',
    title: 'Old stone, warm stone',
    clue: 'Terracotta loves old stone. It will be hiding among the wonders of the world, somewhere very, very old.',
    found: 'The terracotta had tucked itself into the rose-red rock of Petra, pretending to be a very small ruin. It sighed when you found it — it had been enjoying the quiet.',
  },
  {
    chapter: 'lanterns',
    colour: 'Lantern Vermilion',
    hex: '#e0432f',
    title: 'A thousand gates',
    clue: 'Vermilion hides best among more vermilion. Try the tunnel of a thousand gates on the Lantern Roads.',
    found: 'It was the ten-thousandth gate at Fushimi Inari — the only one that blinked. Now the palette glows like a lantern at dusk.',
  },
  {
    chapter: 'postcards',
    colour: 'Nile Blue',
    hex: '#3e86c9',
    title: 'Postcard blue',
    clue: 'Blue went where the water is oldest and the sails are white. Follow the postcards to the river.',
    found: 'The blue was riding a felucca up the Nile, trailing a hand in the water. It waved you off all the way to Santorini before it agreed to come home.',
  },
  {
    chapter: 'citylights',
    colour: 'Golden Hour',
    hex: '#f08a2e',
    title: 'Evening in the city',
    clue: 'Gold only comes out at the end of the day. Look for it in the city lights, where the tower lights up at dusk.',
    found: 'You caught the gold on the Eiffel Tower, just as the lights came on. For a second all of Paris was the colour of Varna’s palette.',
  },
  {
    chapter: 'skylines',
    colour: 'Neon Violet',
    hex: '#9a5bd6',
    title: 'Under the neon',
    clue: 'Violet is a night owl. It will be dancing somewhere the signs never switch off.',
    found: 'The violet was dancing at the Shibuya crossing, bouncing from sign to sign. It took three laps of the skylines to talk it down, and it hummed all the way home.',
  },
  {
    chapter: 'islandtrip',
    colour: 'Tea Green',
    hex: '#5dbb3f',
    title: 'Home by the hills',
    clue: 'The last colour went home. Green was born in the tea hills of the island — drive the whole road trip, coast to hills to coast.',
    found: 'The green was asleep between two rows of tea above Nuwara Eliya, where it had first been mixed. A tea-picker had been keeping it warm under her basket. “It missed home,” she says.',
  },
];

export const STORY_ENDING =
  'With the last colour in the palette, Varna paints one stroke across the sky over Harbour Town, and every roof and boat and street comes back brighter than before. “A painter is only as good as her friends,” she says, and she writes your name in the corner of the sketchbook, where the artist signs. The storm is over. The roads are still there, waiting.';

export const STORY_INK = 150;
export const STORY_END_INK = 1000;

export interface StoryState {
  started: boolean;
  /** Chapters whose colour you have brought home. */
  found: string[];
  /** The finale was played: the sky over the World's End was painted. */
  finale?: boolean;
}

export function storyState(data: { story?: StoryState }): StoryState {
  return data.story ?? { started: false, found: [] };
}

/** The next page to look for (in order), or null when all are home. */
export function nextPage(s: StoryState): StoryPage | null {
  return STORY_PAGES.find((p) => !s.found.includes(p.chapter)) ?? null;
}

/**
 * A lap was finished in a chapter: if the story is on and that colour is
 * still out there, bring it home. Returns the page found (and whether that
 * finished the story), or null.
 */
export function findColour(s: StoryState, chapter: string): { page: StoryPage; done: boolean } | null {
  if (!s.started) return null;
  const page = STORY_PAGES.find((p) => p.chapter === chapter);
  if (!page || s.found.includes(chapter)) return null;
  s.found.push(chapter);
  return { page, done: s.found.length === STORY_PAGES.length };
}
