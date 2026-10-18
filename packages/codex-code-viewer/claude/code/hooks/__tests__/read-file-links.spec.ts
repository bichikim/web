import {expect, it} from 'vitest'
import {readFileLinks} from '../read-file-links'

it('should resolve absolute relative encoded and reference file links with their locations', () => {
  const source =
    '[a](/project/a.ts:7:3) [b](./b.ts#L12) [c](file:///project/a%20b.ts#L5C2) [d][ref]\n\n[ref]: src/d.ts:2'
  const result = readFileLinks(source, '/project')
  expect(result.links.map((link) => link.location)).toEqual([
    {column: 3, line: 7, path: '/project/a.ts'},
    {column: 1, line: 12, path: '/project/b.ts'},
    {column: 2, line: 5, path: '/project/a b.ts'},
    {column: 1, line: 2, path: '/project/src/d.ts'},
  ])
  expect(result.text).toContain('[a](file:///project/a.ts#L7C3)')
})
it('should preserve remote outside-workspace malformed links and fenced examples', () => {
  const source =
    '[web](https://example.com/a.ts) [outside](/project-other/a.ts) [parent](../a.ts) [encoded](file:///project/%2e%2e/a.ts) [bad](file:///project/%ZZ.ts) [phone](tel:123)\n```md\n[example](/project/a.ts)\n```'
  expect(readFileLinks(source, '/project')).toEqual({links: [], text: source})
})
it('should retain inline formatting and ignore image destinations', () => {
  const result = readFileLinks('[**a** `code`](/project/a.ts) ![image](/project/b.png)', '/project')
  expect(result.text).toBe('[**a** `code`](file:///project/a.ts#L1C1) ![image](/project/b.png)')
  expect(result.links).toHaveLength(1)
})

it('should keep encoded hash and percent characters distinct in file link targets', () => {
  const result = readFileLinks(
    '[hash](file:///project/a%23b.ts) [percent](file:///project/a%25b.ts)',
    '/project',
  )
  expect(result.links).toEqual([
    {
      href: 'file:///project/a%23b.ts#L1C1',
      location: {column: 1, line: 1, path: '/project/a#b.ts'},
    },
    {
      href: 'file:///project/a%25b.ts#L1C1',
      location: {column: 1, line: 1, path: '/project/a%b.ts'},
    },
  ])
})

it('should resolve basename links with line numbers instead of treating filenames as URL schemes', () => {
  const result = readFileLinks(
    '[manifest](package.json:3:3) [readme](README.md:7) [license](LICENSE:2)',
    '/project',
  )
  expect(result.links.map(({location}) => location)).toEqual([
    {column: 3, line: 3, path: '/project/package.json'},
    {column: 1, line: 7, path: '/project/README.md'},
    {column: 1, line: 2, path: '/project/LICENSE'},
  ])
})
