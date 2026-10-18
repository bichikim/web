import {expect, it} from 'vitest'
import {selectRootStyles} from '../select-root-styles'

it('should retain palette dependencies and theme overrides while excluding unrelated document styles', () => {
  const css = selectRootStyles({
    preflights: `button { cursor: pointer; }
      :root { --ink: #222; --text: var(--ink); --unused: red; }
      :root[data-theme="dark"] { --ink: #eee; --unused: blue; }`,
    rules: '.label{fill:var(--text);font-family:var(--font-sans, sans-serif)}',
  })
  expect(css).toContain('--ink:#222')
  expect(css).toContain('--text:var(--ink)')
  expect(css).toContain(':root[data-theme="dark"]{--ink:#eee}')
  expect(css).toContain('font-family:var(--font-sans, sans-serif)')
  expect(css).not.toContain('--unused')
  expect(css).not.toContain('button')
})
