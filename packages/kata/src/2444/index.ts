export const repeatString = (count: number, string: string): string => {
  return Array.from({length: count}, () => string).join('')
}

export const renderRaw = (maxCount: number, renderCount: number) => {
  const half = Math.floor(renderCount / 2)
  return (
    repeatString(maxCount - half - 1, ' ') +
    repeatString(renderCount, '*') +
    repeatString(maxCount - half - 1, ' ')
  )
}
// 역순
export const renderHalfDiamond = (
  count: number,
  opposite: boolean = false,
  padding: number = 0,
) => {
  return Array.from({length: count}, (_, index) => {
    const _index = opposite ? count - index - 1 : index
    return (
      repeatString(padding, ' ') +
      renderRaw(count, _index * 2 + 1) +
      repeatString(padding, ' ')
    )
  }).join('\n')
}

export const renderDiamond = (count: number) => {
  return [renderHalfDiamond(count), renderHalfDiamond(count - 1, true, 1)]
    .filter(Boolean)
    .join('\n')
}
