const timestampSchema = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function parseReportExpiration(value: unknown): Date {
  if (typeof value !== "string" || !timestampSchema.test(value)) {
    throw new Error("Stored report expiration is invalid");
  }

  const expiration = new Date(value);
  if (!Number.isFinite(expiration.getTime())) {
    throw new Error("Stored report expiration is invalid");
  }
  return expiration;
}

export function isReportExpired(value: unknown, now = new Date()): boolean {
  return parseReportExpiration(value).getTime() <= now.getTime();
}

export function addCalendarYears(value: Date, years: number): Date {
  const result = new Date(value);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}
