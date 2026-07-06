// PulseAW LLC — Stripe Automation Catalog
// Public fixed-price services shown on the website + internal services for invoice balancing.

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

// Internal services used only by the automation algorithm to balance invoice amounts.
// These are real PulseAW services but are not listed on the public website.
const INTERNAL_SERVICES = [
  { name: 'Content Revision Block', price: 5, stripePriceId: 'price_1TmAfWRjC6xI4kOc2DQ837Co' },
  { name: 'Keyword Addition', price: 10, stripePriceId: 'price_1TmAfXRjC6xI4kOcLNwyOL1W' },
  { name: 'Caption Rewrite', price: 10, stripePriceId: 'price_1TqD0PRjC6xI4kOcOZhxMKHc' },
  { name: 'Hashtag Refresh', price: 10, stripePriceId: 'price_1TqD0PRjC6xI4kOcTwqGeHsJ' },
  { name: 'Basic Image Edit', price: 10, stripePriceId: 'price_1TqD0QRjC6xI4kOckKKXtm42' },
  { name: 'Social Post Extra', price: 15, stripePriceId: 'price_1TmAfXRjC6xI4kOcjXLbi8gH' },
  { name: 'Report Enhancement', price: 20, stripePriceId: 'price_1TmAfYRjC6xI4kOcP0u5fJtX' },
  { name: 'Audit Deep-Dive', price: 25, stripePriceId: 'price_1TmAfYRjC6xI4kOcaVZ5SEcA' },
  { name: 'Strategy Extension', price: 30, stripePriceId: 'price_1TmAfZRjC6xI4kOc07dZPj0W' },
  { name: 'Campaign Adjustment', price: 35, stripePriceId: 'price_1TmAfaRjC6xI4kOcdVJtvGl6' },
  { name: 'Creative Refresh', price: 40, stripePriceId: 'price_1TmAfaRjC6xI4kOc1M5xher9' },
  { name: 'Consulting Hour', price: 50, stripePriceId: 'price_1TmAfbRjC6xI4kOcQfeZJLbi' },
  { name: 'Comprehensive Digital Marketing Engagement', stripePriceId: 'price_1Tm83dRjC6xI4kOceJWxe4Q4', paymentLink: 'https://buy.stripe.com/14A9AV4Y71mLc3rblg7Zu0d' },
  { name: 'Strategic Advisory and Implementation Services', stripePriceId: 'price_1Tm83eRjC6xI4kOcz3Tm0izR', paymentLink: 'https://buy.stripe.com/3cI7sNair3uT4AZfBw7Zu0e' },
];

// Processing fee absorbs leftover amounts from $1 to $5 when no exact internal match exists.
const PROCESSING_FEE = { name: 'Processing Fee', min: 1, max: 5 };

module.exports = {
  FIXED_PRODUCTS,
  INTERNAL_SERVICES,
  PROCESSING_FEE,
};
