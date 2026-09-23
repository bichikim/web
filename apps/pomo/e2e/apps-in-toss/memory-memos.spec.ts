import {expect, test} from '@playwright/test'

import type * as Repository from '../../src/features/memory-assist/repository'
import type * as Schedule from '../../src/features/memory-assist/schedule'

test('should preserve scheduled and delivered times through Toss dev storage and reload', async ({
  page,
}, information) => {
  await page.addInitScript(() => {
    // Devtools replaces the SDK but does not supply the native-storage routing marker.
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem('PARAGLIDE_LOCALE', 'ko')
  })
  await page.goto('/')
  await expect(page.getByRole('button', {exact: true, name: '시작하기'})).toBeVisible()
  await page.waitForFunction(() => '__ait' in globalThis.window)

  // Exercise the production scheduler and default repository without replacing storage methods.
  const deliveredMemo = await page.evaluate(async () => {
    const schedulePath = '/src/features/memory-assist/schedule.ts'
    const repositoryPath = '/src/features/memory-assist/repository.ts'
    const schedule: typeof Schedule = await import(/* @vite-ignore */ schedulePath)
    const repository: typeof Repository = await import(/* @vite-ignore */ repositoryPath)
    const memo = schedule.createMemoryMemo({
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      id: 'scheduled-delivery-test',
      now: new Date('2026-09-04T03:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '예약과 전달 시각 보존 확인',
    })
    const delivered = schedule.advanceMemoryMemo({
      kind: 'exact',
      memo,
      now: new Date('2026-09-04T04:05:00.000Z'),
      random: () => 0,
    })
    await repository.writeMemoryMemos([delivered])
    return delivered
  })
  expect(deliveredMemo).toMatchObject({
    exactReminderAt: null,
    nextExactReminderAt: null,
    reminderEvents: [
      {
        deliveredAt: '2026-09-04T04:05:00.000Z',
        kind: 'exact',
        scheduledAt: '2026-09-04T04:00:00.000Z',
      },
    ],
    reminderHistory: ['2026-09-04T04:05:00.000Z'],
  })

  const storageKey = 'pomo:memory-memos:v1'
  const snapshot = [deliveredMemo]
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(`__ait_storage:${key}`) ?? 'null'),
        storageKey,
      ),
    )
    .toEqual(snapshot)
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), storageKey),
  ).toEqual(snapshot)

  await page.evaluate((key) => localStorage.removeItem(key), storageKey)
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull()
  await page.reload()
  const restored = await page.evaluate(async () => {
    const repositoryPath = '/src/features/memory-assist/repository.ts'
    const repository: typeof Repository = await import(/* @vite-ignore */ repositoryPath)
    return repository.readMemoryMemos()
  })
  expect(restored).toEqual([deliveredMemo])
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), storageKey),
  ).toEqual(snapshot)

  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await page.getByRole('button', {exact: true, name: '기억보조'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: 'Pomofi 기억 보조'})
  await dialog.getByRole('tab', {exact: true, name: '메모'}).click()
  await expect(dialog.getByText(deliveredMemo.text, {exact: true})).toBeVisible()
  await page.screenshot({path: information.outputPath('restored-reminder.png')})
})
