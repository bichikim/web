import {column, createGap, flexWrap} from '@/systems'
import shouldForwardProp from '@styled-system/should-forward-prop'
import {Box} from 'src/component/box'
import {kicks, kickSystem} from 'src/hooks'
import {allProps, responsiveType} from 'src/props'
import styled from 'src/styled'
import {slotToArray} from 'src/utils'
import {defineComponent, h, ref, toRefs} from 'vue'
import {flexItemSystem} from './flex-item-system'

const getBg = kicks.backgroundColor(true)
const getPadding = kicks.padding(true, true)

const props = {gap: responsiveType, range: responsiveType, show: responsiveType}
const FlexItem = styled('div', {props, shouldForwardProp})(...flexItemSystem)

const Container = styled(Box, {passThrough: true, name: 'container'})(
  flexWrap as any,
  column,
  createGap('100%'),
)

export const Flex = defineComponent({
  name: 'Flex',
  props: {
    ...allProps,
    rangeItems: responsiveType,
    column: responsiveType,
    division: responsiveType,
    reverse: responsiveType,
  },
  setup(props, {slots}) {
    const {division, column, rangeItems, reverse} = toRefs(props)
    const gap = ref(props.gap)
    return () => {
      const bgProps = getBg(props)
      const paddingProps = getPadding(props)
      const layoutProps = kickSystem(props, ['padding'])
      const children = slotToArray(slots.default)
      return (
        h(Box, {...layoutProps.value, position: 'relative'}, () => [
          h(Box, {
            ...bgProps,
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: '100%',
          }),
          h(Container, {
            ...paddingProps,
            position: 'relative',
            height: '100%',
            display: 'flex',
            gap: gap.value,
          },
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
