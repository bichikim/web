import {expect, test} from 'playwright/test'
import {createDemoDocument, serializeDocument} from '@winter-love/puppet/player'

test('should keep rotating a deformer through multiple pointer moves in one undo step', async ({
  page,
}) => {
  await page.goto('/editor')
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(serializeDocument(createDemoDocument())),
    mimeType: 'application/json',
    name: 'deformer.json',
  })
  await page.getByRole('button', {exact: true, name: 'Shapes 종류 변경'}).click()
  await page.getByRole('menuitemradio', {exact: true, name: '자유 변형 디포머'}).click()
  await page.getByRole('button', {exact: true, name: 'Shapes 레이어 선택'}).click()
  const rotation = page.getByRole('button', {exact: true, name: '자유 변형 회전 핸들'})
  const angle = page.getByRole('spinbutton', {exact: true, name: '자유 변형 각도'})
  await expect(angle).toHaveValue('0')
  await expect(rotation).toBeVisible()
  const box = await rotation.boundingBox()
  if (box === null) {
    throw new Error('Deformer rotation control was not laid out')
  }
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  try {
    await page.mouse.move(x + 18, y + 12)
    await expect(angle).not.toHaveValue('0')
    const first = await angle.inputValue()
    await page.mouse.move(x + 44, y + 30)
    await expect(angle).not.toHaveValue(first)
  } finally {
    await page.mouse.up()
  }
  await rotation.press('Control+z')
  await expect(angle).toHaveValue('0')
})
