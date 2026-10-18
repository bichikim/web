/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {readTextSelection} from '../read-text-selection'

describe('readTextSelection', () => {
  let container: HTMLDivElement
  let first: Text
  let second: Text
  let third: Text
  beforeEach(() => {
    container = document.createElement('div')
    const addLine = (line: number): Text => {
      const row = document.createElement('div')
      row.dataset.line = String(line)
      const code = document.createElement('code')
      const text = document.createTextNode(`code ${line}`)
      code.append(text)
      row.append(code)
      container.append(row)
      return text
    }
    first = addLine(10)
    second = addLine(11)
    third = addLine(12)
    document.body.append(container)
  })
  afterEach(() => {
    document.getSelection()?.removeAllRanges()
    container.remove()
  })

  it('should report a multiline text selection without altering the selected text', () => {
    const selection = document.getSelection()!
    selection.setBaseAndExtent(first, 2, second, 4)
    const text = selection.toString()
    expect(readTextSelection(container)).toEqual({column: 3, endColumn: 5, endLine: 11, line: 10})
    expect(selection.toString()).toBe(text)
  })

  it('should normalize a backward text selection', () => {
    document.getSelection()!.setBaseAndExtent(third, 4, first, 1)
    expect(readTextSelection(container)).toEqual({column: 2, endColumn: 5, endLine: 12, line: 10})
  })

  it('should select one line when dragging only within that line', () => {
    document.getSelection()!.setBaseAndExtent(second, 1, second, 5)
    expect(readTextSelection(container)).toEqual({column: 2, endColumn: 6, endLine: 11, line: 11})
  })

  it("should preserve the exclusive endpoint at the next row's first column", () => {
    document.getSelection()!.setBaseAndExtent(first, 1, third, 0)
    expect(readTextSelection(container)).toEqual({column: 2, endColumn: 1, endLine: 12, line: 10})
  })

  it('should retain an end line when earlier tokens in that line are selected', () => {
    const next = document.createTextNode('another token')
    second.parentElement!.append(next)
    document.getSelection()!.setBaseAndExtent(first, 1, next, 0)
    expect(readTextSelection(container)).toEqual({column: 2, endColumn: 8, endLine: 11, line: 10})
  })

  it('should count UTF-16 columns across nested highlighted text and tabs without including the gutter', () => {
    const code = first.parentElement!
    code.innerHTML = '<span>😀\t</span><a><mark>hello</mark></a>'
    const text = code.querySelector('mark')!.firstChild!
    document.getSelection()!.setBaseAndExtent(text, 1, text, 4)
    expect(readTextSelection(container)).toEqual({column: 5, endColumn: 8, endLine: 10, line: 10})
  })

  it('should ignore a collapsed caret', () => {
    const selection = document.getSelection()!
    selection.collapse(first, 2)
    expect(readTextSelection(container)).toBeNull()
  })

  it('should ignore a selection extending outside the code viewer', () => {
    const selection = document.getSelection()!
    const outside = document.createTextNode('outside')
    document.body.append(outside)
    selection.setBaseAndExtent(first, 1, outside, 3)
    expect(readTextSelection(container)).toBeNull()
    outside.remove()
  })
})
