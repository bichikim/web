import {getCenterPosition} from './get-center-position'
import {getEndPosition} from './get-end-position'
import {getStartPosition} from './get-start-position'
import {RelativePosition} from './types'

export const getPositionMethod = (position: RelativePosition) => {
  switch (position) {
    case 'center':
      return getCenterPosition
    case 'start':
      return getStartPosition
    case 'end':
      return getEndPosition
  }
}
