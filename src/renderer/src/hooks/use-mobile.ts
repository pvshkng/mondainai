import * as React from "react";

const MOBILE_BREAKPOINT = 768;

const PANEL_DRAWER_BREAKPOINT = 1100;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsPanelNarrow() {
  const [isNarrow, setIsNarrow] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(max-width: ${PANEL_DRAWER_BREAKPOINT - 1}px)`,
    );
    const onChange = () => {
      setIsNarrow(window.innerWidth < PANEL_DRAWER_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsNarrow(window.innerWidth < PANEL_DRAWER_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isNarrow;
}
