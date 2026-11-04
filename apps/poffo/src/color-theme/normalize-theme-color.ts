import {parseColor} from '@kobalte/core/colors'

const CHANNEL_MAXIMUM = 255
const CHANNEL_COUNT = 3
const HEX_RADIX = 16

/** Resolves browser CSS colors to the opaque sRGB HEX format used by theme preferences. */
export const normalizeThemeColor = (root: HTMLElement, value: string): string => {
  try {
    return parseColor(value).toString('hex')
  } catch {
    const probe = root.ownerDocument.createElement('span')
    probe.className = 'color-theme-color-probe'
    probe.style.setProperty('--color-theme-probe', value)
    root.append(probe)
    try {
      const {color} = getComputedStyle(probe)
      const channels = /^color\(srgb\s+(?<channels>[^/)]+)/u
        .exec(color)
        ?.groups?.channels?.trim()
        .split(/\s+/u)
      if (channels === undefined) {
        return parseColor(color).toString('hex')
      }
      return `#${channels
        .slice(0, CHANNEL_COUNT)
        .map((channel) =>
          Math.round(Math.min(1, Math.max(0, Number(channel))) * CHANNEL_MAXIMUM)
            .toString(HEX_RADIX)
            .padStart(2, '0'),
        )
        .join('')
        .toUpperCase()}`
    } finally {
      probe.remove()
    }
  }
}
