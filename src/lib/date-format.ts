export const appTimeZone = "America/New_York";

type ScheduledDateTimeOptions = {
  weekday?: "short" | "long";
  month?: "short" | "long";
  timeZoneName?: "short";
};

export function formatScheduledDateTime(value: string, options: ScheduledDateTimeOptions = {}) {
  return new Date(value).toLocaleString("en-US", {
    weekday: options.weekday,
    month: options.month ?? "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: appTimeZone,
    timeZoneName: options.timeZoneName,
  });
}

export function formatScheduledTime(value: string, options: Pick<ScheduledDateTimeOptions, "timeZoneName"> = {}) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: appTimeZone,
    timeZoneName: options.timeZoneName,
  });
}
