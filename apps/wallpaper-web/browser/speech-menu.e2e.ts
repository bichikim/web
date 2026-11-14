import {expect, test} from 'playwright/test'

test('animates the speech composer in both directions without intrinsic-size interpolation', async ({
  browserName,
  page,
}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'})
  await page.setViewportSize({height: 844, width: 390})
  await page.route('**/models/**/*.poffo', (route) => route.abort())
  await page.goto('/')
  await page.getByRole('button', {name: '대사 선택'}).click()
  const dialog = page.getByRole('dialog', {name: '말하기'})
  await expect(dialog.getByRole('button', {name: '직접 입력'})).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('navigation', {name: '체험 도구'})).toBeVisible()
  const input = dialog.getByRole('textbox', {name: '직접 입력'})
  await expect(input).toBeHidden()
  const visiblePresets = await dialog
    .getByRole('button', {name: /^안녕, 나는 애시야\./})
    .evaluate((preset) => {
      const list = preset.parentElement!
      const bounds = list.getBoundingClientRect()
      return [...list.children].filter((element) => {
        const item = element.getBoundingClientRect()
        return item.top >= bounds.top && item.bottom <= bounds.bottom
      }).length
    })
  expect(visiblePresets).toBe(3)
  const transitions = await dialog
    .getByRole('region', {name: '직접 입력'})
    .evaluate(async (details) => {
      const toggle = async () => {
        const first = details.getBoundingClientRect().height
        await new Promise(requestAnimationFrame)
        details.querySelector('button')!.click()
        const animations = details.getAnimations({subtree: true})
        const heights: number[] = []
        let running = true
        const finished = Promise.all(animations.map((animation) => animation.finished)).then(() => {
          running = false
        })
        const sample = () => {
          heights.push(details.getBoundingClientRect().height)
          if (running) {
            requestAnimationFrame(sample)
          }
        }
        requestAnimationFrame(sample)
        await finished
        await new Promise(requestAnimationFrame)
        const height = details.getBoundingClientRect().height
        return {
          height,
          intermediate: heights.some(
            (value) => value > Math.min(first, height) && value < Math.max(first, height),
          ),
        }
      }
      const opened = await toggle()
      const closed = await toggle()
      return {closed, opened}
    })
  expect(transitions.opened.intermediate).toBe(true)
  expect(transitions.closed.intermediate).toBe(true)
  expect(transitions.opened.height).toBeGreaterThan(transitions.closed.height)
  await dialog.getByRole('button', {name: '직접 입력'}).click()
  await input.fill('오늘도 안녕!')
  await dialog.getByRole('button', {name: '직접 입력'}).focus()
  await page.keyboard.press('Enter')
  await expect(input).toBeHidden()
  // WebKit requires Option+Tab to include links in sequential keyboard navigation.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab')
  await expect(dialog.getByRole('link', {name: 'Supertonic 3 · INT8'})).toBeFocused()
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab')
  await expect(dialog.getByRole('button', {name: '직접 입력'})).toBeFocused()
  await page.keyboard.press('Space')
  await expect(input).toHaveValue('오늘도 안녕!')
})

test('plays a bundled speech preset and stops without fetching synthesis models', async ({
  page,
}) => {
  const external: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4185') {
      external.push(request.url())
    }
  })
  await page.goto('/')
  await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
  await page.getByRole('button', {exact: true, name: '대사 선택'}).click()
  const disclosure = page.getByRole('button', {exact: true, name: '직접 입력'})
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false')
  const preset = page.getByRole('button', {name: /^안녕, 나는 애시야/})
  await preset.click()
  await expect(page.getByRole('status')).toHaveText('말하는 중')
  await page.keyboard.press('Escape')
  const trigger = page.getByRole('button', {exact: true, name: '대사 선택'})
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', {exact: true, name: '정지'})).toBeFocused()
  await expect(page.getByRole('button', {exact: true, name: '정지'})).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(preset).toBeEnabled()
  await expect(preset).toBeFocused()
  await preset.click()
  await expect(page.getByRole('status')).toHaveText('말하는 중')
  await page.getByRole('button', {exact: true, name: '정지'}).click()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(preset).toBeEnabled()
  await expect(preset).toBeFocused()
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false')
  expect(external).toEqual([])
})
