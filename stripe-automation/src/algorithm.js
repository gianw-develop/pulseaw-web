const crypto = require("crypto");
const { FIXED_PRODUCTS, INTERNAL_SERVICES, PROCESSING_FEE } = require("./catalog");

const CENTS = 100;

function toCents(dollars) {
  return Math.round(dollars * CENTS);
}

function toDollars(cents) {
  return cents / CENTS;
}

function activeFixedProducts() {
  return (FIXED_PRODUCTS || []).filter(
    (p) => typeof p.stripePriceId === "string" && p.stripePriceId.startsWith("price_")
  );
}

function internalCatalog() {
  return INTERNAL_SERVICES.filter((s) => typeof s.price === "number" && s.price > 0);
}

// Try exact match with 1 or 2 different fixed products (no duplicates).
function matchFixedProducts(amountCents) {
  const products = activeFixedProducts();
  if (products.length === 0) return null;

  const prices = products.map((p) => ({ ...p, priceCents: toCents(p.price) }));

  // Single product exact match
  for (const p of prices) {
    if (p.priceCents === amountCents) {
      return [lineItem(p)];
    }
  }

  // Two different products exact match (i !== j to avoid duplicates)
  for (let i = 0; i < prices.length; i++) {
    for (let j = 0; j < prices.length; j++) {
      if (i === j) continue;
      if (prices[i].priceCents + prices[j].priceCents === amountCents) {
        return [lineItem(prices[i]), lineItem(prices[j])];
      }
    }
  }

  return null;
}

function lineItem(service) {
  return {
    name: service.name,
    price: service.price,
    stripePriceId: service.stripePriceId || null,
  };
}

function hashServices(services) {
  const key = services
    .map((s) => `${s.name}:${s.price}`)
    .sort()
    .join("|");
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Build exact amount using fixed products (priority) and internal services (fill).
// Fixed products cannot repeat. Internal services can repeat if needed.
function buildExactAmount(amountCents, requireFixed = true) {
  const fixed = activeFixedProducts();
  const internal = internalCatalog();
  const feeRange = { min: toCents(PROCESSING_FEE.min), max: toCents(PROCESSING_FEE.max) };

  // Sort fixed descending so we try larger public services first
  const sortedFixed = fixed
    .map((p) => ({ ...p, priceCents: toCents(p.price) }))
    .sort((a, b) => b.priceCents - a.priceCents);

  // Try every subset of fixed products (without repetition) and fill remainder.
  const subsets = generateSubsets(sortedFixed);

  for (const subset of subsets) {
    if (requireFixed && subset.length === 0) continue;

    const usedFixed = new Set(subset.map((p) => p.name));
    const sumFixed = subset.reduce((sum, p) => sum + p.priceCents, 0);
    if (sumFixed > amountCents) continue;

    const remainder = amountCents - sumFixed;

    if (remainder === 0) {
      return subset.map(lineItem);
    }

    // If remainder is within processing fee range, close with fee
    if (remainder >= feeRange.min && remainder <= feeRange.max) {
      return [...subset.map(lineItem), { name: PROCESSING_FEE.name, price: toDollars(remainder), stripePriceId: null }];
    }

    // Try to fill remainder with internal services
    const fill = fillWithInternal(remainder, usedFixed, internal, feeRange);
    if (fill) {
      return [...subset.map(lineItem), ...fill];
    }
  }

  return null;
}

function generateSubsets(items) {
  const result = [[]];
  for (const item of items) {
    const currentLength = result.length;
    for (let i = 0; i < currentLength; i++) {
      result.push([...result[i], item]);
    }
  }
  return result;
}

function fillWithInternal(remainder, usedFixed, internal, feeRange) {
  const sortedInternal = internal
    .map((s) => ({ ...s, priceCents: toCents(s.price) }))
    .sort((a, b) => b.priceCents - a.priceCents);

  const result = [];
  let remaining = remainder;

  for (const item of sortedInternal) {
    while (remaining >= item.priceCents && remaining > 0) {
      // If remaining after this item would be within fee range, add fee and finish
      const after = remaining - item.priceCents;
      if (after >= feeRange.min && after <= feeRange.max) {
        result.push(lineItem(item));
        result.push({ name: PROCESSING_FEE.name, price: toDollars(after), stripePriceId: null });
        return result;
      }
      if (after === 0) {
        result.push(lineItem(item));
        return result;
      }
      result.push(lineItem(item));
      remaining -= item.priceCents;
    }
  }

  // If we exhausted internal services and small remainder fits fee range
  if (remaining >= feeRange.min && remaining <= feeRange.max) {
    result.push({ name: PROCESSING_FEE.name, price: toDollars(remaining), stripePriceId: null });
    return result;
  }

  return null;
}

// When exact amount cannot be built, fall back to the closest valid combination
// that does not exceed the paid amount. The difference becomes a processing fee.
function closestCombination(amountCents) {
  const fixed = activeFixedProducts();
  const internal = internalCatalog();
  const feeRange = { min: toCents(PROCESSING_FEE.min), max: toCents(PROCESSING_FEE.max) };

  const sortedFixed = fixed
    .map((p) => ({ ...p, priceCents: toCents(p.price) }))
    .sort((a, b) => b.priceCents - a.priceCents);

  let best = null;
  let bestTotal = 0;

  const subsets = generateSubsets(sortedFixed);

  for (const subset of subsets) {
    const sumFixed = subset.reduce((sum, p) => sum + p.priceCents, 0);
    if (sumFixed > amountCents) continue;

    const remainder = amountCents - sumFixed;

    // Case: exact with fee
    if (remainder >= feeRange.min && remainder <= feeRange.max) {
      const combo = [...subset.map(lineItem), { name: PROCESSING_FEE.name, price: toDollars(remainder), stripePriceId: null }];
      const total = combo.reduce((sum, s) => sum + toCents(s.price), 0);
      if (!best || total > bestTotal) {
        best = combo;
        bestTotal = total;
      }
      continue;
    }

    // Case: fill with internal services
    const fill = fillWithInternal(remainder, new Set(subset.map((p) => p.name)), internal, feeRange);
    if (fill) {
      const combo = [...subset.map(lineItem), ...fill];
      const total = combo.reduce((sum, s) => sum + toCents(s.price), 0);
      if (!best || total > bestTotal) {
        best = combo;
        bestTotal = total;
      }
    }
  }

  return best;
}

/**
 * Assign services for a given payment amount.
 *
 * Rules:
 * 1. FIXED products (public services) have priority and can only appear once per invoice.
 * 2. INTERNAL services fill the remaining amount and may repeat if needed.
 * 3. PROCESSING FEE ($1-$5) absorbs leftover amounts when no exact internal match exists.
 * 4. If no exact match is possible, the closest valid combination below the amount is used.
 */
function assignServices(amount, usedHashes = [], maxAttempts = 30) {
  const amountCents = toCents(amount);
  let services;
  let source;

  // Priority 1: exact combination of fixed products
  const fixedMatch = matchFixedProducts(amountCents);
  if (fixedMatch) {
    services = fixedMatch;
    source = "fixed";
  } else {
    // Priority 2: at least one fixed product + internal services + optional fee
    const hybridExact = buildExactAmount(amountCents, true);
    if (hybridExact) {
      services = hybridExact;
      source = "hybrid";
    } else {
      // Priority 3: internal services only (amount too small for any fixed product)
      const internalExact = buildExactAmount(amountCents, false);
      if (internalExact) {
        services = internalExact;
        source = "internal";
      } else {
        // Priority 4: closest valid combination
        services = closestCombination(amountCents);
        source = "closest";
      }
    }
  }

  const hash = hashServices(services);
  const total = services.reduce((sum, s) => sum + s.price, 0);

  return { services, hash, total, attempts: 0, source };
}

module.exports = { assignServices, hashServices };
