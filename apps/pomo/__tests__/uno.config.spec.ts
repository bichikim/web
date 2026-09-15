/** @vitest-environment node */
// Vite provides the default string export for raw source imports.
// oxlint-disable-next-line import/default
import progressSource from '../src/components/memory-assist/picture-diary/Generation.tsx?raw'
// oxlint-disable-next-line import/default
import loadingSource from '../src/components/p-loading-status/PLoadingStatus.tsx?raw'
// oxlint-disable-next-line import/default
import sceneFallbackSource from '../src/components/p-studio/SceneFallback.tsx?raw'
// oxlint-disable-next-line import/default
import typographySource from '../src/components/typography-classes.ts?raw'
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

it('should extract loading and scene fallback utilities from component constants', async () => {
  const uno = await createGenerator(unoConfig)
  const {css, matched} = await uno.generate(`${loadingSource}\n${sceneFallbackSource}`, {
    safelist: false,
  })

  for (const utility of [
    'min-h-control-sm',
    'animate-spin',
    'pointer-events-none',
    'backdrop-blur-surface',
  ]) {
    expect(matched).toContain(utility)
  }

  for (const shortcut of [
    'pomo-loading',
    'pomo-loading__spinner',
    'pomo-scene-fallback',
    'pomo-scene-fallback__panel',
  ]) {
    expect(matched).not.toContain(shortcut)
    expect(css).not.toContain(`.${shortcut}`)
  }
})

it('should generate CSS for typography constants', async () => {
  const uno = await createGenerator(unoConfig)
  const {css, matched} = await uno.generate(typographySource, {safelist: false})

  for (const utility of ['text-base', 'leading-6', 'text-sm', 'leading-5']) {
    expect(matched).toContain(utility)
  }
  expect(css).toContain('font-size:1rem')
  expect(css).toContain('line-height:1.5rem')
  expect(css).toContain('font-size:0.875rem')
  expect(css).toContain('line-height:1.25rem')
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

it('should keep the default vertical spacing and quarter it beside a safe-area inset', async () => {
  const uno = await createGenerator(unoConfig)
  const {css, matched} = await uno.generate(
    'top-safe-top top-safe-top-mobile bottom-safe-bottom bottom-safe-bottom-mobile',
  )

  for (const utility of [
    'top-safe-top',
    'top-safe-top-mobile',
    'bottom-safe-bottom',
    'bottom-safe-bottom-mobile',
  ]) {
    expect(matched).toContain(utility)
  }

  for (const [selector, property, inset, baseUnits] of [
    ['top-safe-top', 'top', 'top', 6],
    ['top-safe-top-mobile', 'top', 'top', 4],
    ['bottom-safe-bottom', 'bottom', 'bottom', 6],
    ['bottom-safe-bottom-mobile', 'bottom', 'bottom', 4],
  ] as const) {
    const expectedRule = [
      `${property}:calc(var(--pomo-safe-area-inset-${inset}) + calc(1rem / 4 * ${baseUnits}) * `,
      `(1 - 0.75 * sin(atan2(var(--pomo-safe-area-inset-${inset}), 0px))));`,
    ].join('')
    expect(getRuleBody(css, selector)).toContain(expectedRule)
  }
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

it('should extract diary progress selectors from component constants', async () => {
  const uno = await createGenerator(unoConfig)
  const {css} = await uno.generate(progressSource, {safelist: false})

  expect(css).toContain(
    '--progress-fill:linear-gradient(90deg,transparent,currentColor,transparent);',
  )
  expect(css).toContain(
    'background:var(--progress-fill) -50% 0/40% 100% no-repeat,var(--progress-track);',
  )
  expect(css).toContain('::-webkit-progress-value')
  expect(css).toContain('::-moz-progress-bar')
  expect(css).toContain('@media (prefers-reduced-motion: reduce)')
})

it('should isolate icon defaults from sizing utilities across independent CSS chunks', async () => {
  const uno = await createGenerator(unoConfig)
  const options = {preflights: false, safelist: false}
  const icons = await uno.generate('i-tabler-player-play i-pomo-scribble:play', options)
  const sizing = await uno.generate('size-6 w-8 h-5', options)

  expect(icons.css).toContain('@layer pomo-icons{')
  expect(getRuleBody(icons.css, 'i-tabler-player-play')).toContain('width:1em;')
  expect(icons.matched).toContain('i-pomo-scribble:play')
  expect(sizing.css).toContain('@layer pomo-icons;')
  expect(sizing.css).not.toMatch(/@layer[^;{]*\{/u)
  expect(getRuleBody(sizing.css, 'size-6')).toContain('width:1.5rem;')
  expect(getRuleBody(sizing.css, 'w-8')).toContain('width:2rem;')
  expect(getRuleBody(sizing.css, 'h-5')).toContain('height:1.25rem;')
})
