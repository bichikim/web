import {Systems} from 'src/styled'
import {column, createGap, flexWrap} from 'src/systems'
import {color, compose, flexbox, padding, position} from 'styled-system'

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
      color as any,
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
      compose(position, flexbox, padding),
    ],
  },
]
