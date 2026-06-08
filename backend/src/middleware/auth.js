const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

async function requireClubAccess(req, res, next) {
  if (req.user.role === 'ADMIN') return next();

  const clubId = req.params.clubId || req.body.clubId;
  if (!clubId) return res.status(400).json({ error: 'Club ID required' });

  const manager = await prisma.clubManager.findFirst({
    where: { userId: req.user.id, clubId },
  });

  if (!manager) {
    return res.status(403).json({ error: 'Not authorised for this club' });
  }
  next();
}

module.exports = { authenticate, requireRole, requireClubAccess };
