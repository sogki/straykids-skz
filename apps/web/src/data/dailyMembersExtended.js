/**
 * Extra member questions for ~60+ day rotation.
 */
function q({ id, questionType, prompt, displayAnswer, answers, reveals }) {
  return {
    id,
    questionType,
    prompt,
    displayAnswer,
    answers,
    reveals: [
      ...(questionType === 'vibe'
        ? []
        : [{ type: 'prompt', label: 'Question', content: prompt }]),
      ...reveals,
    ],
  }
}

export const dailyMembersExtended = [
  q({
    id: 'mv-seungmin',
    questionType: 'vibe',
    prompt: 'Which member matches this vibe?',
    displayAnswer: 'Seungmin',
    answers: ['seungmin', 'kim seungmin'],
    reveals: [
      { type: 'emoji', label: 'Vibe', content: '📚🎤🐶' },
      { type: 'hint', label: 'Hint', content: 'Main vocalist, studious image' },
      { type: 'category', label: 'Role', content: 'Vocalist' },
    ],
  }),
  q({
    id: 'qt-felix-deep',
    questionType: 'quote',
    prompt: 'Who is known for saying “Stay happy” and bright messages to STAYs?',
    displayAnswer: 'Felix',
    answers: ['felix', 'lee felix', 'yongbok'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'Australian member, deep voice' },
      { type: 'category', label: 'Vibe', content: 'Sunshine personality' },
    ],
  }),
  q({
    id: 'sr-red-lights-vocal',
    questionType: 'song_role',
    prompt: 'On “Red Lights,” which member’s haunting vocal tone is most associated with the track?',
    displayAnswer: 'Hyunjin',
    answers: ['hyunjin', 'hwang hyunjin', 'han', 'felix'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'ODDINARY unit song' },
      { type: 'category', label: 'Song', content: 'Red Lights' },
    ],
  }),
  q({
    id: 'sr-social-path-rap',
    questionType: 'song_role',
    prompt: 'Who opens “Social Path” with a standout rap verse?',
    displayAnswer: 'Han',
    answers: ['han', 'han jisung', 'jisung', 'changbin'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'ROCK-STAR album' },
      { type: 'category', label: 'Song', content: 'Social Path' },
    ],
  }),
  q({
    id: 'un-maknae-line',
    questionType: 'unit',
    prompt: 'I.N is the maknae — who is the second-youngest member?',
    displayAnswer: 'Hyunjin',
    answers: ['seungmin', 'Kim Seung-min'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'Born 2000' },
      { type: 'category', label: 'Born', content: 'I.N · 2001' },
    ],
  }),
  q({
    id: 'er-maxident-case',
    questionType: 'era',
    prompt: 'During MAXIDENT, which member stood out in the “CASE 143” crush concept?',
    displayAnswer: 'Han',
    answers: ['han', 'han jisung', 'jisung', 'seungmin', 'felix'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'MAXIDENT album — who fits the “crush” concept most in MV?' },
      { type: 'category', label: 'Era', content: 'MAXIDENT (2022)' },
    ],
  }),
  q({
    id: 'tr-born-1998',
    questionType: 'trivia',
    prompt: 'Which member was born in 1998?',
    displayAnswer: 'Changbin',
    answers: ['changbin', 'seo changbin', 'bin', 'hyunjin'],
    reveals: [
      { type: 'hint', label: 'Hint', content: '3RACHA rapper' },
      { type: 'category', label: 'Also 1998', content: 'Hyunjin' },
    ],
  }),
  q({
    id: 'tr-visual',
    questionType: 'trivia',
    prompt: 'Who is often called the “visual” of the group for striking features?',
    displayAnswer: 'Hyunjin',
    answers: ['hyunjin', 'hwang hyunjin', 'felix'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'Main dancer' },
      { type: 'emoji', label: 'Vibe', content: '✨' },
    ],
  }),
  q({
    id: 'qt-chan-producer',
    questionType: 'quote',
    prompt: 'Which member often says “STAY, I love you” on live streams?',
    displayAnswer: 'Bang Chan',
    answers: ['bang chan', 'bangchan', 'chan'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'Leader and producer' },
      { type: 'category', label: 'Show', content: 'Chan’s Room' },
    ],
  }),
  q({
    id: 'sr-waiting-us',
    questionType: 'song_role',
    prompt: '“Waiting For Us” highlights which member’s emotional vocals?',
    displayAnswer: 'Seungmin',
    answers: ['seungmin', 'kim seungmin', 'i.n', 'in'],
    reveals: [
      { type: 'hint', label: 'Hint', content: '5-STAR album b-side' },
      { type: 'category', label: 'Song', content: 'Waiting For Us' },
    ],
  }),
  q({
    id: 'mv-in-fox',
    questionType: 'vibe',
    prompt: 'Which member matches this vibe?',
    displayAnswer: 'I.N',
    answers: ['i.n', 'in', 'jeongin', 'yang jeongin'],
    reveals: [
      { type: 'emoji', label: 'Vibe', content: '🦊✨🎤' },
      { type: 'hint', label: 'Hint', content: 'Maknae, fox nickname' },
      { type: 'category', label: 'Role', content: 'Vocalist' },
    ],
  }),
  q({
    id: 'tr-changbin-dark',
    questionType: 'trivia',
    prompt: 'Who is known for “dark” rap personas on tracks like “Venom”?',
    displayAnswer: 'Changbin',
    answers: ['changbin', 'seo changbin', 'bin'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'Also part of 3RACHA' },
      { type: 'emoji', label: 'Vibe', content: '🔥' },
    ],
  }),
  q({
    id: 'er-starter-felix',
    questionType: 'era',
    prompt: 'During the “Starter” promotions, which member’s blonde hair went viral?',
    displayAnswer: 'Felix',
    answers: ['felix', 'lee felix', 'yongbok'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'GO LIVE era' },
      { type: 'category', label: 'Song', content: 'Starter' },
    ],
  }),
  q({
    id: 'un-all-rounder-han',
    questionType: 'unit',
    prompt: 'Which 3RACHA member is also praised as a main-level vocalist?',
    displayAnswer: 'Han',
    answers: ['han', 'han jisung', 'jisung'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'Rap · vocal · produce' },
      { type: 'category', label: 'Unit', content: '3RACHA' },
    ],
  }),
  q({
    id: 'sr-megaverse-rap',
    questionType: 'song_role',
    prompt: 'Who delivers a rapid-fire verse on “MEGAVERSE”?',
    displayAnswer: 'Changbin',
    answers: ['changbin', 'seo changbin', 'bin', 'han'],
    reveals: [
      { type: 'hint', label: 'Hint', content: '5-STAR era' },
      { type: 'category', label: 'Song', content: 'MEGAVERSE' },
    ],
  }),
  q({
    id: 'tr-lee-know-cat',
    questionType: 'trivia',
    prompt: 'Which member is famous for loving cats and posting cat content?',
    displayAnswer: 'Lee Know',
    answers: ['lee know', 'leeknow', 'know'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'Main dancer' },
      { type: 'emoji', label: 'Vibe', content: '🐱' },
    ],
  }),
  q({
    id: 'qt-leeknow-deadpan',
    questionType: 'quote',
    prompt: 'Who is known for deadpan humor and blunt variety show lines?',
    displayAnswer: 'Lee Know',
    answers: ['lee know', 'leeknow', 'know'],
    reveals: [
      { type: 'hint', label: 'Hint', content: 'Dance Racha' },
      { type: 'emoji', label: 'Vibe', content: '😐' },
    ],
  }),
  q({
    id: 'mv-changbin-puppy',
    questionType: 'vibe',
    prompt: 'Which member matches this vibe?',
    displayAnswer: 'Changbin',
    answers: ['changbin', 'seo changbin', 'bin'],
    reveals: [
      { type: 'emoji', label: 'Vibe', content: '💪🐶🔥' },
      { type: 'hint', label: 'Hint', content: 'Muscular rapper, puppy energy off-stage' },
      { type: 'category', label: 'Role', content: 'Rapper' },
    ],
  }),
]
