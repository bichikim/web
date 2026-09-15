export const createSafeAreaSpacing = (baseSpacing: string, safeArea: string) =>
  // sin(atan2(inset, 0px)) selects 0 or 1 without requiring newer CSS sign() support.
  `calc(${safeArea} + ${baseSpacing} * (1 - 0.75 * sin(atan2(${safeArea}, 0px))))`

export const createSafeAreaMaxHeight = (baseSpacing: string) =>
  `calc(100dvh - ${createSafeAreaSpacing(baseSpacing, 'var(--pomo-safe-area-inset-top)')} - ` +
  `${createSafeAreaSpacing(baseSpacing, 'var(--pomo-safe-area-inset-bottom)')})`
