import {expect, test} from 'playwright/test'

for (const motion of ['reduce', 'no-preference'] as const) {
  test(`preserves widget preferences through every chapter with motion=${motion}`, async ({
    page,
  }) => {
    await page.emulateMedia({reducedMotion: motion})
    await page.goto('/')
    await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
    await page.getByRole('button', {name: '걷기'}).click()
    await page.getByRole('button', {exact: true, name: '표정 선택'}).click()
    await page.getByRole('menuitemradio', {name: '커피 들기'}).click()
    await page.getByRole('button', {name: '설정 열기'}).click()
    await page.getByRole('button', {name: '거리 배경 선택'}).click()
    await page.getByRole('button', {name: '커서 따라보기'}).click()
    const size = page.getByRole('slider', {name: '위젯 크기'})
    await size.focus()
    await page.keyboard.press('End')
    await expect(size).toHaveValue('250')
    await page.getByRole('button', {name: '설정 닫기'}).click()
    await page.getByRole('button', {name: '스크롤로 앱 살펴보기'}).click()
    await expect(page.getByRole('heading', {name: 'YOUR DESKTOP.'})).toBeVisible()
    await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    // Each key depends on the preceding scene committing and releasing its input lock.
    /* eslint-disable no-await-in-loop */
    for (const title of [
      'CHANGE THE VIEW.',
      'OFF THE WALL.',
      'LITTLE DETAILS.',
      'HELLO, CODEX.',
      'ON YOUR DESKTOP.',
    ]) {
      await page.keyboard.press('PageDown')
      await expect(page.getByRole('heading', {name: title})).toBeVisible()
      await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    }
    /* eslint-enable no-await-in-loop */
    await page.getByRole('button', {name: '다시 체험하기'}).click()
    await expect(page.getByRole('navigation', {name: '체험 도구'})).toBeVisible()
    await expect(page.getByRole('button', {name: '걷기'})).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', {exact: true, name: '표정 선택'}).click()
    await expect(page.getByRole('menuitemradio', {name: '커피 들기'})).toBeChecked()
    await page.keyboard.press('Escape')
    await page.getByRole('button', {name: '설정 열기'}).click()
    await expect(page.getByRole('button', {name: '거리 배경 선택'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('button', {name: '커서 따라보기'})).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await expect(page.getByRole('slider', {name: '위젯 크기'})).toHaveValue('250')
  })
}

test('recovers from a failed character download when the user retries', async ({page}) => {
  await page.route('**/models/white-cat/model.poffo', (route) => route.abort(), {times: 1})
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '다시 불러오기'}).click()
  await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('plays music, keeps playback through next-track selection and pauses', async ({page}) => {
  await page.goto('/')
  const audio = page.locator('audio')
  await page.getByRole('button', {exact: true, name: '음악 재생'}).click()
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime))
    .toBeGreaterThan(0)
  const previous = await audio.getAttribute('src')
  await page.getByRole('button', {exact: true, name: '다음 곡'}).click()
  await expect(audio).not.toHaveAttribute('src', previous!)
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime))
    .toBeGreaterThan(0)
  await page.getByRole('button', {exact: true, name: '음악 일시 정지'}).click()
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true)
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
  const preset = page.getByRole('button', {name: /^안녕, 나는 애시야/})
  await preset.click()
  await expect(page.getByRole('status')).toHaveText('말하는 중')
  await page.getByRole('button', {exact: true, name: '정지'}).click()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(preset).toBeEnabled()
  expect(external).toEqual([])
})
