interface ClipPoint {
  readonly x: number
  readonly y: number
}
interface ResolveClipPolygonProps {
  readonly value: string
  readonly width: number
  readonly height: number
}
const length = (value: string, extent: number) => {
  const calculation =
    value.startsWith('calc(') && value.endsWith(')') ? value.slice('calc('.length, -1) : value
  const expression = calculation.replaceAll(/\s/gu, '')
  if (expression === '0') {
    return 0
  }
  const terms = expression.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:px|%)/gu) ?? []
  if (terms.length === 0 || terms.join('') !== expression) {
    throw new Error(`Unsupported hit-region length: ${value}`)
  }
  const percent = 100
  return terms.reduce(
    (sum, term) => sum + Number.parseFloat(term) * (term.endsWith('%') ? extent / percent : 1),
    0,
  )
}

/** Resolves computed polygon clips containing pixels, percentages and their linear calc sums. */
export const resolveClipPolygon = (props: ResolveClipPolygonProps): readonly ClipPoint[] | null => {
  if (props.value === 'none') {
    return null
  }
  if (!props.value.startsWith('polygon(') || !props.value.endsWith(')')) {
    throw new Error(`Unsupported hit-region clip: ${props.value}`)
  }
  return props.value
    .slice('polygon('.length, -1)
    .split(',')
    .map((point) => {
      const coordinates = point.trim().match(/calc\([^)]*\)|\S+/gu) ?? []
      if (coordinates.length !== 2) {
        throw new Error(`Invalid hit-region point: ${point}`)
      }
      return {x: length(coordinates[0]!, props.width), y: length(coordinates[1]!, props.height)}
    })
}
