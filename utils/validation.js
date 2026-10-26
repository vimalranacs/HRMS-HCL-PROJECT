function cleanText(value, maxLength = 250) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(value, 254));
}

function isISODate(value) {
  const text = cleanText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toFiniteNumber(value, fallback = null) {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isPositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isValidMonthYear(value) {
  const text = cleanText(value, 30);
  return /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/.test(text);
}

module.exports = {
  cleanText,
  isValidEmail,
  isISODate,
  localISODate,
  toFiniteNumber,
  isPositiveInteger,
  isValidMonthYear
};
