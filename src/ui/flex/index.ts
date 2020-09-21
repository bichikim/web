import styled from '@/lib/emotion/styled'
import {responsiveType} from '@/lib/emotion/props'
import {defineComponent, h, toRefs} from 'vue'
import {cleanObject} from '../clean-object'
import {slotToArray} from '../slot-to-array'
import {flexBackgroundSystem} from './flex-background-system'
import {flexContainerSystems} from './flex-container-system'
import {flexItemSystem} from './flex-item-system'
import {flexLayoutSystem} from './flex-layout-system'

const FlexLayout = styled('div')(...flexLayoutSystem)
const FlexBackground = styled('div')(...flexBackgroundSystem)
const FlexContainer = styled('div')(...flexContainerSystems)
const FlexItem = styled('div')(...flexItemSystem)

export const Flex = defineComponent({
  props: {
    rangeItems: responsiveType,
    column: responsiveType,
    division: responsiveType,
    reverse: responsiveType,
  },
  setup(props, {attrs, slots}) {
    const {bg, backgroundColor, ...rest} = attrs
    const {division, column, rangeItems, reverse} = toRefs(props)
    return () => {
      const children = slotToArray(slots.default)
      return (
        h(FlexLayout, {...rest}, () => [
          h(FlexBackground, cleanObject({bg, backgroundColor})),
          h(FlexContainer, {...rest},
            () => children.map((child) => {
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
