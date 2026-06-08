/**
 * WHS (World Handicap System) API integration.
 *
 * The official WHS API (via England Golf / national bodies) requires a formal
 * data agreement. This service abstracts the lookup so the integration point
 * is ready when API access is granted.
 *
 * For now, we provide:
 * - Manual handicap entry with WHS ID validation format
 * - Placeholder for live API lookup
 */

const WHS_ID_REGEX = /^\d{7,10}$/;

function validateWhsId(whsId) {
  return WHS_ID_REGEX.test(whsId);
}

async function lookupHandicap(whsId) {
  // TODO: Replace with actual WHS API call when access is granted
  // The England Golf API endpoint would be something like:
  // GET https://api.englandgolf.org/v1/handicaps/{whsId}
  //
  // For now, return null to indicate lookup unavailable
  // The frontend will fall back to manual entry
  if (!validateWhsId(whsId)) {
    throw new Error('Invalid WHS Handicap ID format');
  }

  return {
    whsId,
    handicapIndex: null,
    clubName: null,
    lookupAvailable: false,
    message: 'Live WHS lookup pending API access. Please enter handicap manually.',
  };
}

module.exports = { validateWhsId, lookupHandicap };
