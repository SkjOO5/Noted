/**
 * Pure Hinglish & Devanagari normalizer for Indian college messaging.
 * Converts Hindi/Hinglish date/time tokens into normalized forms suitable for parsing.
 */

// Devanagari digit mapping
const DEV_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

// Devanagari words to Hinglish / English tokens
const DEV_WORDS: [RegExp, string][] = [
  [/कल/g, 'kal'],
  [/आज/g, 'aaj'],
  [/परसों|परसो/g, 'parso'],
  [/अगले\s+सोमवार/g, 'agle somvar'],
  [/सोमवार/g, 'somvar'],
  [/मंगलवार/g, 'mangalvar'],
  [/बुधवार/g, 'budhvar'],
  [/गुरुवार|बृहस्पतिवार/g, 'guruvar'],
  [/शुक्रवार/g, 'shukravar'],
  [/शनिवार/g, 'shanivar'],
  [/रविवार|इतवार/g, 'ravivar'],
  [/सुबह/g, 'subah'],
  [/दोपहर/g, 'dopahar'],
  [/शाम/g, 'shaam'],
  [/रात/g, 'raat'],
  [/बजे/g, 'baje'],
  [/साढ़े|साढे/g, 'saadhe'],
  [/सवा/g, 'sawa'],
  [/पौने/g, 'paune'],
  [/डेढ़/g, 'dedh'],
  [/ढाई/g, 'dhai'],
  [/से/g, 'se'],
  [/तक/g, 'tak'],
  [/था|थी/g, 'tha'],
  [/क्विज़|क्विज/g, 'quiz'],
  [/परीक्षा/g, 'exam'],
  [/छुट्टी/g, 'chutti'],
];

export function convertDevanagari(text: string): string {
  let result = text;
  // Convert digits
  for (const [dev, lat] of Object.entries(DEV_DIGITS)) {
    result = result.replace(new RegExp(dev, 'g'), lat);
  }
  // Convert words
  for (const [pattern, replacement] of DEV_WORDS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export interface NormalizedTokens {
  text: string;
  hasPastTense: boolean;
  hasPostpone: boolean;
}

/**
 * Normalizes Hinglish time expressions into standard English equivalents
 */
export function normalizeHinglish(rawText: string): NormalizedTokens {
  let text = convertDevanagari(rawText);

  const hasPastTense = /\b(tha|thi|the|ho gaya|hua|kaisa gaya)\b/i.test(text);
  const hasPostpone = /\bpostpone\b/i.test(text);

  // If text has postpone pattern: "kal ka quiz postpone ho gaya, ab parso hoga"
  // We want to focus on the target date after "ab" or the final clause
  if (hasPostpone && /\bab\s+([a-z0-9\s]+)/i.test(text)) {
    // Keep full text but note postpone
  }

  return {
    text,
    hasPastTense,
    hasPostpone,
  };
}
