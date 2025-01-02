import {getCenterPosition} from './get-center-position'
import {getEndPosition} from './get-end-position'
import {getStartPosition} from './get-start-position'
import {UseStickyRelativePosition} from './types'

export const getPositionMethod = (position: UseStickyRelativePosition) => {
  switch (position) {
    case 'center': {
      return getCenterPosition
    }

    case 'start': {
      return getStartPosition
    }

    case 'end': {
      return getEndPosition
    }
  }
}
