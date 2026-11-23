import {expect, test} from '@playwright/test'

test('should convert pasted numbers grouped with narrow no-break spaces', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await page.getByRole('button', {exact: true, name: '도구'}).click()

  const dialog = page.getByRole('dialog', {exact: true, name: '도구'})
  const input = dialog.getByRole('textbox', {name: '변환할 값'})
  const result = dialog.getByRole('region', {name: '결과'})
  await expect(result.getByText('3.28083989501 ft')).toBeVisible()

  const paste = async (value: string) => {
    await page.evaluate((text) => navigator.clipboard.writeText(text), value)
    await input.press('ControlOrMeta+a')
    await input.press('ControlOrMeta+v')
    await expect(input).toHaveValue(value)
  }

  await paste('1\u202f000.5')
  await expect(result.getByText('3,282.48031496 ft')).toBeVisible()

  await paste('1\u202f00')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(dialog.getByText('올바른 값을 입력해주세요.')).toBeVisible()
})
