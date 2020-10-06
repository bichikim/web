import {CSSObject} from 'web/types'
import {serializeStyles} from '@emotion/serialize'
import {insertStyles} from '@emotion/utils'
import {styleFn} from 'styled-system'
import {computed, DefineComponent, defineComponent, h} from 'vue'
import {ILLEGAL_ESCAPE_SEQUENCE_ERROR} from 'packages/ui/emotion/errors'
import {useCache} from 'packages/ui/emotion/index'
import {useTheme} from 'packages/ui/emotion/theme'

export type StyledSystems = (CSSObject | styleFn)[]

export type StyledOptions = {
  label?: string,
  name?: string,
  shouldForwardProp?: (arg: string) => boolean,
  target?: string
  props?: Record<string, any>
  passThrough?: boolean
}

interface TagContext {
  isReal?: boolean
  baseTag?: string
}

interface GetStylesOptions extends TagContext {
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

interface CreateStyledOptions {
  props?: Record<string, any>
}

export const createStyled = (options: CreateStyledOptions): ((tag?: any, options?: StyledOptions) => StyledResult) => {
  const {props: defaultProps = {}} = options

  return (tag: any = 'div', options: StyledOptions = {}) => {
    const {props} = options
    return styled(tag, {...options, props: {...defaultProps, ...props}})
  }
}

const getClassName = (key: string, name: string, additionalClasses: any[] = []) => {
  return [...additionalClasses.filter((value) => typeof value === 'string'), `${key}-${name}`].join(' ')
}

const PASS_THROUGH_NAME = '__passThough__'

interface passThrough {
  props: Record<string, any>
  styles: any[]
}

const filterProps = (props: Record<string, any>, filter?: (arg: string) => boolean) => {
  if (!filter) {
    return {...props}
  }
  const newProps: Record<string, any> = {}
  for (const key in props) {
    if (filter(key)) {
      newProps[key] = props[key]
    }
  }

  return newProps
}

export const styled = (tag: any = 'div', options: StyledOptions = {}): StyledResult => {
  const {label, target, props = {}, passThrough = false, shouldForwardProp, name} = options
  const {baseTag, isReal} = getTagContext(tag)

  return (...args: any[]) => {
    const styles = getStyles(tag, {
      baseTag, isReal, label,
    }, args)

    return defineComponent({
      name: name ?? 'emotion',
      props: {
        [PASS_THROUGH_NAME]: Object,
        as: null,
        feed: null,
        ...props,
      },
      setup(props, {attrs, slots}) {
        const theme = useTheme()
        const cache = useCache()
        if (!cache) {
          throw new Error('need to cache')
        }
        const finalTag: any = computed(() => props.as || baseTag || 'div')
        const through = computed(() => props[PASS_THROUGH_NAME] || {props: {}, styles: []})
        const {value, ...restAttrs} = attrs

        if (passThrough && typeof finalTag.value !== 'string') {
          return () => {
            const newProps = {...attrs, ...props}
            const newThrough: passThrough = {
              props: {...through.value.props, ...newProps},
              styles: [...styles, ...through.value.styles],
            }
            return (
              h(finalTag.value, {[PASS_THROUGH_NAME]: newThrough}, slots)
            )
          }
        }

        const mergedProps = computed(() => ({
          ...restAttrs,
          ...{...props, as: undefined, feed: undefined},
          ...through.value.props,
          theme,
        }))

        const serialized = computed(() => {
          return serializeStyles(
            styles.concat(through.value.styles),
            cache.registered,
            mergedProps.value,
          )
        })

        return () => {
          insertStyles(
            cache,
            serialized.value,
            typeof finalTag.value === 'string',
          )

          const className = getClassName(cache.key, serialized.value.name, [target, attrs.class])

          const nextProps: any = typeof finalTag.value === 'string' ? {} : props

          const newProps = filterProps({...restAttrs, ...nextProps}, shouldForwardProp)

          return (
            h(finalTag.value, {...newProps, value, class: className} as any, slots)
          )
        }
      },
    })
  }
}

export default styled
