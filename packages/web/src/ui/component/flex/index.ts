import {responsiveType} from '@/ui/props'
import {column, createGap, flexWrap} from '@/ui/systems'
import shouldForwardProp from '@styled-system/should-forward-prop'
import fluid from 'fluid-system'
import {color, compose, flexbox, padding, position} from 'styled-system'
import {defineComponent, h, toRefs} from 'vue'
import {Box} from '@/ui'
import styled, {Systems} from '@/ui/styled'
import {slotToArray} from '@/ui/utils'
import {flexItemSystem} from './flex-item-system'

const props = {gap: responsiveType, range: responsiveType, show: responsiveType}
const FlexItem = styled('div', {props, shouldForwardProp})(...flexItemSystem)

const systems: Systems = [
  {
    display: 'flow-root',
    position: 'relative',
    padding: '0',
    backgroundColor: 'transparent',
    '.background': [
      {
        height: '100%',
        left: 0,
        position: 'absolute',
        top: 0,
        width: '100%',
      },
      fluid(color),
    ],
    '.container': [
      {
        boxSizing: 'border-box',
        display: 'flex',
        height: '100%',
        position: 'relative',
      },
      flexWrap as any,
      column,
      createGap('100%'),
      fluid(compose(position, flexbox, padding)),
    ],
  },
]

const BoxForFlex = styled(Box, {passThrough: true, props})(...systems)

export const Flex = defineComponent({
  name: 'Flex',
  props: {
    rangeItems: responsiveType,
    column: responsiveType,
    division: responsiveType,
    reverse: responsiveType,
  },
  setup(props, {attrs, slots}) {
    const {division, column, rangeItems, reverse} = toRefs(props)
    return () => {
      const children = slotToArray(slots.default)
      return (
        h(BoxForFlex, {...attrs}, () => [
          h('div', {class: 'background'}),
          h('div', {class: 'container'},
            children.map((child) => {
              const childProps = child.props || {}
              const {range = rangeItems, basis, show = true, offset} = childProps
              return h(FlexItem, {
                basis,
                column,
                division,
                offset,
                range,
                reverse,
                show,
              }, () => child)
            }),
          ),
        ])
      )
    }
  },
})

// export const Flex = styled(FlexComponent)(...systems)
