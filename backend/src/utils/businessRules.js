// In-memory dedup cache: messageId -> true
// For production, replace with Redis
const dedupCache = new Map();
const dedupTimers = new Map();

function isDuplicate(phone, messageId) {
  if (dedupCache.has(messageId)) return true;
  dedupCache.set(messageId, true);
  // Evict old entries after 1 hour to prevent memory leak
  if (dedupTimers.has(messageId)) clearTimeout(dedupTimers.get(messageId));
  dedupTimers.set(messageId, setTimeout(() => {
    dedupCache.delete(messageId);
    dedupTimers.delete(messageId);
  }, 3600000));
  return false;
}

/**
 * Returns true if current time is within business hours (WIB = UTC+7).
 * Business hours: 08:00 – 22:00 WIB
 */
function isBusinessHours() {
  const wibOffset = 7 * 60; // minutes
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const wibMinutes = (utcMinutes + wibOffset) % (24 * 60);
  const wibHour = Math.floor(wibMinutes / 60);
  return wibHour >= 8 && wibHour < 22;
}

module.exports = { isDuplicate, isBusinessHours };
