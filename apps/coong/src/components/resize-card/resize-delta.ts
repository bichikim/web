export type ResizeType =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right'

export const getResizeDelta = (type: ResizeType | undefined) => {
  switch (type) {
    case 'up': {
      return {addX: 0, addY: -1}
    }

    case 'down': {
      return {addX: 0, addY: 1}
    }

    case 'left': {
      return {addX: -1, addY: 0}
    }

    case 'right': {
      return {addX: 1, addY: 0}
    }

    case 'up-left': {
      return {addX: -1, addY: -1}
    }

    case 'up-right': {
      return {addX: 1, addY: -1}
    }

    case 'down-left': {
      return {addX: -1, addY: 1}
    }

    case 'down-right': {
      return {addX: 1, addY: 1}
    }

    default: {
      return {addX: 0, addY: 0}
    }
  }
}
