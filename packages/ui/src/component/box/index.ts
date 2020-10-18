import {defaultStyle} from '@/component/box/system'
import {animate} from '@/hooks'
import {allProps} from '@/props'
import styled from '@/styled'
import {
  allSystemTrueMap,
  BackgroundColorProps,
  ColorProps,
  DisplayProps,
  getSystems,
  PaddingProps,
  MarginProps,
  PositionProps,
  FlexItemProps,
  BoxShadowProps,
  SizeProps,
  BorderProps,
  OverflowProps,
  TextProps,
  FlexProps,
  GridProps,
  show,
  SystemsMap,
} from '@/systems'
import {PureObject} from '@/types'
import {tackRefs} from '@/utils'
import {CSSObject} from '@innovirus/emotion'
import {defineComponent, DefineComponent, h, ref, toRefs} from 'vue'

type BoxSystemsNames = 'show'

type BoxMap = Partial<SystemsMap> & Partial<Record<BoxSystemsNames, boolean>>

interface CreateBoxOptions {
  additionalSystems?: CSSObject<PureObject>[]
  props?: Record<string, any>,
  name?: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BoxProps extends PaddingProps, DisplayProps, BackgroundColorProps, ColorProps,
  MarginProps, PositionProps, FlexItemProps, FlexProps, TextProps, BorderProps, GridProps,
  BoxShadowProps, SizeProps, OverflowProps
{
  // empty
}

export const createBox = <P extends PureObject>(map: BoxMap, options: CreateBoxOptions = {}): DefineComponent<P> => {
  const {additionalSystems = [], props = {}, name} = options
  const systems: any[] = [defaultStyle, ...additionalSystems]

  if (map.show) {
    systems.push(show)
  }

  systems.push(...getSystems(map))

  const styledBox = styled('div', {name: 'emotion', props})(...systems)

  return defineComponent({
    name: name ?? 'box',
    props: {
      ...props,
      ...allProps,
      mountAni: null,
      hoverAni: null,
      tapAni: null,
    },
    emits: {
      tap: null,
      hover: null,
    },
    setup(props, {slots, emit}) {
      const {mountAni, hoverAni, tapAni, ...rest} = toRefs(props)
      const root = ref(null)
      const onTap = (event) => emit('tap', event)
      const onHover = (event) => emit('hover', event)

      animate(root, {
        mountAni: mountAni?.value,
        hoverAni: hoverAni?.value,
        tapAni: tapAni?.value,
        onTap,
        onHover,
      })

      return () => {
        return (
          h(styledBox, {...tackRefs(rest), ref: root}, slots)
        )
      }
    },
  }) as any
}

export const Box = createBox<BoxProps>({...allSystemTrueMap, show: true})
