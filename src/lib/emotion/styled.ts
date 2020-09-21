import {getRegisteredStyles, insertStyles} from '@emotion/utils'
import {serializeStyles} from '@emotion/serialize'
import {defineComponent, h, ref, computed, inject, DefineComponent} from 'vue'
import {themeSym} from './theme'
import {allProps} from './props'
import {ILLEGAL_ESCAPE_SEQUENCE_ERROR, NO_TAG_ERROR} from './errors'

export type StyledOptions = {
  label?: string,
  shouldForwardProp?: (arg: string) => boolean,
  target?: string
  props?: string[] | {[key: string]: any},
}

const isError = (tag: string): boolean => {
  if (process.env.NODE_ENV !== 'production') {
    if (tag === undefined) {
      throw new Error(NO_TAG_ERROR)
    }
  }

  return true
}

interface TagContext {
  isReal?: boolean
  baseTag?: string
}

interface GetStylesOptions extends TagContext{
  label?: string
}

const getTagContext = (tag: any = 'div'): TagContext => {
  const isReal = tag.__emotion_real === tag
  const baseTag = (isReal && tag.__emotion_base) || tag

  return {
    isReal,
    baseTag,
  }
}

const getStyles = (tag: any, options: GetStylesOptions, args: any[]) => {
  const {isReal, label} = options
  const styles: any[] =
    isReal && tag.__emotion_styles !== undefined
      ? tag.__emotion_styles.slice(0)
      : []

  if (typeof label !== 'undefined') {
    styles.push(`label:${label};`)
  }

  if (args[0] === null || args[0].raw === undefined) {
    styles.push(...args)
  } else {
    if (process.env.NODE_ENV !== 'production' && args[0][0] === undefined) {
      console.error(ILLEGAL_ESCAPE_SEQUENCE_ERROR)
    }

    styles.push(args[0][0])
    const len = args.length
    let i = 1
    for (; i < len; i++) {
      if (process.env.NODE_ENV !== 'production' && args[0][i] === undefined) {
        console.error(ILLEGAL_ESCAPE_SEQUENCE_ERROR)
      }

      styles.push(args[i], args[0][i])
    }
  }

  return styles
}

type StyledResult = (...args: any[]) => DefineComponent

export const styled = (tag: string = 'div', options: StyledOptions = {}): StyledResult => {
  isError(tag)

  const {label, target, props = {}} = options
  const {baseTag, isReal} = getTagContext(tag)

  return (...args: any[]) => {
    const styles = getStyles(tag, {
      baseTag, isReal, label,
    }, args)

    return defineComponent({
      props: {
        as: String,
        ...allProps,
        ...props,
      },
      setup(props, {attrs, slots}) {
        const theme = inject(themeSym, {})
        return (context: any) => {
          const {$parent} = context
          const cache = $parent.$emotionCache
          // const {value, ...restAttrs} = attrs || {}
          const {as, ...restProps} = props
          let className = ''
          const finalTag: any = as || baseTag || 'div'
          const classInterpolations: any[] = []
          const mergedProps = {
            ...attrs,
            ...props,
            theme,
            // ...$parent.$evergarden,
          }

          // const domProps = {
          //   value,
          // }

          const serialized = serializeStyles(
            styles.concat(classInterpolations),
            cache.registered,
            mergedProps,
          )

          insertStyles(
            cache,
            serialized,
            typeof finalTag === 'string',
          )

          className += `${cache.key}-${serialized.name}`

          if (target !== undefined) {
            className += ` ${target}`
          }

          return (
            h(finalTag, {class: className} as any, slots)
          )
        }
      },
    })
  }
}

export default styled
