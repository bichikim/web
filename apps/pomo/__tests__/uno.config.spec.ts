import {createGenerator} from 'unocss'
import {expect, it} from 'vitest'

import unoConfig from '../uno.config'

const getRuleBody = (css: string, selector: string) => {
  const match = new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`).exec(css)

  expect(match).not.toBeNull()

  return match?.[1] ?? ''
}

const getColorSchemeBody = (css: string, scheme: 'dark' | 'light') => {
  const selector = scheme === 'dark' ? ':root\\.dark' : ':root(?!\\.dark)'
  const matches = Array.from(css.matchAll(new RegExp(`${selector} \\{([^}]*)\\}`, 'gu')))
  const match = matches.find((candidate) =>
    candidate[1]?.includes('--pomo-color-background-channels:'),
  )

  expect(match).not.toBeNull()

  return match?.[1] ?? ''
}

it('should generate initial scene fallback shortcuts without extracted source', async () => {
  const uno = await createGenerator(unoConfig)
  const {css, matched} = await uno.generate('', {safelist: true})

  for (const shortcut of [
    'pomo-loading',
    'pomo-loading__spinner',
    'pomo-scene-fallback',
    'pomo-scene-fallback__panel',
  ]) {
    expect(matched).toContain(shortcut)
  }

  const loadingRule = getRuleBody(css, 'pomo-loading')
  const spinnerRule = getRuleBody(css, 'pomo-loading__spinner')
  const sceneFallbackRule = getRuleBody(css, 'pomo-scene-fallback')
  const panelRule = getRuleBody(css, 'pomo-scene-fallback__panel')

  expect(loadingRule).toContain('padding-top:0;')
  expect(loadingRule).toContain('padding-bottom:0;')
  expect(loadingRule).toContain('padding-left:0.75rem;')
  expect(loadingRule).toContain('padding-right:0.75rem;')
  expect(loadingRule).toContain('font-size:0.875rem;')
  expect(loadingRule).toContain('line-height:1.25rem;')
  expect(loadingRule).toContain('font-weight:650;')
  expect(spinnerRule).toContain('width:1.125rem;')
  expect(spinnerRule).toContain('height:1.125rem;')
  expect(spinnerRule).toContain('animation:spin 1s linear infinite;')
  expect(sceneFallbackRule).toContain('position:absolute;')
  expect(sceneFallbackRule).toContain('inset:0;')
  expect(sceneFallbackRule).toContain('display:grid;')
  expect(sceneFallbackRule).toContain('place-items:center;')
  expect(panelRule).toContain('border-style:solid;')
  expect(panelRule).toContain('backdrop-filter:')
})

it('should generate the narrow player container variant', async () => {
  const uno = await createGenerator(unoConfig)
  const {css} = await uno.generate('player-narrow:hidden')

  expect(css).toContain('@container pomo-player (width < 18rem)')
  expect(css).toContain('display:none;')
})

it('should exclude SQL count expressions extracted as utility candidates', async () => {
  const uno = await createGenerator(unoConfig)
  const {css, matched} = await uno.generate('count(*)::integer')

  expect(matched).not.toContain('count(*)::integer')
  expect(css).not.toContain('--count(*)')
})

it('should generate reusable CSS for static runtime surfaces', async () => {
  const uno = await createGenerator(unoConfig)
  const runtimeClasses = [
    '[--pomo-scene-object-position:60%_center]',
    '[animation-duration:var(--pomo-marquee-duration)]',
    '[anchor-name:var(--pomo-volume-popover-anchor)]',
    '[height:var(--pomo-level-height)]',
    '[object-position:var(--pomo-scene-object-position)]',
    '[position-anchor:var(--pomo-volume-popover-anchor)]',
    '[transform:translateX(var(--pomo-swipe-offset))]',
    '[width:var(--pomo-progress-width)]',
    'w-[max(0px,calc(-1*var(--pomo-swipe-offset)))]',
    'w-[max(0px,var(--pomo-swipe-offset))]',
  ]
  const {css, matched} = await uno.generate(
    `pomo-desktop-surface pomo-entry pomo-scribble-mask ${runtimeClasses.join(' ')}`,
  )

  expect(css).toContain(':root:has(.pomo-desktop-surface)')
  expect(css).toContain('.pomo-entry {')
  expect(css).toContain('radial-gradient(')
  expect(css).toContain('ellipse 125% 105% at 0% 108%')
  expect(css).toContain('.pomo-scribble-mask {')
  expect(css).toContain("url('/masks/scribble-frame.svg')")
  for (const runtimeClass of runtimeClasses) {
    expect(matched).toContain(runtimeClass)
  }
  expect(css).toContain('animation-duration:var(--pomo-marquee-duration)')
  expect(css).toContain('width:max(0px,var(--pomo-swipe-offset))')
  expect(css).toContain('width:max(0px,calc(-1 * var(--pomo-swipe-offset)))')
  expect(css).toContain('transform:translateX(var(--pomo-swipe-offset))')
})

it('should generate CSS for Tabler icons used by settings, weather, and modal close', async () => {
  const uno = await createGenerator(unoConfig)
  const {css, matched} = await uno.generate('i-tabler-x i-tabler-bolt i-tabler-cloud-rain', {
    preflights: false,
  })

  expect(matched).toContain('i-tabler-x')
  expect(matched).toContain('i-tabler-bolt')
  expect(matched).toContain('i-tabler-cloud-rain')
  expect(css).toContain('.i-tabler-x')
  expect(css).toContain('.i-tabler-bolt')
  expect(css).toContain('.i-tabler-cloud-rain')
  expect(css).toContain('--un-icon')
})

it('should generate theme utilities from runtime color variables', async () => {
  const uno = await createGenerator(unoConfig)
  const {css} = await uno.generate(
    'bg-background bg-danger/10 text-foreground border-border border-danger/45',
  )

  expect(css).toContain(':root.dark')
  expect(css).not.toContain('data-color-scheme')
  expect(css).toContain(
    '--un-bg-opacity:var(--pomo-color-background-opacity);' +
      'background-color:rgb(var(--pomo-color-background-channels) / var(--un-bg-opacity));',
  )
  expect(css).toContain('background-color:rgb(var(--pomo-color-danger-channels) / 0.1);')
  expect(css).toContain(
    '--un-text-opacity:var(--pomo-color-foreground-opacity);' +
      'color:rgb(var(--pomo-color-foreground-channels) / var(--un-text-opacity));',
  )
  expect(css).toContain(
    '--un-border-opacity:var(--pomo-color-border-opacity);' +
      'border-color:rgb(var(--pomo-color-border-channels) / var(--un-border-opacity));',
  )
  expect(css).toContain('border-color:rgb(var(--pomo-color-danger-channels) / 0.45);')
})

it('should keep light glass surfaces as translucent as their dark equivalents', async () => {
  const uno = await createGenerator(unoConfig)
  const {css} = await uno.generate(
    'bg-surface bg-surface-interactive bg-surface-strong bg-modal-surface bg-player-surface',
  )
  const darkTheme = getColorSchemeBody(css, 'dark')
  const lightTheme = getColorSchemeBody(css, 'light')

  for (const variable of [
    '--pomo-color-modal-surface-opacity',
    '--pomo-color-player-surface-opacity',
    '--pomo-color-surface-opacity',
    '--pomo-color-surface-interactive-opacity',
    '--pomo-color-surface-strong-opacity',
  ]) {
    const darkValue = new RegExp(`${variable}: ([^;]+);`).exec(darkTheme)?.[1]
    const lightValue = new RegExp(`${variable}: ([^;]+);`).exec(lightTheme)?.[1]

    expect(lightValue).toBe(darkValue)
  }
})

it('should theme the orbit border with the foreground color', async () => {
  const uno = await createGenerator(unoConfig)
  const {css} = await uno.generate('', {preflights: true})
  const orbitBorderRule = getRuleBody(css, 'pomo-orbit-border')

  expect(orbitBorderRule).toContain('rgb(var(--pomo-color-foreground-channels) / 96%)')
  expect(orbitBorderRule).not.toContain('rgb(255 255 255')
})
