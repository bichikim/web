const CHANNEL_MAXIMUM = 255
const LINEAR_THRESHOLD = 0.04045
const LINEAR_DIVISOR = 12.92
const GAMMA_OFFSET = 0.055
const GAMMA_DIVISOR = 1.055
const GAMMA_EXPONENT = 2.4
const RED_WEIGHT = 0.2126
const GREEN_WEIGHT = 0.7152
const BLUE_WEIGHT = 0.0722
const LUMINANCE_OFFSET = 0.05

const getLuminance = (hex: string) => {
  const channels = hex
    .slice(1)
    .match(/.{2}/gu)!
    .map((value) => Number.parseInt(value, 16) / CHANNEL_MAXIMUM)
  const linear = channels.map((channel) =>
    channel <= LINEAR_THRESHOLD
      ? channel / LINEAR_DIVISOR
      : ((channel + GAMMA_OFFSET) / GAMMA_DIVISOR) ** GAMMA_EXPONENT,
  )
  return linear[0]! * RED_WEIGHT + linear[1]! * GREEN_WEIGHT + linear[2]! * BLUE_WEIGHT
}

/** Measures WCAG contrast between opaque, normalized six-digit hex colors. */
export const getColorContrast = (foreground: string, background: string): number => {
  const first = getLuminance(foreground)
  const second = getLuminance(background)
  return (Math.max(first, second) + LUMINANCE_OFFSET) / (Math.min(first, second) + LUMINANCE_OFFSET)
}
