import {expect, test} from 'playwright/test'

test.describe('mobile controls', () => {
  test.use({hasTouch: true, isMobile: true, viewport: {height: 844, width: 390}})

  for (const name of ['표정 선택', '대사 선택', '설정 열기', '다운로드']) {
    test(`keeps ${name} touches out of story gestures and preserves native dismissal`, async ({
      page,
    }) => {
      await page.goto('/')
      await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
      const trigger = page.getByRole('button', {exact: true, name})
      const prevented = await trigger.evaluate((button) => {
        const target = button.querySelector('svg') ?? button
        const dispatch = (type: string, y: number) => {
          const touch = new Touch({clientX: 40, clientY: y, identifier: 1, target})
          const event = new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            changedTouches: [touch],
            touches: type === 'touchend' ? [] : [touch],
          })
          target.dispatchEvent(event)
          return event.defaultPrevented
        }
        dispatch('touchstart', 100)
        const intercepted = dispatch('touchmove', 95)
        dispatch('touchend', 95)
        return intercepted
      })
      expect(prevented, `${name} touch must stay with the browser`).toBe(false)
      await trigger.tap()
      const popover = page.locator(':popover-open')
      await expect(popover).toBeVisible()
      await expect(page.getByRole('navigation', {name: '체험 도구'})).toBeVisible()
      // A second gesture inside the menu must leave both the menu and scene intact.
      await popover.dispatchEvent('wheel', {deltaY: 120})
      await expect(popover).toBeVisible()
      await expect(page.getByRole('heading', {name: 'YOUR DESKTOP.'})).toBeHidden()
      await trigger.tap()
      await expect(popover).toHaveCount(0)
    })
  }

  test('selects expressions and dismisses the menu on an outside touch', async ({page}) => {
    await page.goto('/')
    await expect(page.getByRole('button', {name: '걷기'})).toBeEnabled()
    await page.getByRole('button', {exact: true, name: '표정 선택'}).tap()
    await page.getByRole('menuitemradio', {exact: true, name: '커피 들기'}).tap()
    await expect(page.locator(':popover-open')).toHaveCount(0)
    await page.getByRole('button', {exact: true, name: '표정 선택'}).tap()
    await expect(page.getByRole('menuitemradio', {name: '커피 들기'})).toBeChecked()
    await page.touchscreen.tap(8, 350)
    await expect(page.locator(':popover-open')).toHaveCount(0)
  })
})

test('supports keyboard menu selection, Escape and restored trigger focus', async ({page}) => {
  await page.goto('/')
  await expect(page.getByRole('button', {name: '걷기'})).toBeEnabled()
  const trigger = page.getByRole('button', {exact: true, name: '표정 선택'})
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitemradio', {exact: true, name: '없음'})).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.locator(':popover-open')).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(page.locator(':popover-open')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})
