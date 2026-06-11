const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const altHeader = req.headers['x-auth-token'];
  let token;

  if (altHeader) {
    token = altHeader;
  } else if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
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

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  const altHeader = req.headers['x-auth-token'];
  let token;

  if (altHeader) {
    token = altHeader;
  } else if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }

  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

module.exports = { authenticate, optionalAuth, requireRole, requireClubAccess };
