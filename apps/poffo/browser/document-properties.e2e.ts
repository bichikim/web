import {expect, test} from 'playwright/test'
import {
  createDemoDocument,
  createEmptyDocument,
  serializeDocument,
} from '@winter-love/puppet/player'

test('should focus the newly available add action after removing a breathing setting', async ({
  page,
}) => {
  const document = createEmptyDocument()
  const parameters = createDemoDocument().parameters
  await page.goto('/editor')
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(serializeDocument({...document, parameters})),
    mimeType: 'application/json',
    name: 'effects.json',
  })
  const add = page.getByRole('button', {name: /호흡 파라미터 추가/u})
  await add.click()
  await add.click()
  const remove = page.getByRole('button', {exact: true, name: '호흡 1 삭제'})
  await expect(remove).toBeVisible()
  await expect(add).toHaveCount(0)
  await remove.press('Enter')
  await expect(add).toBeFocused()
})
