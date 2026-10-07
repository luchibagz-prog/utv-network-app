export type VueweSeasonKey =
  | "newyear"
  | "valentine"
  | "stpatrick"
  | "easter"
  | "memorial"
  | "juneteenth"
  | "fourth"
  | "labor"
  | "halloween"
  | "thanksgiving"
  | "christmas";

export type VueweSeason = {
  key: VueweSeasonKey;
  label: string;
  kicker: string;
};

function atNoon(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function inRange(date: Date, start: Date, end: Date) {
  const value = date.getTime();
  return value >= start.getTime() && value <= end.getTime();
}

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return atNoon(year, month - 1, day);
}

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, nth: number) {
  const first = atNoon(year, monthIndex, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return atNoon(year, monthIndex, 1 + offset + (nth - 1) * 7);
}

function lastWeekdayOfMonth(year: number, monthIndex: number, weekday: number) {
  const last = atNoon(year, monthIndex + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return atNoon(year, monthIndex, last.getDate() - offset);
}

export function getVueweSeason(input = new Date()): VueweSeason | null {
  const year = input.getFullYear();
  const date = atNoon(year, input.getMonth(), input.getDate());
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 12 && day >= 27) || (month === 1 && day <= 3)) {
    return { key: "newyear", label: "NEW YEAR MODE", kicker: "NEW VIEW • NEW MOTION" };
  }

  if (month === 2 && day >= 7 && day <= 14) {
    return { key: "valentine", label: "LOVE YOUR VIEW", kicker: "VUEWE VALENTINE" };
  }

  if (month === 3 && day >= 10 && day <= 17) {
    return { key: "stpatrick", label: "LUCKY MODE", kicker: "VUEWE ST. PATRICK'S" };
  }

  const easter = easterSunday(year);
  if (inRange(date, addDays(easter, -7), addDays(easter, 1))) {
    return { key: "easter", label: "SPRING MODE", kicker: "VUEWE EASTER" };
  }

  const memorial = lastWeekdayOfMonth(year, 4, 1);
  if (inRange(date, addDays(memorial, -3), memorial)) {
    return { key: "memorial", label: "REMEMBER & HONOR", kicker: "VUEWE MEMORIAL" };
  }

  if (month === 6 && day >= 16 && day <= 19) {
    return { key: "juneteenth", label: "FREEDOM MODE", kicker: "VUEWE JUNETEENTH" };
  }

  if ((month === 6 && day >= 29) || (month === 7 && day <= 5)) {
    return { key: "fourth", label: "SUMMER FREEDOM", kicker: "VUEWE JULY 4TH" };
  }

  const labor = nthWeekdayOfMonth(year, 8, 1, 1);
  if (inRange(date, addDays(labor, -3), labor)) {
    return { key: "labor", label: "LABOR DAY MODE", kicker: "VUEWE WEEKEND" };
  }

  if (month === 10) {
    return { key: "halloween", label: "SPOOKY SEASON", kicker: "VUEWE AFTER DARK" };
  }

  if (month === 11 && day >= 15) {
    return { key: "thanksgiving", label: "THANKFUL SEASON", kicker: "GOOD PEOPLE • GOOD MOMENTS" };
  }

  if (month === 12 && day <= 26) {
    return { key: "christmas", label: "HOLIDAY MODE", kicker: "VUEWE WINTER LIGHTS" };
  }

  return null;
}
