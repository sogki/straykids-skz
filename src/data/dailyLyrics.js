/**
 * Daily Lyric Guess — fill in the missing word from an SKZ lyric.
 */
import { dailyLyricsExtended } from './dailyLyricsExtended.js'

const dailyLyricsBase = [
  {
    id: 'l-maniac',
    song: 'MANIAC',
    displayAnswer: 'maniac',
    answers: ['maniac', 'maniacs'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'Feelin’ like a _____ in my head',
      },
      { type: 'hint', label: 'Hint', content: 'Unhinged person — one word' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'MANIAC (2022)' },
      { type: 'era', label: 'Era', content: 'ODDINARY' },
    ],
  },
  {
    id: 'l-gods-menu',
    song: "God's Menu",
    displayAnswer: 'cooking',
    answers: ['cooking', 'cook'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'Man I’m not _____ a crushing victory',
      },
      { type: 'hint', label: 'Hint', content: 'What chefs do in the kitchen' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: "God's Menu" },
      { type: 'year', label: 'Year', content: '2020' },
    ],
  },
  {
    id: 'l-thunderous',
    song: 'Thunderous',
    displayAnswer: 'thunder',
    answers: ['thunder', 'thunderous'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'I’m _____ — feel the rumble',
      },
      { type: 'hint', label: 'Hint', content: 'Storm sound before lightning' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'Thunderous' },
      { type: 'era', label: 'Era', content: 'NOEASY' },
    ],
  },
  {
    id: 'l-back-door',
    song: 'Back Door',
    displayAnswer: 'knock',
    answers: ['knock', 'knocking'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: '_____ knock knock — let me in',
      },
      { type: 'hint', label: 'Hint', content: 'What you do on a door' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'Back Door' },
      { type: 'year', label: 'Year', content: '2020' },
    ],
  },
  {
    id: 'l-case-143',
    song: 'CASE 143',
    displayAnswer: 'love',
    answers: ['love'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'CASE 143 — I _____ you',
      },
      { type: 'hint', label: 'Hint', content: 'Four letters — what 143 stands for' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'CASE 143' },
      { type: 'year', label: 'Year', content: '2022' },
    ],
  },
  {
    id: 'l-s-class',
    song: 'S-Class',
    displayAnswer: 'class',
    answers: ['class', 's-class', 's class'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'We the S-_____ — top tier only',
      },
      { type: 'hint', label: 'Hint', content: 'School grouping or luxury tier' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'S-Class' },
      { type: 'era', label: 'Era', content: '5-STAR' },
    ],
  },
  {
    id: 'l-lalalala',
    song: 'LALALALA',
    displayAnswer: 'lalala',
    answers: ['lalala', 'la la la', 'lalalala'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: '_____ — that’s the whole hook',
      },
      { type: 'hint', label: 'Hint', content: 'Nonsense singing syllables' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'LALALALA' },
      { type: 'era', label: 'Era', content: 'ROCK-STAR' },
    ],
  },
  {
    id: 'l-star',
    song: 'STAR',
    displayAnswer: 'star',
    answers: ['star', 'stars'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'You’re my _____ in the night sky',
      },
      { type: 'hint', label: 'Hint', content: 'Twinkles above — one word' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'STAR' },
      { type: 'year', label: 'Year', content: '2023' },
    ],
  },
  {
    id: 'l-miroh',
    song: 'MIROH',
    displayAnswer: 'miroh',
    answers: ['miroh', 'miro'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'Breaking the _____ — find the way out',
      },
      { type: 'hint', label: 'Hint', content: 'Mirror maze — song title word' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'MIROH' },
      { type: 'year', label: 'Year', content: '2019' },
    ],
  },
  {
    id: 'l-venom',
    song: 'VENOM',
    displayAnswer: 'venom',
    answers: ['venom'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'Your _____ runs through my veins',
      },
      { type: 'hint', label: 'Hint', content: 'Snake poison' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'VENOM' },
      { type: 'era', label: 'Era', content: 'MAXIDENT' },
    ],
  },
  {
    id: 'l-domino',
    song: 'DOMINO',
    displayAnswer: 'domino',
    answers: ['domino', 'dominos'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'One falls — like a _____ line',
      },
      { type: 'hint', label: 'Hint', content: 'Tiles that topple in a chain' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'DOMINO' },
      { type: 'era', label: 'Era', content: 'NOEASY' },
    ],
  },
  {
    id: 'l-charmer',
    song: 'Charmer',
    displayAnswer: 'charm',
    answers: ['charm', 'charmer'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'You’re a _____ — smooth talker',
      },
      { type: 'hint', label: 'Hint', content: 'Magnetic appeal' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'Charmer' },
      { type: 'year', label: 'Year', content: '2023' },
    ],
  },
  {
    id: 'l-chk-chk-boom',
    song: 'Chk Chk Boom',
    displayAnswer: 'boom',
    answers: ['boom', 'chk boom', 'chk chk boom'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'Chk chk _____ — feel the blast',
      },
      { type: 'hint', label: 'Hint', content: 'Explosion sound' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'Chk Chk Boom' },
      { type: 'era', label: 'Era', content: 'ATE' },
    ],
  },
  {
    id: 'l-giant',
    song: 'GIANT',
    displayAnswer: 'giant',
    answers: ['giant', 'giants'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'Stand tall like a _____',
      },
      { type: 'hint', label: 'Hint', content: 'Huge mythical humanoid' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'GIANT' },
      { type: 'year', label: 'Year', content: '2024' },
    ],
  },
  {
    id: 'l-levanter',
    song: 'Levanter',
    displayAnswer: 'wind',
    answers: ['wind', 'levanter'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'Carried by the _____ — warm breeze',
      },
      { type: 'hint', label: 'Hint', content: 'Air in motion' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'Levanter' },
      { type: 'era', label: 'Era', content: 'Clé : LEVANTER' },
    ],
  },
  {
    id: 'l-cheese',
    song: 'CHEESE',
    displayAnswer: 'cheese',
    answers: ['cheese'],
    reveals: [
      {
        type: 'lyric',
        label: 'Lyric',
        content: 'Say _____ for the camera',
      },
      { type: 'hint', label: 'Hint', content: 'Dairy product — meme song' },
      { type: 'letters', label: 'Letters', content: '' },
      { type: 'category', label: 'Song', content: 'CHEESE' },
      { type: 'year', label: 'Year', content: '2021' },
    ],
  },
]

export const dailyLyrics = [...dailyLyricsBase, ...dailyLyricsExtended]
