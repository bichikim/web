import type {PuppetColor} from '../../player'

const COLOR_CHANNEL_MAXIMUM = 255
const HEX_RADIX = 16
const HEX_COLOR_PATTERN = /^#(?<red>[\da-f]{2})(?<green>[\da-f]{2})(?<blue>[\da-f]{2})$/iu

export const colorToHex = (color: PuppetColor) =>
  `#${color
    .map((channel) =>
      Math.round(channel * COLOR_CHANNEL_MAXIMUM)
        .toString(HEX_RADIX)
        .padStart(2, '0'),
    )
    .join('')}`

export const hexToColor = (value: string): PuppetColor | undefined => {
  const groups = HEX_COLOR_PATTERN.exec(value)?.groups
  return groups === undefined
    ? undefined
    : [
        Number.parseInt(groups.red!, HEX_RADIX) / COLOR_CHANNEL_MAXIMUM,
        Number.parseInt(groups.green!, HEX_RADIX) / COLOR_CHANNEL_MAXIMUM,
        Number.parseInt(groups.blue!, HEX_RADIX) / COLOR_CHANNEL_MAXIMUM,
      ]
}
