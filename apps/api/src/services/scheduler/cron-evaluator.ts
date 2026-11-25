function matchesField(field: string, value: number): boolean {
  if (field === '*') return true;

  const parts = field.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith('*/')) {
      const step = parseInt(trimmed.slice(2), 10);
      if (!isNaN(step) && step > 0 && value % step === 0) {
        return true;
      }
    } else if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr ?? '', 10);
      const end = parseInt(endStr ?? '', 10);
      if (!isNaN(start) && !isNaN(end) && value >= start && value <= end) {
        return true;
      }
    } else {
      const exact = parseInt(trimmed, 10);
      if (!isNaN(exact) && value === exact) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Evaluates a standard 5-field UTC cron expression (minute hour day-of-month month day-of-week).
 */
export function matchesCron(cronExpression: string, date: Date = new Date()): boolean {
  const fields = cronExpression.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const [minField, hourField, domField, monthField, dowField] = fields as [
    string,
    string,
    string,
    string,
    string,
  ];

  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dayOfMonth = date.getUTCDate();
  const month = date.getUTCMonth() + 1; // 1-12
  const dayOfWeek = date.getUTCDay(); // 0-6 (Sunday=0)

  return (
    matchesField(minField, minute) &&
    matchesField(hourField, hour) &&
    matchesField(domField, dayOfMonth) &&
    matchesField(monthField, month) &&
    matchesField(dowField, dayOfWeek)
  );
}
