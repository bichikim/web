import {memoize} from '@winter-love/utils'
import Color from 'color'

/* eslint-disable no-magic-numbers */
export interface GetContrastColorOptions {
  /**
   * 어두운 색
   * @default #000000
   */
  dark?: string
  /**
   * 밝은 색
   * @default #FFFFFF
   */
  light?: string
  /**
   * contrast 분기
   * @default 128
   */
  threshold?: number
}

export interface CreateGetContrastColorOptions extends GetContrastColorOptions{
  memo?: number
}

export const isSharpHex = (value: string) => {
  return /^#\w{6}/u.test(value)
}

export const getHex = (anyColor: string) => {
  // eslint-disable-next-line functional/no-try-statement
  try {
    return Color(anyColor).hex()
  } catch {
    return anyColor
  }
}

export const getContrast = (anyColor: string) => {
  const _hexColor = getHex(anyColor).slice(1)
  const red = Number.parseInt(_hexColor.slice(0, 2), 16)
  const green = Number.parseInt(_hexColor.slice(2, 4), 16)
  const blue = Number.parseInt(_hexColor.slice(4, 6), 16)
  return ((red * 299) + (green * 587) + (blue * 114)) / 1000
}

export const getContrastColor = (hexColor: string, options: GetContrastColorOptions = {}) => {
  const {
    dark = '#000000',
    light = '#FFFFFF',
    threshold = 150,
  } = options
  return getContrast(hexColor) >= threshold ? dark : light
}

export const createGetContrastColor = (options: CreateGetContrastColorOptions = {}) => {
  const {memo, ...rest} = options

  const func_ = (hexColor: string) => getContrastColor(hexColor, rest)

  if (memo) {
    return memoize(func_, {
      maxSize: memo,
    })
  }

  return func_
}
