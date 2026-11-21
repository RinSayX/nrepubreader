export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 40;

export function normalizeFontSize(value: number, fallback = 18) {
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(Number.isFinite(value) ? value : fallback)));
}
