import {Position, Rect} from '@winter-love/utils'

export const getOutside = (rect: Rect, screen: Rect): Position => {
  const position: Position = {
    x: 0,
    y: 0,
  }
  const leftX = rect.x - screen.x
  const rightX = rect.x + rect.width - screen.x
  const topY = rect.y - screen.y
  const bottomY = rect.y + rect.height - screen.y

  if (leftX < 0) {
    position.x = leftX
  } else if (rightX > screen.width) {
    position.x = rightX - screen.width
  }

  if (topY < 0) {
    position.y = topY
  } else if (bottomY > screen.height) {
    position.y = bottomY - screen.height
  }

  return position
}
