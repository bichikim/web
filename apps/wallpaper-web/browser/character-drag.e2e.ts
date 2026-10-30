import {expect, test} from 'playwright/test'

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
