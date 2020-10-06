import {Systems} from 'packages/ui/styled'
import {column, createGap, flexWrap} from 'packages/ui/systems'
import {color, compose, flexbox, padding, position} from 'styled-system'
import fluid from 'fluid-system'

export const systems: Systems = [
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
