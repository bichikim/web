/** @vitest-environment jsdom */
import {expect, test} from 'vitest'
import {withScrollPreserved} from '../with-scroll-preserved'

test('should keep both scroll axes when a synchronous change reorders a subtree', () => {
  const root = document.createElement('div')
  const content = document.createElement('div')
  root.append(content)
  content.scrollLeft = 40
  content.scrollTop = 90
  withScrollPreserved({
    change: () => {
      root.prepend(document.createElement('span'))
      content.scrollLeft = 0
      content.scrollTop = 0
    },
    element: root,
  })
  expect(content.scrollLeft).toBe(40)
  expect(content.scrollTop).toBe(90)
})

test('should restore offsets and propagate an operation failure', () => {
  const root = document.createElement('div')
  const content = document.createElement('div')
  root.append(content)
  content.scrollTop = 50
  expect(() =>
    withScrollPreserved({
      change: () => {
        content.scrollTop = 0
        throw new Error('mutation failed')
      },
      element: root,
    }),
  ).toThrow('mutation failed')
  expect(content.scrollTop).toBe(50)
})
