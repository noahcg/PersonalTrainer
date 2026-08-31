export const trainerTimeZone = "America/Los_Angeles";
export const appTimeZone = trainerTimeZone;

type ScheduledDateTimeOptions = {
  weekday?: "short" | "long";
  month?: "short" | "long";
  timeZoneName?: "short";
  timeZone?: string;
};

export function formatScheduledDateTime(value: string, options: ScheduledDateTimeOptions = {}) {
  return new Date(value).toLocaleString("en-US", {
    weekday: options.weekday,
    month: options.month ?? "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: options.timeZone ?? trainerTimeZone,
    timeZoneName: options.timeZoneName,
  });
}

export function formatScheduledTime(value: string, options: Pick<ScheduledDateTimeOptions, "timeZone" | "timeZoneName"> = {}) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: options.timeZone ?? trainerTimeZone,
    timeZoneName: options.timeZoneName,
  });
}

export function getBrowserTimeZone(fallback = trainerTimeZone) {
  if (typeof Intl === "undefined") return fallback;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
}

export function formatClientScheduledDateTime(value: string, options: Omit<ScheduledDateTimeOptions, "timeZone"> = {}) {
  return new Date(value).toLocaleString("en-US", {
    weekday: options.weekday,
    month: options.month ?? "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: options.timeZoneName,
  });
}

export function getDateTimePartsInTimeZone(value: string | Date, timeZone = trainerTimeZone) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
    hour: Number(partMap.hour),
    minute: Number(partMap.minute),
  };
}

export function dateKeyInTimeZone(value: string | Date, timeZone = trainerTimeZone) {
  const parts = getDateTimePartsInTimeZone(value, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function timeValueInTimeZone(value: string | Date, timeZone = trainerTimeZone) {
  const parts = getDateTimePartsInTimeZone(value, timeZone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function zonedDateTimeToIso(dateKey: string, timeValue: string, timeZone = trainerTimeZone) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

  const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
  let utcMs = targetUtc;

  for (let i = 0; i < 3; i += 1) {
    const parts = getDateTimePartsInTimeZone(new Date(utcMs), timeZone);
    const zonedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const delta = zonedUtc - targetUtc;
    if (delta === 0) break;
    utcMs -= delta;
  }

  return new Date(utcMs).toISOString();
}
