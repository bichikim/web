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

type BoxSystemsNames = 'show' | 'animate'

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

export const allBoxTrueMap: BoxMap = {
  ...allSystemTrueMap,
  animate: true,
  show: true,
}

export const createBox = <P extends PureObject>(map: BoxMap, options: CreateBoxOptions = {}): DefineComponent<P> => {
  const {additionalSystems = [], props = {}, name} = options
  const systems: any[] = [defaultStyle, ...additionalSystems]

  if (map.show) {
    systems.push(show)
  }

  systems.push(...getSystems(map))

  const styledBox = styled('div', {name: 'emotion', props})(...systems)

  const actAnimate = map.animate

  return defineComponent({
    name: name ?? 'b-box',
    props: {
      ...props,
      ...allProps,
      mountAni: null,
      hoverAni: null,
      tapAni: null,
      inputAni: null,
      leaveAni: null,
    },
    emits: {
      tap: null,
      hover: null,
      leave: null,
    },
    setup(props, {slots, emit}) {
      const {mountAni, hoverAni, tapAni, inputAni, leaveAni, ...rest} = toRefs(props)
      const root = ref(null)
      const onTap = (event) => emit('tap', event)
      const onHover = (event) => emit('hover', event)
      const onLeave = (event) => emit('leave', event)

      const animateOptions = actAnimate ? {
        mountAni: mountAni?.value,
        hoverAni: hoverAni?.value,
        tapAni: tapAni?.value,
        inputAni: inputAni?.value,
        leaveAni: leaveAni?.value,
      } : {}

      animate(root, {
        ...animateOptions,
        onTap,
        onHover,
        onLeave,
      })

      return () => {
        return (
          h(styledBox, {...tackRefs(rest), ref: root}, slots)
        )
      }
    },
  }) as any
}

export const Box = createBox<BoxProps>({...allBoxTrueMap, show: true})
