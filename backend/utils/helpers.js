const crypto = require('crypto');

function generateOrderNumber() {
  const prefix = 'MITS';
  const timestamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}${rand}`;
}

function validatePhone(phone) {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const patterns = [
    /^05[0-9]{8}$/,
    /^06[0-9]{8}$/,
    /^07[0-9]{8}$/,
    /^21305[0-9]{8}$/,
    /^21306[0-9]{8}$/,
    /^21307[0-9]{8}$/,
    /^0021305[0-9]{8}$/,
    /^0021306[0-9]{8}$/,
    /^0021307[0-9]{8}$/,
    /^\+21305[0-9]{8}$/,
    /^\+21306[0-9]{8}$/,
    /^\+21307[0-9]{8}$/
  ];
  return patterns.some(p => p.test(cleaned));
}

function normalizePhone(phone) {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('00213')) cleaned = '213' + cleaned.substring(5);
  if (cleaned.startsWith('0')) cleaned = '213' + cleaned.substring(1);
  return cleaned;
}

function calculateRiskScore(customer) {
  let score = 0;
  if (!customer) return score;
  const total = customer.successful_deliveries + customer.returned_packages;
  if (total === 0) return 0.3;
  const returnRate = customer.returned_packages / total;
  score = returnRate;
  if (customer.returned_packages > 3) score += 0.2;
  if (customer.total_orders > 5 && returnRate < 0.1) score = 0;
  return Math.min(score, 1);
}

function calculateProfit(product) {
  const revenue = product.base_price || 0;
  const costs = (product.cost_price || 0);
  return {
    revenue,
    totalCosts: costs,
    netProfit: revenue - costs,
    profitMargin: revenue > 0 ? ((revenue - costs) / revenue * 100).toFixed(2) : 0
  };
}

module.exports = {
  generateOrderNumber,
  validatePhone,
  normalizePhone,
  calculateRiskScore,
  calculateProfit
};
