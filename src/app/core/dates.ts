export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function validDate(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(key) &&
    dateKey(parseDate(key)) === key &&
    key >= '1900-01-01' &&
    key <= '2200-12-31'
  );
}
export function addDays(key: string, count: number): string {
  const d = parseDate(key);
  d.setDate(d.getDate() + count);
  return dateKey(d);
}
export function dayDistance(a: string, b: string): number {
  const x = parseDate(a),
    y = parseDate(b);
  return Math.round(
    (Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) -
      Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) /
      86400000,
  );
}
export function weekStart(key: string): string {
  return addDays(key, -((parseDate(key).getDay() + 6) % 7));
}
export function monthStart(key: string): string {
  return key.slice(0, 7) + '-01';
}
export function monthEnd(key: string): string {
  const d = parseDate(key);
  return dateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12));
}
export function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}
export function monthShift(key: string, amount: number): string {
  const d = parseDate(monthStart(key));
  d.setMonth(d.getMonth() + amount);
  return dateKey(d);
}
export function prettyDate(
  key: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
): string {
  return parseDate(key).toLocaleDateString('en-GB', options);
}
