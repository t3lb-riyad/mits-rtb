const ENTITY_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
function escapeHtml(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/[&<>"']/g, ch => ENTITY_MAP[ch]);
}
function sanitizeInput(obj, fields) {
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const f of fields) {
    if (typeof out[f] === 'string') out[f] = out[f].trim();
  }
  return out;
}
module.exports = { escapeHtml, sanitizeInput };
