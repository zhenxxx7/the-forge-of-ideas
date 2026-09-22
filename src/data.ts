export type Screen = 'splash' | 'landing' | 'name' | 'prologue' | 'prepare' | 'journey' | 'generate' | 'sort' | 'connect';
export type Keyword = 'how' | 'moment' | 'tense';

export const KEYWORDS: { id: Keyword; label: string; title: string; explanation: string }[] = [
  {
    id: 'how', label: 'How', title: 'Look at the writer’s craft',
    explanation: '“How” asks you to explore the choices Bradbury makes. Look for language, imagery and the way the moment is structured. Explain what those choices do, rather than only retelling what happens.',
  },
  {
    id: 'moment', label: 'this moment', title: 'Stay close to the extract',
    explanation: '“This moment” gives your response a focus. Choose details from the extract you are studying. Use those details to support your ideas, rather than writing about the whole story.',
  },
  {
    id: 'tense', label: 'so tense', title: 'Explain the effect on the reader',
    explanation: '“So tense” asks you to explore a feeling of unease, suspense or danger. Explain how the writer’s choices make the reader feel that something might go wrong.',
  },
];

export const STAGES = [
  { id: 'prepare', name: 'Prepare', short: 'Read the question', description: 'Uncover the key words. Understand what your response needs to explore.', number: '01' },
  { id: 'generate', name: 'Generate', short: 'Gather your ideas', description: 'Explore the extract and collect your first ideas as precious ores.', number: '02' },
  { id: 'sort', name: 'Sort', short: 'Find what matters', description: 'Sort your ideas into central, supporting and irrelevant categories.', number: '03' },
  { id: 'connect', name: 'Connect', short: 'Build connections', description: 'Bring central and supporting ideas together to forge a crystal.', number: '04' },
  { id: 'elaborate', name: 'Elaborate', short: 'Give ideas depth', description: 'Develop your connections into thoughtful literary responses.', number: '05' },
  { id: 'challenge', name: 'Challenge', short: 'Face the beast', description: 'Use your developed ideas to confront the Inarticulate Beast.', number: '06' },
  { id: 'archive', name: 'Archival Hall', short: 'Remember your journey', description: 'Reflect on your learning and record the ideas you have forged.', number: '✦' },
] as const;

export function prologue(name: string) {
  return [
    { title: `Welcome, ${name}.`, text: `Hello ${name}. You have trained hard to make it this far, and now you must put all you have learned to the test. Welcome to The Forge of Ideas.`, note: 'YOUR JOURNEY BEGINS' },
    { title: 'Every great response begins with an idea.', text: 'Today, we will look at an extract from Ray Bradbury’s short story “The Veldt” and learn how to craft an essay response to a passage-based question.', note: 'THE VELDT · RAY BRADBURY' },
    { title: 'Let us give your ideas form.', text: 'We will use the Generate–Sort–Connect–Elaborate strategy. But first, a good adventurer prepares. Let’s look closely at the question before us.', note: 'PREPARE · GENERATE · SORT · CONNECT · ELABORATE' },
  ];
}
