import {allSystemTrueMap, column, createGap, flexRange} from '@/systems'
import {createBox} from 'src/component/box'
import {allProps, responsiveType} from 'src/props'
import {slotToArray, tackRefs} from 'src/utils'
import {system} from 'styled-system'
import {defineComponent, h, ref, toRefs} from 'vue'

const Background = createBox({backgroundColor: true}, {
  additionalSystems: [
    {
      position: 'absolute',
      left: 0,
      top: 0,
      height: '100%',
      width: '100%',
    },
  ],
  name: 'background',
})
const Layout = createBox({
  ...allSystemTrueMap,
  show: true,
  // padding: false,
  backgroundColor: false,
},
{
  additionalSystems: [
    {
      display: 'flow-root',
      position: 'relative',
    },
  ],
  name: 'layout',
},
)
const Container = createBox({}, {
  additionalSystems: [
    {
      position: 'relative',
      height: '100%',
      display: 'flex',
      width: 'auto',
    },
    column,
    createGap('100%'),
  ],
  props: {
    gap: null,
  },
  name: 'container',
})
const Item = createBox({show: true}, {
  additionalSystems: [
    {
      boxSizing: 'border-box',
      display: 'block',
      flexBasis: 'auto',
      flexGrow: 0,
      flexShrink: 1,
      maxWidth: '100%',
      minWidth: 0,
      whiteSpace: 'nowrap',
      width: 'auto',
      height: 'auto',
    },
    column,
    flexRange,
    system({
      basis: {
        property: 'flexBasis',
      },
    }),
  ],
  props: {
    range: null,
    basis: null,
  },
  name: 'item',
})

export const Flex = defineComponent({
  name: 'Flex',
  props: {
    ...allProps,
    gap: responsiveType,
    range: responsiveType,
    show: responsiveType,
    rangeItems: responsiveType,
    column: responsiveType,
    division: responsiveType,
    reverse: responsiveType,
  },
  setup(props, {slots}) {
    const {division, column, rangeItems, reverse, ...rest} = toRefs(props)
    const gap = ref(props.gap)
    return () => {
      return h(Layout, tackRefs(rest), () => [
        h(Background, tackRefs(rest)),
        h(Container, tackRefs({...rest, gap}),
          () => slotToArray(slots.default).map((child) => {
            const childProps = child.props || {}
            const {range = rangeItems?.value, basis, show = true, offset} = childProps
            return h(Item, {
              ...tackRefs({
                division, column, reverse,
              }),
              basis,
              offset,
              range,
              show,
            }, () => child)
          }),
        ),
      ])
    }
  },
})
