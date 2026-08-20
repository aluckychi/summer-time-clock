"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import {
  BOOST_HOURS,
  OFFSET_HOURS,
  isTheme,
  themeForHour,
  type Theme,
} from "./clock-config";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
/** 換算の目安に使う、ふつうの始業時刻 */
const REFERENCE_HOUR = 9;
/** 秒リングの半径と円周 */
const RING_R = 88;
const RING_C = 2 * Math.PI * RING_R;
/** ガラスの傾きの最大角 */
const MAX_TILT = 4;

const pad = (n: number) => String(n).padStart(2, "0");
const vars = (v: Record<string, string>) => v as CSSProperties;

/** テーマ判定の間隔。rAF はタブが非アクティブだと止まるので別立てで回す */
const THEME_SYNC_MS = 10_000;

/**
 * 確認用のURLパラメータを読む。
 * `?theme=night` でテーマ固定、`?t=19:59:50` でその時刻から動かす。
 */
function readOverrides() {
  const params = new URLSearchParams(window.location.search);

  const forced = params.get("theme");
  const forcedTheme = isTheme(forced) ? forced : null;

  let delta = 0;
  const start = params.get("t");
  if (start && /^\d{1,2}:\d{2}(:\d{2})?$/.test(start)) {
    const [h, m, s] = start.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, s ?? 0, 0);
    delta = target.getTime() - Date.now();
  }

  return { forcedTheme, delta };
}

export default function Home() {
  const [now, setNow] = useState<Date | null>(null);
  /** ボタンで足す時間。0 か BOOST_HOURS のどちらか */
  const [boost, setBoost] = useState(0);
  /** 毎分ちょうどに落ちる雫の波紋を打ち直すためのキー */
  const [minuteKey, setMinuteKey] = useState(0);
  const frame = useRef<number>(0);
  const lastMinute = useRef<number | null>(null);
  const lastTheme = useRef<Theme | null>(null);
  const overrides = useRef({ forcedTheme: null as Theme | null, delta: 0 });
  const panel = useRef<HTMLDivElement>(null);
  /** rAF のループから読むため、boost は ref にも持たせる */
  const boostRef = useRef(0);
  const syncThemeRef = useRef<() => void>(() => {});

  useEffect(() => {
    overrides.current = readOverrides();
    const { delta } = overrides.current;

    // 表示中の時刻（サマータイム）で朝・昼・夜を切り替える
    const syncTheme = () => {
      const { forcedTheme } = overrides.current;
      const theme =
        forcedTheme ??
        themeForHour(
          new Date(
            Date.now() + delta + (OFFSET_HOURS + boostRef.current) * 3600_000,
          ).getHours(),
        );
      if (lastTheme.current !== theme) {
        lastTheme.current = theme;
        document.documentElement.dataset.theme = theme;
      }
    };

    syncThemeRef.current = syncTheme;

    const tick = () => {
      const next = new Date(Date.now() + delta);
      setNow(next);
      syncTheme();

      const m = next.getMinutes();
      if (lastMinute.current === null) {
        lastMinute.current = m;
      } else if (lastMinute.current !== m) {
        lastMinute.current = m;
        setMinuteKey((k) => k + 1);
      }
      frame.current = window.requestAnimationFrame(tick);
    };

    tick();
    // タブが裏にいる間も判定を続け、戻ってきた瞬間にも合わせ直す
    const timer = window.setInterval(syncTheme, THEME_SYNC_MS);
    document.addEventListener("visibilitychange", syncTheme);
    window.addEventListener("focus", syncTheme);
    window.addEventListener("pageshow", syncTheme);

    return () => {
      window.cancelAnimationFrame(frame.current);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", syncTheme);
      window.removeEventListener("focus", syncTheme);
      window.removeEventListener("pageshow", syncTheme);
    };
  }, []);

  useEffect(() => {
    boostRef.current = boost;
    syncThemeRef.current();
  }, [boost]);

  const handleTilt = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = panel.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    el.style.setProperty("--ry", `${(px - 0.5) * 2 * MAX_TILT}deg`);
    el.style.setProperty("--rx", `${-(py - 0.5) * 2 * MAX_TILT}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    el.style.setProperty("--glare-opacity", "0.9");
  };

  const resetTilt = () => {
    const el = panel.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "28%");
    el.style.setProperty("--my", "10%");
    el.style.setProperty("--glare-opacity", "0.55");
  };

  const offsetHours = OFFSET_HOURS + boost;
  const shifted = now
    ? new Date(now.getTime() + offsetHours * 3600_000)
    : null;

  const seconds = shifted
    ? shifted.getSeconds() + shifted.getMilliseconds() / 1000
    : 0;
  const minutes = shifted ? shifted.getMinutes() + seconds / 60 : 0;
  const hours = shifted ? (shifted.getHours() % 12) + minutes / 60 : 0;

  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6;
  const hourAngle = hours * 30;
  /** うすい針＝実時刻の時針 */
  const realHourAngle = hourAngle - offsetHours * 30;

  const referenceRealHour = (REFERENCE_HOUR - offsetHours + 24) % 24;

  return (
    <>
      <div className="sky" aria-hidden />

      <div className="blob-field" aria-hidden>
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <div className="blob blob-c" />
        <div className="blob blob-d" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl items-center px-5 py-12">
        <div
          ref={panel}
          className="glass w-full"
          onMouseMove={handleTilt}
          onMouseLeave={resetTilt}
        >
          <div className="px-7 py-10 sm:px-11 sm:py-12">
            <header
              className="fog-in flex items-baseline justify-between"
              style={vars({ "--delay": "0.05s" })}
            >
              <span
                className="text-[11px] uppercase"
                style={{ letterSpacing: "0.36em", color: "var(--accent)" }}
              >
                Summer Time
              </span>
              <span
                className="numeric text-[11px] uppercase"
                style={{ letterSpacing: "0.24em", color: "var(--faint)" }}
              >
                +{pad(offsetHours)}:00
              </span>
            </header>

            <div
              className="fog-in relative mt-9 flex justify-center"
              style={vars({ "--delay": "0.2s" })}
            >
              {/* 波紋：常時2本 + 毎分ちょうどに1本 */}
              <svg
                className="pointer-events-none absolute"
                style={{ inset: "-55%" }}
                viewBox="0 0 200 200"
                aria-hidden
              >
                <g fill="none" stroke="var(--accent)" strokeWidth="0.7">
                  <circle
                    className="ripple-circle"
                    cx="100"
                    cy="100"
                    r="40"
                    vectorEffect="non-scaling-stroke"
                    style={vars({ "--delay": "0s" })}
                  />
                  <circle
                    className="ripple-circle"
                    cx="100"
                    cy="100"
                    r="40"
                    vectorEffect="non-scaling-stroke"
                    style={vars({ "--delay": "4.5s" })}
                  />
                  {minuteKey > 0 && (
                    <circle
                      key={minuteKey}
                      className="ripple-minute"
                      cx="100"
                      cy="100"
                      r="40"
                      strokeWidth="1.2"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </g>
              </svg>

              <svg
                viewBox="0 0 200 200"
                role="img"
                aria-label={
                  shifted
                    ? `サマータイム ${pad(shifted.getHours())}時${pad(shifted.getMinutes())}分`
                    : "時計"
                }
                style={{ width: "clamp(200px, 58vw, 290px)", height: "auto" }}
              >
                {/* 秒のリング：12時から満ちていく */}
                <circle
                  cx="100"
                  cy="100"
                  r={RING_R}
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="1.5"
                />
                <circle
                  cx="100"
                  cy="100"
                  r={RING_R}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - seconds / 60)}
                  opacity="0.45"
                  transform="rotate(-90 100 100)"
                />

                {Array.from({ length: 12 }, (_, i) => {
                  const major = i % 3 === 0;
                  return (
                    <line
                      key={i}
                      x1="100"
                      y1={major ? 22 : 24}
                      x2="100"
                      y2={major ? 34 : 30}
                      stroke={major ? "var(--muted)" : "var(--line)"}
                      strokeWidth={major ? 1.5 : 1}
                      strokeLinecap="round"
                      transform={`rotate(${i * 30} 100 100)`}
                    />
                  );
                })}

                {/* うすい針：実時刻の時針 */}
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="60"
                  stroke="var(--faint)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.6"
                  transform={`rotate(${realHourAngle} 100 100)`}
                />

                {/* 時針・分針・秒針：サマータイム */}
                <line
                  x1="100"
                  y1="108"
                  x2="100"
                  y2="56"
                  stroke="var(--ink)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform={`rotate(${hourAngle} 100 100)`}
                />
                <line
                  x1="100"
                  y1="110"
                  x2="100"
                  y2="36"
                  stroke="var(--ink)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  transform={`rotate(${minuteAngle} 100 100)`}
                />
                <line
                  x1="100"
                  y1="114"
                  x2="100"
                  y2="30"
                  stroke="var(--accent)"
                  strokeWidth="1"
                  strokeLinecap="round"
                  transform={`rotate(${secondAngle} 100 100)`}
                />
                <circle cx="100" cy="100" r="3" fill="var(--accent)" />
              </svg>
            </div>

            <div
              className="fog-in mt-9 flex items-baseline justify-center gap-3"
              style={vars({ "--delay": "0.35s" })}
            >
              <span
                className="numeric leading-none"
                style={{
                  fontSize: "clamp(2.6rem, 12vw, 4.6rem)",
                  fontWeight: 200,
                  letterSpacing: "-0.03em",
                }}
              >
                {shifted
                  ? `${pad(shifted.getHours())}:${pad(shifted.getMinutes())}`
                  : "--:--"}
              </span>
              <span
                className="numeric leading-none"
                style={{
                  fontSize: "clamp(1rem, 4vw, 1.5rem)",
                  fontWeight: 200,
                  color: "var(--muted)",
                }}
              >
                {shifted ? pad(shifted.getSeconds()) : "--"}
              </span>
            </div>

            <div
              className="fog-in mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-sm"
              style={vars({ "--delay": "0.45s" })}
            >
              <span className="numeric" style={{ color: "var(--muted)" }}>
                {shifted
                  ? `${shifted.getFullYear()}年${shifted.getMonth() + 1}月${shifted.getDate()}日（${WEEKDAYS[shifted.getDay()]}）`
                  : "----年--月--日"}
              </span>
              <span className="numeric" style={{ color: "var(--muted)" }}>
                実時刻{" "}
                {now
                  ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
                  : "--:--:--"}
              </span>
            </div>

            <div
              className="fog-in mt-7 flex justify-center"
              style={vars({ "--delay": "0.5s" })}
            >
              <button
                type="button"
                onClick={() => setBoost((v) => (v === 0 ? BOOST_HOURS : 0))}
                aria-pressed={boost > 0}
                className="boost-button numeric"
              >
                {boost > 0 ? "もどす" : `${BOOST_HOURS}時間すすめる`}
              </button>
            </div>

            <div
              className="fog-in mt-8 border-t pt-6 text-sm leading-relaxed"
              style={vars({
                "--delay": "0.55s",
                borderColor: "var(--line)",
                color: "var(--muted)",
              })}
            >
              <p>
                実時刻より{offsetHours}時間はやく生きています。いちばん暑い時間を、外の予定から外せます。
              </p>
              <p className="numeric mt-2">
                この時計の {pad(REFERENCE_HOUR)}:00 は、実時刻の{" "}
                {pad(referenceRealHour)}:00 です。うすい針は実時刻の時針です。
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
