import {color, compose} from 'styled-system'
import fluid from 'fluid-system'

export const flexBackgroundSystem = [
  {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  fluid(compose(color)),
]
