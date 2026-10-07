import {readTextSelection} from './read-text-selection'

/** Returns selected code text without line numbers, or null when the selection is outside the code. */
export const readCodeText = (container: HTMLElement): string | null => {
  const selected = readTextSelection(container)
  const selection = container.ownerDocument.getSelection()
  if (selected === null || selection === null) {
    return null
  }
  const range = selection.getRangeAt(0)
  return Array.from(container.querySelectorAll('code'))
    .filter((code) => range.intersectsNode(code))
    .map((code) => {
      const part = container.ownerDocument.createRange()
      part.selectNodeContents(code)
      if (range.compareBoundaryPoints(Range.START_TO_START, part) > 0) {
        part.setStart(range.startContainer, range.startOffset)
      }
      if (range.compareBoundaryPoints(Range.END_TO_END, part) < 0) {
        part.setEnd(range.endContainer, range.endOffset)
      }
      return part.toString()
    })
    .join('\n')
}
