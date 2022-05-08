import {CssComponent} from '@stitches/core/types/styled-component'
import {VariantAndCss} from 'src/index'
import {SYSTEM_KEY} from 'src/keys'
import {inject} from 'vue-demi'

const addClassScope = (css?: Record<string, any>, withClasses?: string) => {
  if (!withClasses || !css) {
    return css
  }
  const {left, baseCss} = Object.entries(css).reduce((result, [key, value]) => {
    if (key.startsWith('&')) {
      result.left.push([key, value])
      return result
    }
    result.baseCss.push([key, value])
    return result
  }, {baseCss: [] as any[], left: [] as any[]})

  return {
    ...Object.fromEntries(left),
    [`&${withClasses}`]: Object.fromEntries(baseCss),
  }
}

const addClassScopeWithVariant = (csx: VariantAndCss, withClasses?: string) => {
  const {css, ...restCsx} = csx

  return {
    ...restCsx,
    css: addClassScope(css, withClasses),
  }
}

const runCsxClassComponent = (system: CssComponent, csx?: VariantAndCss, withClasses?: string) => {
  const _csx = addClassScopeWithVariant(csx ?? {}, withClasses)
  const result = system(_csx)
  if (!result.props) {
    return {}
  }
  const {className, ...rest} = result.props as any
  return {
    ...rest,
    class: className,
  }
}

export const useCsx = () => {
  const system = inject(SYSTEM_KEY, (() => ({})) as any)
  return (csx?: VariantAndCss, withClasses?: string) => {
    return runCsxClassComponent(system, csx, withClasses)
  }
}
