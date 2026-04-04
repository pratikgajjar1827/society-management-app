function normalizeWhitespace(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeCountryName(value) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return '';
  }

  if (/^(india|lndia|1ndia|indla)$/i.test(normalized)) {
    return 'India';
  }

  return normalized;
}

function normalizeSocietyLocationFields(fields) {
  return {
    name: normalizeWhitespace(fields?.name),
    country: normalizeCountryName(fields?.country),
    state: normalizeWhitespace(fields?.state),
    city: normalizeWhitespace(fields?.city),
    area: normalizeWhitespace(fields?.area),
    address: normalizeWhitespace(fields?.address),
    tagline: normalizeWhitespace(fields?.tagline),
  };
}

module.exports = {
  normalizeCountryName,
  normalizeSocietyLocationFields,
  normalizeWhitespace,
};
