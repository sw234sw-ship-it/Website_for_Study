const KST_TIMEZONE = 'Asia/Seoul';

export function nowKST(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: KST_TIMEZONE }));
}

export function toDateKeyKST(input?: Date | string): string {
  const date = input
    ? typeof input === 'string'
      ? new Date(input)
      : input
    : new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return formatter.format(date);
}

export function withinHours(iso: string, hours: number): boolean {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return false;
  const diffMs = Date.now() - target;
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
}
