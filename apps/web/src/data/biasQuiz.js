/**
 * Bias Quiz — add questions and member results here.
 * Each option maps to a member id for scoring.
 */
export const members = {
  bangchan: {
    id: 'bangchan',
    name: 'Bang Chan',
    emoji: '🐺',
    color: '#7c3aed',
    description:
      'You are the leader energy! Creative, reliable, and always looking out for your crew. You probably stay up late making playlists for everyone.',
  },
  leeknow: {
    id: 'leeknow',
    name: 'Lee Know',
    emoji: '🐰',
    color: '#94a3b8',
    description:
      'Cool on the outside, soft on the inside. You have impeccable taste and a dry sense of humour that only your closest friends truly get.',
  },
  changbin: {
    id: 'changbin',
    name: 'Changbin',
    emoji: '🐷',
    color: '#ef4444',
    description:
      'Intense passion and unstoppable drive! You bring the fire to every room and your friends know you will always hype them up.',
  },
  hyunjin: {
    id: 'hyunjin',
    name: 'Hyunjin',
    emoji: '🦙',
    color: '#f472b6',
    description:
      'Artistic soul with main-character energy. You express yourself boldly and believe life is too short for boring outfits.',
  },
  han: {
    id: 'han',
    name: 'Han',
    emoji: '🐿️',
    color: '#f59e0b',
    description:
      'A bundle of talent and emotion! You feel everything deeply and channel it into something amazing — music, art, or a heartfelt rant.',
  },
  felix: {
    id: 'felix',
    name: 'Felix',
    emoji: '🐱',
    color: '#fbbf24',
    description:
      'Sunshine personified! Your laugh is contagious and you brighten every group chat. Deep down you are also surprisingly thoughtful.',
  },
  seungmin: {
    id: 'seungmin',
    name: 'Seungmin',
    emoji: '🐶',
    color: '#38bdf8',
    description:
      'Steady, sweet, and secretly competitive. You work hard without making a fuss and your loyalty is unmatched.',
  },
  in: {
    id: 'in',
    name: 'I.N',
    emoji: '🦊',
    color: '#fb923c',
    description:
      'Maknae charm with old-soul wisdom. You adapt to any situation and surprise people with how mature you can be.',
  },
}

export const quizQuestions = [
  {
    id: 1,
    question: 'Pick a weekend activity:',
    options: [
      { text: 'Produce music in my room', member: 'bangchan' },
      { text: 'Dance practice then cat videos', member: 'leeknow' },
      { text: 'Gym session with loud playlists', member: 'changbin' },
      { text: 'Sketch outfits and take photos', member: 'hyunjin' },
    ],
  },
  {
    id: 2,
    question: 'Your friend group role?',
    options: [
      { text: 'The one who plans everything', member: 'bangchan' },
      { text: 'The quiet observer with great advice', member: 'leeknow' },
      { text: 'The hype person who never quits', member: 'changbin' },
      { text: 'The creative who brings the aesthetic', member: 'hyunjin' },
    ],
  },
  {
    id: 3,
    question: 'Favourite snack vibe:',
    options: [
      { text: 'Something quick between projects', member: 'han' },
      { text: 'Sweet treats shared with friends', member: 'felix' },
      { text: 'Classic comfort food', member: 'seungmin' },
      { text: 'Trendy café dessert', member: 'in' },
    ],
  },
  {
    id: 4,
    question: 'How do you handle stress?',
    options: [
      { text: 'Write lyrics or journal', member: 'han' },
      { text: 'Laugh it off and call a friend', member: 'felix' },
      { text: 'Go for a walk and reset', member: 'seungmin' },
      { text: 'Watch something cozy alone', member: 'in' },
    ],
  },
  {
    id: 5,
    question: 'Pick a superpower:',
    options: [
      { text: 'Read everyone\'s emotions', member: 'han' },
      { text: 'Make anyone smile instantly', member: 'felix' },
      { text: 'Perfect memory', member: 'seungmin' },
      { text: 'Charm any room', member: 'in' },
    ],
  },
  {
    id: 6,
    question: 'Your fashion style:',
    options: [
      { text: 'Comfortable streetwear', member: 'bangchan' },
      { text: 'Minimal and sleek', member: 'leeknow' },
      { text: 'Bold and athletic', member: 'changbin' },
      { text: 'Statement pieces only', member: 'hyunjin' },
    ],
  },
]
