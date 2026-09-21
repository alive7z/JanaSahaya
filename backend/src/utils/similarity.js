export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  const inter = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return inter / union;
}

function bigrams(words) {
  const grams = new Set();
  for (let i = 0; i < words.length - 1; i += 1) {
    grams.add(`${words[i]} ${words[i + 1]}`);
  }
  return grams;
}

/**
 * Weighted text similarity in [0, 1]:
 * 60% bigram overlap, 40% unigram Jaccard.
 */
export function textSimilarity(a, b) {
  const wa = tokenize(a);
  const wb = tokenize(b);
  if (wa.length === 0 || wb.length === 0) return 0;

  const bij = jaccard([...bigrams(wa)], [...bigrams(wb)]);
  const uni = jaccard(wa, wb);
  return 0.6 * bij + 0.4 * uni;
}

export function textScore(a, b) {
  return Math.round(textSimilarity(a, b) * 25); // max 25 per scoring scheme
}