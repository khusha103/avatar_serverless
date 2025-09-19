// api/avatar.js
// Vercel serverless function - Node 18+ runtime
import fetch from 'node-fetch';
import sharp from 'sharp';

/**
 * Query params should match Avataaars query keys, e.g.:
 * /api/avatar?topType=ShortHairShortFlat&eyeType=Happy&width=512&height=512
 */

export default async function handler(req, res) {
  try {
    // Build avataaars URL from incoming query (pass-through)
    const qs = new URLSearchParams(req.query).toString();
    const avUrl = `https://avataaars.io/?${qs}`;

    // Fetch SVG from avataaars
    const upstream = await fetch(avUrl, { headers: { Accept: 'image/svg+xml' } });
    if (!upstream.ok) {
      return res.status(502).send('Upstream fetch failed');
    }
    const svgText = await upstream.text();

    // Attempt to convert SVG to PNG using sharp
    const width = parseInt(req.query.width || req.query.size || '512', 10) || 512;
    const height = parseInt(req.query.height || req.query.size || String(width), 10) || width;

    let pngBuffer;
    try {
      pngBuffer = await sharp(Buffer.from(svgText))
        .resize(width, height, { fit: 'contain' })
        .png({ quality: 90 })
        .toBuffer();
    } catch (convErr) {
      console.warn('SVG->PNG conversion failed, falling back to SVG:', convErr);
      pngBuffer = null;
    }

    // Set common CORS header
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (pngBuffer) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="avatar.png"`);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');
      return res.status(200).send(pngBuffer);
    }

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="avatar.svg"`);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');
    return res.status(200).send(svgText);
  } catch (err) {
    console.error('avatar function error', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).send('Server error');
  }
}
