/**
 * Course Data Provider — abstraction layer for golf course data APIs.
 *
 * Supports two providers, switchable via COURSE_DATA_PROVIDER env var:
 *   - 'golfcourseapi' (default) — GolfCourseAPI.com (free tier, email signup)
 *   - 'englandgolf'             — England Golf WHS Union API (OAuth2, formal agreement)
 *
 * All providers implement the same interface:
 *   searchCourses(query)     → [{ courseId, courseName, clubName, address, city, country, lat, lng }]
 *   getCourse(courseId)       → { courseId, courseName, clubName, location, tees, holes }
 *   getCourseTees(courseId)   → [{ teeId, teeName, gender, slopeRating, courseRating, par, totalYards, holes }]
 */

const config = require('../config');

// ---------------------------------------------------------------------------
// GolfCourseAPI.com provider
// ---------------------------------------------------------------------------
const golfCourseApiProvider = {
  name: 'golfcourseapi',
  baseUrl: 'https://api.golfcourseapi.com/v1',

  _headers() {
    const key = config.golfCourseApiKey;
    if (!key) throw new Error('GOLF_COURSE_API_KEY not configured');
    return { Authorization: `Key ${key}` };
  },

  async searchCourses(query) {
    const res = await fetch(
      `${this.baseUrl}/search?search_query=${encodeURIComponent(query)}`,
      { headers: this._headers() },
    );
    if (!res.ok) throw new Error(`GolfCourseAPI search failed: ${res.status}`);
    const data = await res.json();
    return (data.courses || []).map(c => ({
      courseId: String(c.id),
      courseName: c.course_name,
      clubName: c.club_name,
      address: c.location?.address || '',
      city: c.location?.city || '',
      state: c.location?.state || '',
      country: c.location?.country || '',
      lat: c.location?.latitude || null,
      lng: c.location?.longitude || null,
    }));
  },

  async getCourse(courseId) {
    const res = await fetch(
      `${this.baseUrl}/courses/${courseId}`,
      { headers: this._headers() },
    );
    if (!res.ok) throw new Error(`GolfCourseAPI getCourse failed: ${res.status}`);
    const c = await res.json();
    const tees = [];
    for (const gender of ['male', 'female']) {
      for (const t of (c.tees?.[gender] || [])) {
        tees.push(normalizeTee(t, gender));
      }
    }
    return {
      courseId: String(c.id),
      courseName: c.course_name,
      clubName: c.club_name,
      location: {
        address: c.location?.address || '',
        city: c.location?.city || '',
        state: c.location?.state || '',
        country: c.location?.country || '',
        lat: c.location?.latitude || null,
        lng: c.location?.longitude || null,
      },
      tees,
    };
  },

  async getCourseTees(courseId) {
    const course = await this.getCourse(courseId);
    return course.tees;
  },
};

function normalizeTee(t, gender) {
  return {
    teeId: `${gender}-${t.tee_name}`,
    teeName: t.tee_name,
    gender,
    slopeRating: t.slope_rating,
    courseRating: t.course_rating,
    bogeyRating: t.bogey_rating || null,
    par: t.par_total,
    totalYards: t.total_yards,
    totalMeters: t.total_meters,
    numberOfHoles: t.number_of_holes,
    frontSlopeRating: t.front_slope_rating || null,
    frontCourseRating: t.front_course_rating || null,
    backSlopeRating: t.back_slope_rating || null,
    backCourseRating: t.back_course_rating || null,
    holes: (t.holes || []).map((h, i) => ({
      holeNumber: i + 1,
      par: h.par,
      yardage: h.yardage,
      handicap: h.handicap,
    })),
  };
}

// ---------------------------------------------------------------------------
// England Golf WHS Union API provider
// ---------------------------------------------------------------------------
const englandGolfProvider = {
  name: 'englandgolf',
  baseUrl: 'https://unionapi.whsplatform.englandgolf.org/api/eng',
  _accessToken: null,
  _tokenExpiry: null,

  async _authenticate() {
    if (this._accessToken && this._tokenExpiry && Date.now() < this._tokenExpiry) {
      return this._accessToken;
    }
    const clientToken = config.englandGolfClientToken;
    if (!clientToken) throw new Error('ENGLAND_GOLF_CLIENT_TOKEN not configured');

    const res = await fetch(`${this.baseUrl}/v1/account/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientToken }),
    });
    if (!res.ok) throw new Error(`England Golf auth failed: ${res.status}`);
    const data = await res.json();
    this._accessToken = data.accessToken;
    this._tokenExpiry = new Date(data.expiresAtUTC).getTime() - 60000;
    return this._accessToken;
  },

  async _get(path) {
    const token = await this._authenticate();
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`England Golf API error: ${res.status} on ${path}`);
    return res.json();
  },

  async searchCourses(query) {
    const data = await this._get(`/courses?searchKeyword=${encodeURIComponent(query)}`);
    return (Array.isArray(data) ? data : []).map(c => ({
      courseId: c.courseID,
      courseName: c.courseName,
      clubName: c.clubName,
      address: '',
      city: '',
      state: c.regionName || '',
      country: 'England',
      lat: c.latitude || null,
      lng: c.longitude || null,
      regionCode: c.regionCode || '',
      isWHSRated: c.isWHSRated || false,
    }));
  },

  async getCourse(courseId) {
    const c = await this._get(`/courses/${courseId}`);
    const rawTees = c.tees || [];
    const tees = rawTees.map(t => ({
      teeId: t.teeId,
      teeName: t.teeName,
      gender: t.gender,
      slopeRating: t.slopeRating,
      courseRating: t.courseRating,
      bogeyRating: null,
      par: (t.holes || []).reduce((sum, h) => sum + (h.par || 0), 0),
      totalYards: (t.holes || []).reduce((sum, h) => sum + (h.length || 0), 0),
      totalMeters: null,
      numberOfHoles: t.isNineHole ? 9 : 18,
      frontSlopeRating: null,
      frontCourseRating: null,
      backSlopeRating: null,
      backCourseRating: null,
      holes: (t.holes || []).map(h => ({
        holeNumber: h.holeNumber,
        par: h.par,
        yardage: h.length,
        handicap: h.strokeAllocation,
      })),
    }));
    return {
      courseId: c.courseID,
      courseName: c.courseName,
      clubName: c.clubName,
      location: {
        address: '',
        city: '',
        state: c.regionName || '',
        country: 'England',
        lat: c.latitude || null,
        lng: c.longitude || null,
      },
      tees,
    };
  },

  async getCourseTees(courseId) {
    const tees = await this._get(`/courses/${courseId}/tees`);
    return (Array.isArray(tees) ? tees : []).map(t => ({
      teeId: t.teeId,
      teeName: t.teeName,
      gender: t.gender,
      slopeRating: t.slopeRating,
      courseRating: t.courseRating,
      bogeyRating: null,
      par: (t.holes || []).reduce((sum, h) => sum + (h.par || 0), 0),
      totalYards: (t.holes || []).reduce((sum, h) => sum + (h.length || 0), 0),
      totalMeters: null,
      numberOfHoles: t.isNineHole ? 9 : 18,
      frontSlopeRating: null,
      frontCourseRating: null,
      backSlopeRating: null,
      backCourseRating: null,
      holes: (t.holes || []).map(h => ({
        holeNumber: h.holeNumber,
        par: h.par,
        yardage: h.length,
        handicap: h.strokeAllocation,
      })),
    }));
  },
};

// ---------------------------------------------------------------------------
// Golfer lookup (England Golf only — GolfCourseAPI doesn't have player data)
// ---------------------------------------------------------------------------
async function lookupGolfer(golferID) {
  if (config.courseDataProvider !== 'englandgolf') {
    return { available: false, message: 'Golfer lookup requires England Golf API credentials' };
  }
  const data = await englandGolfProvider._get(`/golfers/${encodeURIComponent(golferID)}`);
  return {
    available: true,
    golferUID: data.golferUID,
    firstName: data.firstName,
    lastName: data.lastName,
    golferID: data.golferID,
    dob: data.dob,
    handicapIndex: data.handicap?.handicapIndex ?? null,
    isWithdrawn: data.handicap?.isWithdrawn ?? false,
    homeClub: data.homeClub ? {
      clubID: data.homeClub.clubID,
      name: data.homeClub.name,
      region: data.homeClub.region,
    } : null,
    isActive: data.isActive,
  };
}

// ---------------------------------------------------------------------------
// Provider selector
// ---------------------------------------------------------------------------
function getProvider() {
  const name = config.courseDataProvider || 'golfcourseapi';
  if (name === 'englandgolf') return englandGolfProvider;
  return golfCourseApiProvider;
}

module.exports = {
  searchCourses: (query) => getProvider().searchCourses(query),
  getCourse: (courseId) => getProvider().getCourse(courseId),
  getCourseTees: (courseId) => getProvider().getCourseTees(courseId),
  lookupGolfer,
  getProviderName: () => getProvider().name,
};
