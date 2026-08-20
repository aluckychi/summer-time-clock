/** 進める時間（固定） */
export const OFFSET_HOURS = 1;

/** テーマの切り替え時刻（この時計が表示している時刻＝サマータイム基準） */
export const MORNING_START = 6;
export const DAY_START = 10;
export const NIGHT_START = 20;

export const THEMES = ["morning", "day", "night"] as const;
export type Theme = (typeof THEMES)[number];

export function themeForHour(hour: number): Theme {
  if (hour >= NIGHT_START || hour < MORNING_START) return "night";
  if (hour < DAY_START) return "morning";
  return "day";
}

export function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

/**
 * 初回描画前にテーマを確定させる（切り替わりのちらつき防止）。
 * `?theme=night` の指定があればそれを優先する。
 */
export const THEME_BOOTSTRAP = `(function(){try{var f=new URLSearchParams(location.search).get("theme");if(f==="morning"||f==="day"||f==="night"){document.documentElement.dataset.theme=f;return}var h=new Date(Date.now()+${OFFSET_HOURS}*3600000).getHours();document.documentElement.dataset.theme=(h>=${NIGHT_START}||h<${MORNING_START})?"night":(h<${DAY_START}?"morning":"day")}catch(e){}})();`;
