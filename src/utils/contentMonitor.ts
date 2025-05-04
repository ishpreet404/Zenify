const CONCERNING_KEYWORDS = [
  'suicide',
  'suicidal',
  'kill myself',
  'kill me',
  'end my life',
  'want to die',
  'die',
  'dying',
  'ending it all',
  'no reason to live',
  'life is not worth living',
  'worthless',
  'hopeless',
  'give up',
  'nothing to live for',
  'self-harm',
  'self harm',
  'cut myself',
  'cutting',
  'hurt myself',
  'harm myself',
  'take my life',
  'overdose',
  'can’t go on',
  'i want to disappear',
  'i don’t want to live',
  'don’t want to be here',
  'ending my life',
  'can’t take it anymore',
  'can’t do this anymore',
  'would be better off dead',
  'rather be dead',
  'maybe if i was gone'
];

export const checkContent = (text: string): { flagged: boolean; reason?: string } => {
  const lowerText = text.toLowerCase();
  
  for (const keyword of CONCERNING_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return {
        flagged: true,
        reason: `Contains concerning keyword: "${keyword}"`
      };
    }
  }
  
  return { flagged: false };
};

export default {
  checkContent
};