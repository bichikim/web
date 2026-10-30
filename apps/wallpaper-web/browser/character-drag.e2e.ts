import {expect, test} from 'playwright/test'

test('updates hover when the character finishes loading under a stationary pointer', async ({
  page,
}) => {
  let finishDownload: (() => void) | undefined
  const download = new Promise<void>((resolve) => {
    finishDownload = resolve
  })
  await page.route('**/models/white-cat/model.poffo', async (route) => {
    await download
    await route.continue()
  })
  const requested = page.waitForRequest('**/models/white-cat/model.poffo')
  try {
    await page.goto('/')
    await requested
    const character = page.getByRole('button', {name: '흰 고양이 위젯. 드래그해서 이동'})
    const bounds = await character.boundingBox()
    if (bounds === null) {
      throw new Error('Character bounds are missing')
    }
    await page.mouse.move(bounds.x + bounds.width * 0.58, bounds.y + bounds.height * 0.55)
    await expect(character).toHaveCSS('cursor', 'default')
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    finishDownload?.()
    await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
    await expect(character).toHaveCSS('cursor', 'grab')
    await expect(page.getByRole('tooltip')).toBeVisible()
  } finally {
    finishDownload?.()
  }
})

test('starts dragging only on the visible character and keeps the capture outside its silhouette', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
  const character = page.getByRole('button', {name: '흰 고양이 위젯. 드래그해서 이동'})
  const initial = await character.boundingBox()
  if (initial === null) {
    throw new Error('Character bounds are missing')
  }
  const transparent = {x: initial.x + initial.width * 0.05, y: initial.y + initial.height * 0.05}
  await page.mouse.move(transparent.x, transparent.y)
  await page.mouse.down()
  await page.mouse.move(transparent.x + 50, transparent.y + 30, {steps: 3})
  await page.mouse.up()
  const after = await character.boundingBox()
  expect(after?.x).toBeCloseTo(initial.x, 1)
  expect(after?.y).toBeCloseTo(initial.y, 1)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await expect(character).toHaveCSS('cursor', 'default')
  const body = {x: initial.x + initial.width * 0.58, y: initial.y + initial.height * 0.55}
  await page.mouse.move(body.x, body.y)
  await expect(page.getByRole('tooltip')).toBeVisible()
  await expect(character).toHaveCSS('cursor', 'grab')
  await page.mouse.down()
  await expect(character).toHaveCSS('cursor', 'grabbing')
  await page.mouse.move(body.x + 120, body.y - 80, {steps: 4})
  await page.mouse.up()
  const moved = await character.boundingBox()
  expect(moved?.x).toBeCloseTo(initial.x + 120, 1)
  expect(moved?.y).toBeCloseTo(initial.y - 80, 1)
})

test('clears hover when the bottom boundary leaves the released pointer over transparent pixels', async ({
  page,
}) => {
  await page.goto('/')
  const pause = page.getByRole('button', {exact: true, name: '일시 정지'})
  await expect(pause).toBeVisible()
  await pause.click()
  const character = page.getByRole('button', {name: '흰 고양이 위젯. 드래그해서 이동'})
  const initial = await character.boundingBox()
  if (initial === null) {
    throw new Error('Character bounds are missing')
  }
  const start = {x: initial.x + initial.width * 0.65, y: initial.y + initial.height * 0.35}
  await page.mouse.move(start.x, start.y)
  await expect(character).toHaveCSS('cursor', 'grab')
  await page.mouse.down()
  await page.mouse.move(1100, 892, {steps: 3})
  await expect(character).toHaveCSS('cursor', 'grabbing')
  const constrained = await character.boundingBox()
  if (constrained === null) {
    throw new Error('Character bounds are missing')
  }
  expect(constrained.y - initial.y).toBeLessThan(892 - start.y)
  expect(1100).toBeGreaterThan(constrained.x)
  expect(1100).toBeLessThan(constrained.x + constrained.width)
  expect(892).toBeGreaterThan(constrained.y)
  expect(892).toBeLessThan(constrained.y + constrained.height)
  await page.mouse.up()
  await expect(character).toHaveCSS('cursor', 'default')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})

test.describe('mobile character drag', () => {
  test.use({hasTouch: true, isMobile: true, viewport: {height: 844, width: 390}})

  test('ignores a touch starting on transparent pixels and drags from the character', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
    const character = page.getByRole('button', {name: '흰 고양이 위젯. 드래그해서 이동'})
    const initial = await character.boundingBox()
    if (initial === null) {
      throw new Error('Character bounds are missing')
    }
    const session = await context.newCDPSession(page)
    const drag = async (x: number, y: number) => {
      await session.send('Input.dispatchTouchEvent', {touchPoints: [{x, y}], type: 'touchStart'})
      await session.send('Input.dispatchTouchEvent', {
        touchPoints: [{x: x + 40, y: y + 30}],
        type: 'touchMove',
      })
      await session.send('Input.dispatchTouchEvent', {touchPoints: [], type: 'touchEnd'})
    }
    await drag(initial.x + initial.width * 0.05, initial.y + initial.height * 0.05)
    const after = await character.boundingBox()
    expect(after?.x).toBeCloseTo(initial.x, 1)
    expect(after?.y).toBeCloseTo(initial.y, 1)
    await drag(initial.x + initial.width * 0.58, initial.y + initial.height * 0.55)
    const moved = await character.boundingBox()
    expect(moved?.x).toBeCloseTo(initial.x + 40, 1)
    expect(moved?.y).toBeCloseTo(initial.y + 30, 1)
    await expect(page.getByRole('navigation', {name: '체험 도구'})).toBeVisible()
  })
})
