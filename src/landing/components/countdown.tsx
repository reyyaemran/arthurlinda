"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  targetDate: string;
  /** "default" = light bg (hero), "footer" = botanical / cream footer */
  variant?: "default" | "footer";
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function Countdown({ targetDate, variant = "default" }: CountdownProps) {
  const isFooter = variant === "footer";
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const calculate = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };
    setTimeLeft(calculate());
    const timer = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!mounted) return null;

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Min", value: timeLeft.minutes },
    { label: "Sec", value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-end justify-center gap-0">
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-end">
          <div className="flex flex-col items-center px-4 sm:px-6">
            <span
              className="tabular-nums"
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: isFooter ? "clamp(1.6rem, 4vw, 2.2rem)" : "clamp(1.9rem, 5vw, 2.8rem)",
                fontWeight: 300,
                lineHeight: 1,
                letterSpacing: "0.04em",
                color: isFooter ? "rgba(58,66,48,0.88)" : "var(--color-chart-5)",
              }}
            >
              {String(unit.value).padStart(2, "0")}
            </span>
            <span
              className="mt-2 text-[8px] tracking-[0.28em] uppercase"
              style={{ color: isFooter ? "rgba(58,66,48,0.38)" : undefined }}
            >
              {unit.label}
            </span>
          </div>
          {i < units.length - 1 && (
            <span
              className="mb-4 select-none"
              style={{
                fontSize: "0.85rem",
                lineHeight: 1,
                color: isFooter ? "rgba(58,66,48,0.22)" : "var(--color-chart-5)",
                opacity: isFooter ? 1 : 0.25,
              }}
              aria-hidden
            >
              ·
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
