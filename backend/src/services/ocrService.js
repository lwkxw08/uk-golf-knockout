/**
 * Scorecard OCR.
 *
 * Reads a photographed paper scorecard with a vision model and returns
 * hole-by-hole gross scores for both players, so digital entry becomes a
 * check-and-confirm step rather than 36 manual taps.
 *
 * Returns { available: false } when no provider key is configured, so the
 * upload flow degrades to manual entry instead of failing.
 */

const config = require('../config');

const SYSTEM_PROMPT = `You read photographs of UK golf scorecards and return structured data.
Return ONLY JSON matching this shape:
{
  "holes": [{ "hole": 1, "par": 4, "strokeIndex": 7, "playerA": 5, "playerB": 4 }],
  "playerALabel": "name written above the first score column or null",
  "playerBLabel": "name written above the second score column or null",
  "courseName": "string or null",
  "datePlayed": "YYYY-MM-DD or null",
  "confidence": 0.0
}
Rules:
- One entry per hole you can read, hole numbers 1-18, ascending.
- Use null for any figure that is illegible or blank. Never guess a score.
- Ignore running totals, OUT/IN and gross/nett summary boxes.
- confidence is your overall confidence in the transcription, 0 to 1.`;

function isConfigured() {
  return Boolean(config.ocr.apiKey);
}

function sanitiseHole(raw) {
  const num = (value, min, max) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
  };

  const hole = num(raw.hole, 1, 18);
  if (hole === null) return null;

  return {
    hole,
    par: num(raw.par, 3, 6),
    strokeIndex: num(raw.strokeIndex, 1, 18),
    playerA: num(raw.playerA, 1, 15),
    playerB: num(raw.playerB, 1, 15),
  };
}

/**
 * @param {Buffer} imageBuffer scorecard photo
 * @param {string} mimeType image mime type
 * @returns {Promise<{available: boolean, holes?: Array, confidence?: number, message?: string}>}
 */
async function readScorecard(imageBuffer, mimeType = 'image/jpeg') {
  if (!isConfigured()) {
    return { available: false, message: 'Scorecard scanning is not configured — enter scores manually.' };
  }

  const dataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.ocr.apiKey}`,
    },
    body: JSON.stringify({
      model: config.ocr.model,
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe this scorecard.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Vision provider returned ${response.status}: ${detail.slice(0, 200)}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('Vision provider returned no content');

  const parsed = JSON.parse(content);
  const holes = Array.isArray(parsed.holes)
    ? parsed.holes.map(sanitiseHole).filter(Boolean).sort((a, b) => a.hole - b.hole)
    : [];

  return {
    available: true,
    holes,
    playerALabel: parsed.playerALabel || null,
    playerBLabel: parsed.playerBLabel || null,
    courseName: parsed.courseName || null,
    datePlayed: parsed.datePlayed || null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
    holesRead: holes.filter((h) => h.playerA !== null || h.playerB !== null).length,
  };
}

module.exports = { readScorecard, isConfigured };
