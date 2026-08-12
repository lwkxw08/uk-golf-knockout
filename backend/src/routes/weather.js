const express = require('express');
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const prisma = require('../config/prisma');

const router = express.Router();

// Get 5-day forecast for a club venue
router.get('/forecast',
  query('clubId').optional().isUUID(),
  query('postcode').optional().isString(),
  validate,
  async (req, res) => {
    try {
      let lat, lon, locationName;

      if (req.query.clubId) {
        const club = await prisma.club.findUnique({
          where: { id: req.query.clubId },
          select: { name: true, latitude: true, longitude: true, postcode: true, city: true, county: true },
        });
        if (!club) return res.status(404).json({ error: 'Club not found' });
        locationName = club.name;

        if (club.latitude && club.longitude) {
          lat = Number(club.latitude);
          lon = Number(club.longitude);
        } else if (club.postcode) {
          // Geocode from postcode using free API
          const geo = await geocodePostcode(club.postcode);
          if (geo) { lat = geo.lat; lon = geo.lon; }
        }
      } else if (req.query.postcode) {
        const geo = await geocodePostcode(req.query.postcode);
        if (geo) { lat = geo.lat; lon = geo.lon; locationName = req.query.postcode; }
      }

      if (!lat || !lon) {
        // Default to central England
        lat = 51.75;
        lon = -1.25;
        locationName = locationName || 'Central England';
      }

      // Use Open-Meteo (free, no API key needed)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=Europe/London&forecast_days=5`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather API failed');
      const data = await response.json();

      const forecast = data.daily.time.map((date, i) => ({
        date,
        tempMax: data.daily.temperature_2m_max[i],
        tempMin: data.daily.temperature_2m_min[i],
        precipitation: data.daily.precipitation_sum[i],
        windSpeed: data.daily.windspeed_10m_max[i],
        weatherCode: data.daily.weathercode[i],
        description: weatherCodeToDescription(data.daily.weathercode[i]),
        icon: weatherCodeToIcon(data.daily.weathercode[i]),
      }));

      res.json({ location: locationName, latitude: lat, longitude: lon, forecast });
    } catch (err) {
      console.error('Weather error:', err);
      res.status(500).json({ error: 'Failed to fetch weather forecast' });
    }
  }
);

async function geocodePostcode(postcode) {
  try {
    const resp = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    const data = await resp.json();
    if (data.status === 200 && data.result) {
      return { lat: data.result.latitude, lon: data.result.longitude };
    }
  } catch {}
  return null;
}

function weatherCodeToDescription(code) {
  const map = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
  };
  return map[code] || 'Unknown';
}

function weatherCodeToIcon(code) {
  if (code === 0) return 'sun';
  if (code <= 3) return 'cloud-sun';
  if (code <= 48) return 'cloud-fog';
  if (code <= 55) return 'cloud-drizzle';
  if (code <= 65) return 'cloud-rain';
  if (code <= 75) return 'snowflake';
  if (code <= 82) return 'cloud-rain';
  return 'cloud-lightning';
}

module.exports = router;
