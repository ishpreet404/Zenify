const CONCERNING_KEYWORDS = [
  'suicide',
  'kill myself',
  'self-harm',
  'cut myself',
  'end my life',
  'want to die',
  'harm myself',
  'self harm',
  'suicidal',
  'kill'
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