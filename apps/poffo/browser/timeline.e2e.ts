import {expect, type Page, test} from 'playwright/test'
import {createDemoDocument, serializeDocument} from '@winter-love/puppet/player'

const openTimeline = async (page: Page) => {
  const document = createDemoDocument()
  const motions = ['first-motion', 'second-motion'].map((id) => ({
    duration: 2,
    id,
    timelineParameterIds: ['angle-x'],
    tracks: [
      {
        keyframes: [{time: 1, value: 10}],
        kind: 'parameter' as const,
        parameterId: 'angle-x',
      },
    ],
  }))
  await page.goto('/editor')
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(serializeDocument({...document, motions})),
    mimeType: 'application/json',
    name: 'timeline.json',
  })
  await page.getByRole('button', {exact: true, name: '애니메이션'}).click()
  await expect(page.getByRole('button', {name: '모션 선택 first-motion'})).toBeVisible()
}

for (const rendererAvailable of [true, false]) {
  test(`should delete a newly inserted keyframe in its own motion (renderer available: ${rendererAvailable})`, async ({
    page,
  }) => {
    if (!rendererAvailable) {
      await page.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function getCanvasContext(
          this: HTMLCanvasElement,
          contextId: string,
          options?: unknown,
        ) {
          return contextId === '2d' ? Reflect.apply(getContext, this, [contextId, options]) : null
        } as typeof getContext
      })
    }
    await openTimeline(page)
    if (!rendererAvailable) {
      await expect(page.getByRole('status', {name: '플레이어 오류'})).toBeVisible()
    }
    await page.getByRole('button', {name: '모션 선택 first-motion'}).click()
    await page.getByRole('option', {exact: true, name: '모든 타임라인 보기'}).click()
    const motion = page.getByRole('region', {exact: true, name: 'second-motion 타임라인'})
    const track = motion.getByRole('group', {name: 'Angle X 트랙'})
    await track.dblclick({position: {x: 22, y: 10}})
    const keyframes = motion.getByRole('button', {name: /Angle X .*초 키프레임/u})
    await expect(keyframes).toHaveCount(2)
    const selected = motion.getByRole('button', {name: /Angle X .*초 키프레임/u, pressed: true})
    await expect(selected).toHaveCount(1)
    await selected.press('Backspace')
    await expect(keyframes).toHaveCount(1)
    await expect(motion.getByRole('button', {name: 'Angle X 1.00초 키프레임'})).toBeVisible()
    await expect(
      page.getByRole('region', {name: 'first-motion 타임라인'}).getByRole('button', {
        name: 'Angle X 1.00초 키프레임',
      }),
    ).toBeVisible()
  })
}

for (const allMotions of [false, true]) {
  test(`should return focus to the track after deleting a keyframe from its menu (all motions: ${allMotions})`, async ({
    page,
  }) => {
    await openTimeline(page)
    if (allMotions) {
      await page.getByRole('button', {name: '모션 선택 first-motion'}).click()
      await page.getByRole('option', {exact: true, name: '모든 타임라인 보기'}).click()
    }
    const timeline = allMotions
      ? page.getByRole('region', {exact: true, name: 'first-motion 타임라인'})
      : page.getByRole('region', {name: 'Timeline'})
    const track = timeline.getByRole('group', {name: 'Angle X 트랙'})
    const marker = timeline.getByRole('button', {name: 'Angle X 1.00초 키프레임'})
    await marker.click({button: 'right'})
    await page.getByRole('menuitem', {name: '키프레임 삭제'}).click()
    await expect(marker).toHaveCount(0)
    await expect(track).toBeFocused()
  })
}

test('should keep focus on an outside control when dismissing a keyframe menu', async ({page}) => {
  await openTimeline(page)
  const marker = page.getByRole('button', {name: 'Angle X 1.00초 키프레임'})
  await marker.click({button: 'right'})
  const menu = page.getByRole('menu', {name: '키프레임 작업'})
  await expect(menu).toBeVisible()
  const playback = page.getByRole('button', {exact: true, name: '재생'})
  await playback.click()
  await expect(menu).toBeHidden()
  await expect(page.getByRole('button', {exact: true, name: '정지'})).toBeFocused()
})

test('should fit the timeline to the visible width and keep the last ruler label inside it', async ({
  page,
}) => {
  await openTimeline(page)
  const track = page.getByRole('group', {name: 'Angle X 트랙'})
  const originalWidth = await track.evaluate((element) => element.getBoundingClientRect().width)
  await page.getByRole('button', {name: /^타임라인 확대율/u}).click()
  await page.getByRole('option', {exact: true, name: '전체 맞춤'}).click()
  await expect
    .poll(() => track.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThan(originalWidth)
  const lastFrame = page.getByText('48f', {exact: true})
  await expect(lastFrame).toBeVisible()
  await expect
    .poll(async () => {
      const label = await lastFrame.boundingBox()
      const row = await track.boundingBox()
      return label === null || row === null ? Infinity : label.x + label.width - row.x - row.width
    })
    .toBeLessThanOrEqual(1)
})

test('should hide the editing overlays during playback and restore them when paused', async ({
  page,
}) => {
  await openTimeline(page)
  const viewport = page.getByRole('region', {name: '모델 보기'})
  const overlays = viewport.locator('.editing-overlays')
  await expect(overlays).toHaveCSS('display', 'contents')
  await page.getByRole('button', {exact: true, name: '재생'}).click()
  await expect(overlays).toHaveCSS('display', 'none')
  await page.getByRole('button', {exact: true, name: '정지'}).click()
  await expect(overlays).toHaveCSS('display', 'contents')
})

test('should retain the focused marker through consecutive keyboard keyframe moves', async ({
  page,
}) => {
  await openTimeline(page)
  const marker = page.getByRole('button', {name: 'Angle X 1.00초 키프레임'})
  await marker.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', {name: 'Angle X 1.04초 키프레임'})).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', {name: 'Angle X 1.08초 키프레임'})).toBeFocused()
})
