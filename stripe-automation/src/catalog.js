// PulseAW LLC — Stripe Automation Catalog
// 13 public fixed-price services + 2 internal open-amount services

const FIXED_PRODUCTS = [
  { name: 'Social Media Content Starter Pack', price: 10, kind: 'service', stripePriceId: 'price_1Tm7vYRjC6xI4kOcIydijUxt' },
  { name: 'Hashtag Strategy Pack', price: 15, kind: 'service', stripePriceId: 'price_1Tm7vZRjC6xI4kOcnMGq98kb' },
  { name: 'Brand Voice Guide Template', price: 25, kind: 'service', stripePriceId: 'price_1Tm7vaRjC6xI4kOcX4DHJwzo' },
  { name: 'SEO Keyword Snapshot', price: 35, kind: 'service', stripePriceId: 'price_1Tm7vbRjC6xI4kOcSGRTY5zi' },
  { name: 'Social Media Account Audit', price: 50, kind: 'service', stripePriceId: 'price_1Tm7vcRjC6xI4kOcgxCry4dt' },
  { name: 'Website SEO Quick Audit', price: 75, kind: 'service', stripePriceId: 'price_1Tm7veRjC6xI4kOcqUir3CBm' },
  { name: 'Marketing Strategy Call', price: 95, kind: 'service', stripePriceId: 'price_1Tm7vfRjC6xI4kOc5bXYQBE1' },
  { name: 'Facebook / Instagram Ad Setup', price: 110, kind: 'service', stripePriceId: 'price_1Tm7vgRjC6xI4kOcWSKG22rH' },
  { name: 'Google Ads Search Setup', price: 125, kind: 'service', stripePriceId: 'price_1Tm7vhRjC6xI4kOc2AiAx6FA' },
  { name: 'Ads Campaign Review', price: 145, kind: 'service', stripePriceId: 'price_1Tm7viRjC6xI4kOc4wK6ZrkO' },
  { name: 'Landing Page Copy + Wireframe', price: 150, kind: 'service', stripePriceId: 'price_1Tm7vjRjC6xI4kOcXX6LIunp' },
  { name: 'Full Social Media Management', price: 175, kind: 'service', stripePriceId: 'price_1Tm7vkRjC6xI4kOcOWwThz9e' },
  { name: 'Full Growth Roadmap', price: 200, kind: 'service', stripePriceId: 'price_1Tm7vlRjC6xI4kOcZV4JD51F' },
];

// Internal open-amount services (used for custom invoices and balance adjustments)
const INTERNAL_SERVICES = [
  { name: 'Comprehensive Digital Marketing Engagement', stripePriceId: 'price_1Tm83dRjC6xI4kOceJWxe4Q4', paymentLink: 'https://buy.stripe.com/14A9AV4Y71mLc3rblg7Zu0d' },
  { name: 'Strategic Advisory and Implementation Services', stripePriceId: 'price_1Tm83eRjC6xI4kOcz3Tm0izR', paymentLink: 'https://buy.stripe.com/3cI7sNair3uT4AZfBw7Zu0e' },
];

// Filler catalog to reach exact invoice amounts when needed
const VARIABLE_CATALOG = [
  { name: 'Content Planning Supplement', unitPrice: 100 },
  { name: 'Keyword Research Add-on', unitPrice: 500 },
  { name: 'Audit Enhancement', unitPrice: 1000 },
  { name: 'Strategy Extension', unitPrice: 2500 },
];

module.exports = {
  FIXED_PRODUCTS,
  INTERNAL_SERVICES,
  VARIABLE_CATALOG,
};
