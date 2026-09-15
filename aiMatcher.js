// Multi-Factor AI Matching Engine for FindBack AI
// Transparent scoring model:
// 40% Description & Keyword Similarity
// 25% Category Alignment
// 20% Campus Location Proximity
// 10% Date/Temporal Proximity
// 5% Visual & Profile Similarity

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'near', 'by', 'with', 'and', 'or', 'of', 'to',
  'is', 'it', 'my', 'has', 'was', 'for', 'this', 'that', 'from', 'i', 'lost', 'found',
  'some', 'item', 'please', 'help', 'there', 'left', 'inside', 'outside', 'very'
]);

// Extract meaningful normalized tokens
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

// Calculate Jaccard + Overlap similarity on tokens
function calculateTextSimilarity(textA, textB, tagsA = [], tagsB = []) {
  const tokensA = new Set([...tokenize(textA), ...(tagsA.map(t => t.toLowerCase()))]);
  const tokensB = new Set([...tokenize(textB), ...(tagsB.map(t => t.toLowerCase()))]);

  if (tokensA.size === 0 || tokensB.size === 0) return 30;

  let intersection = 0;
  tokensA.forEach(t => {
    // Exact or substring match
    for (const b of tokensB) {
      if (t === b || (t.length > 3 && b.includes(t)) || (b.length > 3 && t.includes(b))) {
        intersection++;
        break;
      }
    }
  });

  const union = new Set([...tokensA, ...tokensB]).size;
  const jaccard = intersection / Math.max(1, union);
  const overlapRatio = intersection / Math.min(tokensA.size, tokensB.size);

  // Blend jaccard and overlap so specific key words (e.g. "airpods navy") yield high confidence
  const score = Math.min(100, Math.round((jaccard * 0.4 + overlapRatio * 0.6) * 100));
  return Math.max(15, score);
}

// Category matching
function calculateCategorySimilarity(catA, catB) {
  if (!catA || !catB) return 50;
  if (catA.toLowerCase() === catB.toLowerCase()) return 100;

  // Partial/related categories
  const relatedGroups = [
    ['electronics', 'accessories'],
    ['bags', 'accessories'],
    ['wallet', 'id card', 'accessories'],
    ['books', 'other']
  ];

  const cA = catA.toLowerCase();
  const cB = catB.toLowerCase();

  for (const group of relatedGroups) {
    if (group.includes(cA) && group.includes(cB)) {
      return 60;
    }
  }

  return 10;
}

// Location similarity with campus zones
function calculateLocationSimilarity(locA, locB) {
  if (!locA || !locB) return 40;
  if (locA.toLowerCase() === locB.toLowerCase()) return 100;

  // Check if they share the primary building name
  const primeA = locA.split('(')[0].trim().toLowerCase();
  const primeB = locB.split('(')[0].trim().toLowerCase();

  if (primeA === primeB || primeA.includes(primeB) || primeB.includes(primeA)) {
    return 90;
  }

  // Same general zone or block
  const isLibrary = locA.includes('Library') && locB.includes('Library');
  const isCanteen = (locA.includes('Canteen') || locA.includes('Food')) && (locB.includes('Canteen') || locB.includes('Food'));
  const isTech = (locA.includes('Tech') || locA.includes('Science')) && (locB.includes('Tech') || locB.includes('Science'));

  if (isLibrary || isCanteen || isTech) return 85;

  return 35;
}

// Date proximity calculation
function calculateDateSimilarity(dateLostStr, dateFoundStr) {
  if (!dateLostStr || !dateFoundStr) return 70;
  try {
    const dLost = new Date(dateLostStr).getTime();
    const dFound = new Date(dateFoundStr).getTime();
    const diffDays = Math.abs(dFound - dLost) / (1000 * 60 * 60 * 24);

    if (diffDays <= 0.5) return 98;
    if (diffDays <= 1) return 92;
    if (diffDays <= 2) return 85;
    if (diffDays <= 5) return 70;
    if (diffDays <= 10) return 50;
    return 30;
  } catch {
    return 60;
  }
}

// Visual similarity placeholder / feature hash
function calculateVisualSimilarity(itemA, itemB) {
  // Uses color/tag keywords present in descriptions and tags
  const visualKeys = ['black', 'blue', 'white', 'red', 'green', 'leather', 'navy', 'metal', 'hardcover', 'silicone', 'silver', 'matte'];
  const textA = `${itemA.title} ${itemA.description} ${(itemA.tags || []).join(' ')}`.toLowerCase();
  const textB = `${itemB.title} ${itemB.description} ${(itemB.tags || []).join(' ')}`.toLowerCase();

  let matches = 0;
  let checks = 0;

  visualKeys.forEach(key => {
    const inA = textA.includes(key);
    const inB = textB.includes(key);
    if (inA || inB) {
      checks++;
      if (inA && inB) matches++;
    }
  });

  if (checks === 0) return 75;
  const score = Math.round((matches / checks) * 100);
  return Math.max(50, Math.min(95, score + 20));
}

/**
 * Main AI Matching function: Compares a query/lost item with a candidate found item
 */
export function calculateMatchScore(lostItem, foundItem) {
  const descScore = calculateTextSimilarity(
    lostItem.title + ' ' + (lostItem.description || ''),
    foundItem.title + ' ' + (foundItem.description || ''),
    lostItem.tags,
    foundItem.tags
  );

  const catScore = calculateCategorySimilarity(lostItem.category, foundItem.category);
  const locScore = calculateLocationSimilarity(lostItem.location, foundItem.location);
  const dateScore = calculateDateSimilarity(lostItem.date, foundItem.date);
  const visualScore = calculateVisualSimilarity(lostItem, foundItem);

  // Weighted Total Formula: 40% Desc + 25% Category + 20% Loc + 10% Date + 5% Visual
  const totalScore = Math.round(
    descScore * 0.40 +
    catScore * 0.25 +
    locScore * 0.20 +
    dateScore * 0.10 +
    visualScore * 0.05
  );

  // Confidence Tier
  let tier = 'low';
  let badgeColor = 'amber';
  let tierLabel = 'Possible Match';

  if (totalScore >= 80) {
    tier = 'high';
    badgeColor = 'emerald';
    tierLabel = 'High Confidence Match';
  } else if (totalScore >= 60) {
    tier = 'moderate';
    badgeColor = 'indigo';
    tierLabel = 'Moderate Match';
  }

  // Explainability insights
  const insights = [];
  if (catScore >= 90) insights.push(`Same Category (${lostItem.category})`);
  if (locScore >= 80) insights.push(`Near Same Campus Location (${foundItem.location.split('(')[0].trim()})`);
  if (descScore >= 75) insights.push('High keyword & attribute overlap');
  if (dateScore >= 85) insights.push('Discovered within 24–48 hours of reported time');
  if (visualScore >= 75) insights.push('Color & material match');

  return {
    totalScore: Math.min(99, Math.max(12, totalScore)),
    tier,
    tierLabel,
    badgeColor,
    breakdown: {
      description: descScore,
      category: catScore,
      location: locScore,
      date: dateScore,
      visual: visualScore,
    },
    insights,
  };
}

/**
 * Finds and ranks all matches in the found repository for a given lost item or query
 */
export function findBestMatches(targetItem, candidateItems) {
  return candidateItems
    .map(candidate => {
      const matchData = calculateMatchScore(targetItem, candidate);
      return {
        item: candidate,
        ...matchData,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}
