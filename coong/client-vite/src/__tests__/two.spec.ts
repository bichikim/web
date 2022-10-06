interface Block {
  height: number
  index: number
  to: Block[]
}

function createBlocks(blocks: number[]): Block[] {
  const _blocks: Block[] = blocks.map((height, index) => ({height, index, to: []}))
  const length = _blocks.length
  for (let index = 0; index < length; index += 1) {
    const block = _blocks[index]
    const next = _blocks[index + 1]
    if (next) {
      if (block.height < next.height) {
        block.to.push(next)
      } else if (block.height === next.height) {
        block.to.push(next)
        next.to.push(block)
      } else {
        next.to.push(block)
      }
    }
  }
  return _blocks
}

function move(block: Block, right: boolean) {
  const {to, index} = block
  return to.find(({index: toIndex}) => {
    if (right) {
      return index < toIndex
    }
    return index > toIndex
  })
}

function moveToEnd(block: Block, right: boolean) {
  let next = block
  let count = 0
  while (next && count < 200000) {
    next = move(next, right)
    if (next) {
      count += 1
    }
  }
  return count
}

function getRange(block: Block) {
  const result1 = moveToEnd(block, true)
  const result2 = moveToEnd(block, false)
  return result1 + result2
}

function solution(blocks: number[]) {
  const _blocks = createBlocks(blocks)
  const results = _blocks.map((block) => getRange(block))

  return results.sort((a, b) => b - a)[0] + 1
}

describe('solution', () => {
  it('should return number', () => {
    expect(solution([2, 6, 8, 5])).toBe(3)
    expect(solution([1, 5, 5, 2, 6])).toBe(4)
    expect(solution([1, 1])).toBe(2)
  })
})
