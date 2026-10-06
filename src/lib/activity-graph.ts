const DAY_MS = 86400000;

export interface ActivityDay {
  date: string;
  contributionCount: number;
}

export interface ActivityRange {
  from: string;
  to: string;
}

export function graphNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
  name: string,
  integer = true,
): number {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (
    !value.trim() ||
    !Number.isFinite(number) ||
    (integer && !Number.isInteger(number)) ||
    number < min ||
    number > max
  )
    throw new Error(
      `${name} must be ${integer ? "an integer" : "a number"} between ${min} and ${max}`,
    );
  return number;
}

function parseDate(value: string): number {
  const time = Date.parse(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  )
    throw new Error("Dates must be valid calendar dates in YYYY-MM-DD format");
  return time;
}

/** Date ranges are inclusive and use UTC, including the current day. */
export function getActivityRange(
  query: { days?: string; from?: string; to?: string },
  now = new Date(),
): ActivityRange {
  const days = graphNumber(query.days, 31, 1, 90, "days");
  const today = parseDate(now.toISOString().slice(0, 10));
  let to = query.to === undefined ? today : parseDate(query.to);
  const from =
    query.from === undefined ? to - (days - 1) * DAY_MS : parseDate(query.from);
  if (query.from !== undefined && query.to === undefined)
    to = Math.min(today, from + (days - 1) * DAY_MS);
  if (from > to) throw new Error("from must be on or before to");
  if (to > today)
    throw new Error("Date ranges cannot extend beyond today (UTC)");
  if ((to - from) / DAY_MS + 1 > 90)
    throw new Error("Date ranges must contain at most 90 days");
  return {
    from: new Date(from).toISOString().slice(0, 10),
    to: new Date(to).toISOString().slice(0, 10),
  };
}

export function activityDates(range: ActivityRange): string[] {
  const dates: string[] = [];
  for (
    let time = parseDate(range.from);
    time <= parseDate(range.to);
    time += DAY_MS
  )
    dates.push(new Date(time).toISOString().slice(0, 10));
  return dates;
}
