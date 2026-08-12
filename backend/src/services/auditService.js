const prisma = require('../config/prisma');

async function logAudit({ userId, userEmail, action, entity, entityId, details, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: { userId, userEmail, action, entity, entityId, details, ipAddress },
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAudit };
