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

test('downloads the chosen desktop installer from the latest release', async ({page}) => {
  const origin = 'https://wallpaper-files.pomofi.io'
  const version = '1.2.3'
  const base = `${origin}/releases/${version}/100-1`
  await page.route(`${origin}/releases/latest.json`, (route) =>
    route.fulfill({
      headers: {'access-control-allow-origin': '*'},
      json: {
        build: '100-1',
        channel: 'beta',
        macosNotarized: true,
        sizes: {
          'macos-arm64': 95_000_000,
          'macos-x64': 96_000_000,
          'windows-x64': 97_000_000,
        },
        version,
      },
    }),
  )
  await page.route(`${base}/*`, (route) => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1)
    return route.fulfill({
      body: 'installer fixture',
      contentType: 'application/octet-stream',
      headers: {'content-disposition': `attachment; filename="Poffo-Wallpaper-${version}-${name}"`},
    })
  })

  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '다운로드'}).click()
  const dialog = page.getByRole('dialog', {name: 'Poffo Wallpaper 다운로드'})
  const installers = [
    {file: 'macos-arm64.dmg', platform: 'macOS · Apple Silicon', size: 95},
    {file: 'macos-x64.dmg', platform: 'macOS · Intel', size: 96},
    {file: 'windows-x64.exe', platform: 'Windows · 64비트', size: 97},
  ]
  await expect(dialog.getByRole('link')).toHaveCount(installers.length)
  await expect(dialog.getByText(/베타|공증|게시자 확인/u)).toHaveCount(0)
  await Promise.all(
    installers.map(({file, platform, size}) =>
      expect(
        dialog.getByRole('link', {exact: true, name: `${platform} v${version} ${size} MB`}),
      ).toHaveAttribute('href', `${base}/${file}`),
    ),
  )
  const downloading = page.waitForEvent('download')
  await dialog.getByRole('link', {name: /Apple Silicon/u}).click()
  expect((await downloading).suggestedFilename()).toBe(`Poffo-Wallpaper-${version}-macos-arm64.dmg`)
})
