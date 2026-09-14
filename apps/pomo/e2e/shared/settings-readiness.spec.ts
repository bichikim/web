import {expect, test} from '@playwright/test'

import {enterFocusRoom, openSettings} from '../helpers/settings'

test('should wait for settings content until its module is released', async ({page}) => {
  const release = Promise.withResolvers<void>()
  let isReady = false
  await page.route('**/src/components/settings/Content.tsx*', async (route) => {
    await release.promise
    await route.continue()
  })

  try {
    await page.goto('/')
    await enterFocusRoom(page)
    await Promise.all([
      openSettings(page).then(() => {
        isReady = true
      }),
      (async () => {
        const dialog = page.getByRole('dialog', {name: 'Pomofi 설정'})
        await expect(dialog.getByRole('status')).toHaveText('내용을 준비하고 있어요…')
        await expect(dialog.getByRole('tabpanel', {exact: true, name: '일반'})).toHaveCount(0)
        expect(isReady).toBe(false)
        release.resolve()
      })(),
    ])
    await expect(page.getByRole('button', {name: /^테마 /u})).toBeEnabled()
  } finally {
    release.resolve()
    if (!page.isClosed()) {
      await page.unrouteAll({behavior: 'wait'})
    }
  }
})
