/**
 * Helper utilities for Contentstack taxonomy operations
 */

/**
 * Common taxonomy field names in Contentstack content types
 */
export const COMMON_TAXONOMY_FIELD_NAMES = [
  'taxonomies', // Primary field name for course content type
  'categories',
  'taxonomy',
  'category',
  'tags',
  'tag',
  'terms',
  'term',
];

/**
 * Detects the taxonomy field name from a course entry
 * @param entry - A course entry object
 * @returns The taxonomy field name if found, or null
 */
export function detectTaxonomyFieldName(entry: any): string | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  // Check common field names
  for (const fieldName of COMMON_TAXONOMY_FIELD_NAMES) {
    if (entry[fieldName] !== undefined) {
      // Check if it's an array (taxonomy terms are usually arrays)
      if (Array.isArray(entry[fieldName])) {
        return fieldName;
      }
      // Or if it's an object with term data
      if (entry[fieldName] && typeof entry[fieldName] === 'object') {
        return fieldName;
      }
    }
  }

  // Check for fields containing taxonomy-related keywords
  for (const key of Object.keys(entry)) {
    const lowerKey = key.toLowerCase();
    if (
      (lowerKey.includes('taxonomy') ||
        lowerKey.includes('categor') ||
        lowerKey.includes('term') ||
        lowerKey.includes('tag')) &&
      (Array.isArray(entry[key]) || (entry[key] && typeof entry[key] === 'object'))
    ) {
      return key;
    }
  }

  return null;
}

/**
 * Extracts taxonomy terms from an entry
 * @param entry - A course entry object
 * @returns Array of taxonomy term UIDs
 */
export function extractTaxonomyTerms(entry: any): string[] {
  const fieldName = detectTaxonomyFieldName(entry);
  if (!fieldName) {
    return [];
  }

  const taxonomyValue = entry[fieldName];
  
  if (Array.isArray(taxonomyValue)) {
    // If it's an array, extract UIDs
    return taxonomyValue
      .map((term: any) => {
        if (typeof term === 'string') {
          return term; // Already a UID
        }
        if (term && typeof term === 'object') {
          return term.uid || term.id || term.term_uid || null;
        }
        return null;
      })
      .filter((uid: string | null): uid is string => uid !== null);
  }

  if (taxonomyValue && typeof taxonomyValue === 'object') {
    // If it's a single object, extract its UID
    return [taxonomyValue.uid || taxonomyValue.id || taxonomyValue.term_uid].filter(
      (uid: any): uid is string => typeof uid === 'string'
    );
  }

  return [];
}

