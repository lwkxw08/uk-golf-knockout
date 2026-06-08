/**
 * WHS (World Handicap System) service.
 *
 * Golfer lookup delegates to courseDataProvider (England Golf API when configured).
 * Format validation always available regardless of provider.
 */

const courseData = require('./courseDataProvider');

const WHS_ID_REGEX = /^\d{7,10}$/;

function validateWhsId(whsId) {
  return WHS_ID_REGEX.test(whsId);
}

async function lookupHandicap(whsId) {
  if (!validateWhsId(whsId)) {
    throw new Error('Invalid WHS Handicap ID format');
  }

  const result = await courseData.lookupGolfer(whsId);
  if (!result.available) {
    return {
      whsId,
      handicapIndex: null,
      clubName: null,
      lookupAvailable: false,
      message: result.message || 'Live WHS lookup pending API access. Please enter handicap manually.',
    };
  }

  return {
    whsId,
    handicapIndex: result.handicapIndex,
    firstName: result.firstName,
    lastName: result.lastName,
    clubName: result.homeClub?.name || null,
    clubRegion: result.homeClub?.region || null,
    isActive: result.isActive,
    lookupAvailable: true,
  };
}

module.exports = { validateWhsId, lookupHandicap };
