import {describe, expect, it, vi} from 'vitest'

// @ts-expect-error The JavaScript plugin intentionally has no TypeScript declaration file.
import {sortKeysFix} from '../sort-keys-fix.mjs'

const createProperty = (name: string, text: string, parent: {type: string}) => ({
  key: {loc: {end: {column: 1, line: 1}, start: {column: 0, line: 1}}, name, type: 'Identifier'},
  parent,
  text,
  type: 'Property',
})

describe('sortKeysFix', () => {
  it('should report and fix adjacent object keys in ascending order', () => {
    const report = vi.fn()
    const context = {
      options: [],
      report,
      sourceCode: {getText: (node: {text: string}) => node.text},
    }
    const visitor = sortKeysFix.create(context)
    const parent = {type: 'ObjectExpression'}
    const zulu = createProperty('zulu', 'zulu: 1', parent)
    const alpha = createProperty('alpha', 'alpha: 2', parent)

    visitor.ObjectExpression()
    visitor.Property(zulu)
    visitor.Property(alpha)
    visitor['ObjectExpression:exit']()

    expect(report).toHaveBeenCalledOnce()
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({currentName: 'alpha', order: 'asc', prevName: 'zulu'}),
        node: alpha,
      }),
    )

    const [{fix}] = report.mock.calls[0]
    const replaceText = vi.fn((node, text) => ({node, text}))

    expect(fix({replaceText})).toEqual([
      {node: zulu, text: 'alpha: 2'},
      {node: alpha, text: 'zulu: 1'},
    ])
  })

  it('should respect descending natural case-insensitive ordering', () => {
    const report = vi.fn()
    const visitor = sortKeysFix.create({
      options: ['desc', {caseSensitive: false, natural: true}],
      report,
      sourceCode: {getText: (node: {text: string}) => node.text},
    })
    const parent = {type: 'ObjectExpression'}

    visitor.ObjectExpression()
    visitor.Property(createProperty('Item10', 'Item10: 1', parent))
    visitor.Property(createProperty('item2', 'item2: 2', parent))

    expect(report).not.toHaveBeenCalled()
  })

  it('should restart ordering after a spread element', () => {
    const report = vi.fn()
    const visitor = sortKeysFix.create({
      options: [],
      report,
      sourceCode: {getText: (node: {text: string}) => node.text},
    })
    const parent = {type: 'ObjectExpression'}

    visitor.ObjectExpression()
    visitor.Property(createProperty('zulu', 'zulu: 1', parent))
    visitor.SpreadElement({parent})
    visitor.Property(createProperty('alpha', 'alpha: 2', parent))

    expect(report).not.toHaveBeenCalled()
  })
})
