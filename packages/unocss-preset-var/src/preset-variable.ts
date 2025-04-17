import type {DynamicMatcher} from 'unocss'
import {definePreset, RuleContext} from '@unocss/core'
import {parseCssColor} from '@unocss/rule-utils'
import {parseColor, type Theme} from 'unocss/preset-mini'
import {colorResolver} from '@unocss/preset-mini/utils'

export const fixOpacityColor = (color?: string) => {
  if (!color) {
    return color
  }

  return color.replace('opacity)', 'opacity, 1)')
}

export const createVariableMatcher = (
  prefix: string,
  colorOpacityName = 'bg',
): DynamicMatcher => {
  const propertyName = 'background-color'
  const bgColorResolver = colorResolver(propertyName, colorOpacityName)

  return ([, variableName, value], context) => {
    const result = bgColorResolver(['', value], context)

    if (typeof result === 'object' && result && Object.keys(result).length > 0) {
      const value = fixOpacityColor(result[propertyName])

      const css = {
        ...result,
        [`${prefix}-${variableName}`]: value,
      }

      delete css[propertyName]
      delete css[`--un-${colorOpacityName}-opacity`]

      return css
    }

    return {
      [`${prefix}-${variableName}`]: value,
    }
  }
}

export const presetVariable = definePreset(() => {
  return {
    name: 'unocss-preset-var',
    rules: [
      [/^un-var-(.+)=(.+)$/u, createVariableMatcher('--un')],
      [/^un-color-var-(.+)=(.+)$/u, createVariableMatcher('--un', 'color')],
      [/^un-bg-var-(.+)=(.+)$/u, createVariableMatcher('--un', 'bg')],
      [/^var-(.+)=(.+)$/u, createVariableMatcher('--var')],
      [/^color-var-(.+)=(.+)$/u, createVariableMatcher('--var', 'color')],
      [/^bg-var-(.+)=(.+)$/u, createVariableMatcher('--var', 'bg')],
    ],
  }
})
