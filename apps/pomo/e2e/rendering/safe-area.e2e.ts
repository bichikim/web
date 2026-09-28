import {expect, test} from '@playwright/test'
import {createJiti} from 'jiti'
import {createGenerator} from 'unocss'

const unoConfig = await createJiti(import.meta.url).import<
  typeof import('../../uno.config').default
>('../../uno.config.ts', {default: true})

const SPACING_CASES = [
  {base: 16, className: 'top-safe-top-mobile', property: 'top'},
  {base: 24, className: 'top-safe-top', property: 'top'},
  {base: 32, className: 'top-modal-top', property: 'top'},
  {base: 20, className: 'top-modal-top-compact', property: 'top'},
  {base: 20, className: 'pt-safe-top-compact', property: 'padding-top'},
  {base: 40, className: 'top-entry-top', property: 'top'},
  {base: 16, className: 'bottom-safe-bottom-mobile', property: 'bottom'},
  {base: 24, className: 'bottom-safe-bottom', property: 'bottom'},
  {base: 20, className: 'pb-safe-bottom-compact', property: 'padding-bottom'},
  {base: 40, className: 'mbe-entry-bottom', property: 'margin-block-end'},
] as const

for (const inset of [0, 0.25, 1, 8, 20, 34]) {
  test(`should quarter the base gap only beside a positive ${inset}px inset`, async ({page}) => {
    const uno = await createGenerator(unoConfig)
    const {css} = await uno.generate(SPACING_CASES.map(({className}) => className).join(' '))
    await page.setContent(
      SPACING_CASES.map(({className}) => `<div class="${className}"></div>`).join(''),
    )
    await page.addStyleTag({content: css})
    await page.evaluate((value) => {
      document.documentElement.style.setProperty('--pomo-safe-area-inset-top', `${value}px`)
      document.documentElement.style.setProperty('--pomo-safe-area-inset-bottom', `${value}px`)
    }, inset)

    await Promise.all(
      SPACING_CASES.map(async ({base, className, property}) => {
        const expected = inset + (inset > 0 ? base / 4 : base)
        await expect(page.locator(`.${className}`)).toHaveCSS(property, `${expected}px`)
      }),
    )
  })
}

test('should keep the top and bottom inset decisions independent in modal height', async ({
  page,
}) => {
  const uno = await createGenerator(unoConfig)
  const {css} = await uno.generate('top-modal-top max-h-modal-top bottom-safe-bottom')
  await page.setContent('<div class="top-modal-top max-h-modal-top bottom-safe-bottom"></div>')
  await page.addStyleTag({content: css})
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--pomo-safe-area-inset-top', '0px')
    document.documentElement.style.setProperty('--pomo-safe-area-inset-bottom', '20px')
  })

  const modal = page.locator('div')
  await expect(modal).toHaveCSS('top', '32px')
  await expect(modal).toHaveCSS('bottom', '26px')
  const viewportHeight = await page.evaluate(() => window.innerHeight)
  await expect(modal).toHaveCSS('max-height', `${viewportHeight - 32 - 28}px`)
})
