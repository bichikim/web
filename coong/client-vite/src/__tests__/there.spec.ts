type Direction = 'left' | 'right' | 'up' | 'down'
interface Item {
  bottom: boolean
  floor: boolean
  left: boolean
  right: boolean
  top: boolean
  visited: boolean
}

function createRow(item: string): Item[] {
  const list = item.split('')
  return list.map((text) => ({
    bottom: false,
    floor: text !== 'X',
    left: false,
    right: false,
    top: false,
    visited: false,
  }))
}
function createMap(list: string[]): Item[][] {
  return list.map((item) => createRow(item))
}

function go(
  map: Item[][],
  point: [number, number],
  direction: Direction,
): [number, number] | undefined {
  let _x = point[0]
  let _y = point[1]
  switch (direction) {
    case 'left':
      _x += 1
      break
    case 'right':
      _x -= 1
      break
    case 'up':
      _y -= 1
      break
    case 'down':
      _y += 1
      break
  }

  const next = map[_y]?.[_x]
  if (next && next.floor) {
    return [_x, _y]
  }
}

function nextDirection(direction: Direction) {
  switch (direction) {
    case 'left':
      return 'down'
    case 'right':
      return 'up'
    case 'up':
      return 'left'
    case 'down':
      return 'right'
  }
}

function goToEnd(map: Item[][]) {
  let direction: Direction = 'left'
  let count = 1
  let point: [number, number] = [0, 0]
  map[0][0].visited = true
  let noWayCount = 0
  while (noWayCount <= 4 && count < Number.MAX_SAFE_INTEGER) {
    const item = map[point[1]][point[0]]
    const _point = go(map, point, direction)
    item[direction] = true
    if (!_point) {
      noWayCount += 1
      direction = nextDirection(direction)
      continue
    }
    noWayCount = 0
    point = _point
    const nextItem = map[point[1]][point[0]]
    const visitedDirection = nextItem[direction]
    const visited = nextItem.visited
    if (visitedDirection) {
      break
    }
    item[direction] = true
    if (!visited) {
      count += 1
    }
    nextItem.visited = true
  }

  return count // ?
}

function solution(R) {
  const map = createMap(R)

  return goToEnd(map)
}

describe('solution', () => {
  it.only('should return a', () => {
    expect(solution(['...X..', '....XX', '..X...'])).toBe(6)
    expect(solution(['....X..', 'X......', '.....X.', '.......'])).toBe(15)
    expect(solution(['.'])).toBe(1)
    expect(solution(['...X.', '.X..X', 'X...X', '..X..'])).toBe(9)
  })
})
