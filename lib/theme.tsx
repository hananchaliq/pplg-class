"use client";

import * as React from "react";
import { flushSync } from "react-dom";

export type ThemeMode = "light" | "dark";

export interface ThemeTriggerOrigin {
  clientX?: number;
  clientY?: number;
  currentTarget?: EventTarget & HTMLElement;
}

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: (origin?: ThemeTriggerOrigin | React.MouseEvent<HTMLElement>) => void;
  setTheme: (next: ThemeMode) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = "xii_pplg1_theme";

function applyThemeToDom(next: ThemeMode) {
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore storage errors
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>("light");
  const themeRef = React.useRef<ThemeMode>("light");

  React.useEffect(() => {
    let initial: ThemeMode = "light";
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        initial = saved;
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        initial = "dark";
      }
    } catch {
      // ignore storage errors
    }
    themeRef.current = initial;
    setThemeState(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const setTheme = React.useCallback((next: ThemeMode) => {
    themeRef.current = next;
    setThemeState(next);
    applyThemeToDom(next);
  }, []);

  const toggleTheme = React.useCallback(
    (origin?: ThemeTriggerOrigin | React.MouseEvent<HTMLElement>) => {
      const next: ThemeMode = themeRef.current === "light" ? "dark" : "light";

      if (typeof window === "undefined" || typeof document === "undefined") {
        setTheme(next);
        return;
      }

      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      let x = window.innerWidth - 44;
      let y = 32;

      if (origin && "currentTarget" in origin && origin.currentTarget) {
        const rect = origin.currentTarget.getBoundingClientRect();
        x = rect.left + rect.width * 0.5;
        y = rect.top + rect.height * 0.5;
      } else if (
        origin &&
        typeof origin.clientX === "number" &&
        typeof origin.clientY === "number"
      ) {
        x = origin.clientX;
        y = origin.clientY;
      }

      const maxR = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const rootStyle = document.documentElement.style;
      rootStyle.setProperty("--theme-origin-x", `${x.toFixed(1)}px`);
      rootStyle.setProperty("--theme-origin-y", `${y.toFixed(1)}px`);
      rootStyle.setProperty("--theme-max-r", `${Math.ceil(maxR + 12)}px`);

      const docWithVt = document as Document & {
        startViewTransition?: (cb: () => void) => { finished?: Promise<void> };
      };

      if (!prefersReduced && typeof docWithVt.startViewTransition === "function") {
        try {
          docWithVt.startViewTransition(() => {
            flushSync(() => {
              themeRef.current = next;
              setThemeState(next);
            });
            applyThemeToDom(next);
          });
          return;
        } catch {
          // Fallback below
        }
      }

      if (!prefersReduced) {
        // Fallback radial overlay expansion untuk browser tanpa View Transitions API
        const ripple = document.createElement("div");
        ripple.setAttribute("aria-hidden", "true");
        const nextBg = next === "dark" ? "#1C1916" : "#ECE9E1";
        ripple.style.cssText = [
          "position:fixed",
          "inset:0",
          "z-index:9998",
          "pointer-events:none",
          `background:${nextBg}`,
          `clip-path:circle(0px at ${x}px ${y}px)`,
          "transition:clip-path 560ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease",
        ].join(";");
        document.body.appendChild(ripple);
        requestAnimationFrame(() => {
          ripple.style.clipPath = `circle(${Math.ceil(maxR)}px at ${x}px ${y}px)`;
        });
        window.setTimeout(() => {
          themeRef.current = next;
          setThemeState(next);
          applyThemeToDom(next);
          ripple.style.opacity = "0";
          window.setTimeout(() => ripple.remove(), 240);
        }, 320);
        return;
      }

      themeRef.current = next;
      setThemeState(next);
      applyThemeToDom(next);
    },
    [setTheme]
  );

  const value = React.useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
