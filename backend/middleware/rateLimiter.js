const rateLimit = require('express-rate-limit');

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many orders placed from this IP. Please try again later.' },
  keyGenerator: (req) => {
    return req.ip + '-' + (req.body.customer_phone || '');
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' }
});

module.exports = { orderLimiter, apiLimiter };
