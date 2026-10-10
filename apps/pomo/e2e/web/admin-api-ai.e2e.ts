import {expect, test} from '@playwright/test'
import type {AdminApiAiPage} from '../../src/features/admin-api-ai/contracts'

const FIXTURE_ORIGIN = 'http://127.0.0.1:44175'
const initial: AdminApiAiPage = {
  catalog: [
    {label: '', model: 'gpt-6-luna', providerId: 'openai', removable: false},
    {
      label: '',
      model: 'google/gemma-4-26b-a4b-it:free',
      providerId: 'openrouter',
      removable: false,
    },
  ],
  providers: [
    {
      id: 'openai',
      models: {'cloud-text': 'gpt-6-luna', history: 'gpt-6-luna'},
      protocol: 'openai-responses-background',
    },
    {
      id: 'openrouter',
      models: {'cloud-text': 'google/gemma-4-26b-a4b-it:free'},
      protocol: 'openrouter-responses-queue',
    },
  ],
  revision: 0,
  routes: [{model: 'gpt-6-luna', providerId: 'openai'}],
  source: 'environment',
}

test('should save a fallback order and retain it after reload at desktop and mobile widths', async ({
  page,
}, testInfo) => {
  let stored = initial
  await page.route(`${FIXTURE_ORIGIN}/api/admin/api-ai*`, async (route) => {
    if (route.request().method() === 'PUT') {
      const update = route.request().postDataJSON()
      expect(update.revision).toBe(stored.revision)
      stored = {...stored, ...update, revision: stored.revision + 1, source: 'admin'}
    }
    await route.fulfill({json: stored})
  })
  await page.goto(`${FIXTURE_ORIGIN}/admin/api-ai`)
  await expect(page.getByRole('combobox', {name: '1순위 모델 ID'})).toHaveValue('gpt-6-luna')
  await page.getByRole('button', {name: '모델 추가'}).click()
  await expect(page.getByRole('combobox', {name: '2순위 제공자'})).toHaveValue('openrouter')
  await expect(page.getByRole('combobox', {name: '2순위 모델 ID'})).toHaveValue(
    'google/gemma-4-26b-a4b-it:free',
  )
  await page.getByRole('button', {name: '2순위 위로 이동'}).click()
  await expect(page.getByRole('combobox', {name: '1순위 모델 ID'})).toHaveValue(
    'google/gemma-4-26b-a4b-it:free',
  )
  await page.getByRole('button', {name: '1순위 아래로 이동'}).click()
  await expect(page.getByRole('combobox', {name: '1순위 모델 ID'})).toHaveValue('gpt-6-luna')
  await page.getByRole('button', {name: '2순위 위로 이동'}).click()
  await page.getByRole('button', {name: '순서 저장'}).click()
  await expect(page.getByRole('status')).toHaveText('모델 순서를 저장했어요.')
  expect(stored.routes.map((route) => route.providerId)).toEqual(['openrouter', 'openai'])
  await page.reload()
  await expect(page.getByRole('combobox', {name: '1순위 제공자'})).toHaveValue('openrouter')
  await expect(page.getByRole('combobox', {name: '1순위 모델 ID'})).toHaveValue(
    'google/gemma-4-26b-a4b-it:free',
  )
  await expect(page.getByRole('combobox', {name: '2순위 모델 ID'})).toHaveValue('gpt-6-luna')
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await expect(page.getByRole('combobox', {name: '작업 종류'})).toHaveCount(0)
  expect(stored).not.toHaveProperty('allowPaidFallback')
  expect(stored).not.toHaveProperty('kind')
  await page.screenshot({fullPage: true, path: testInfo.outputPath('admin-api-ai-desktop.png')})
  await page.setViewportSize({height: 844, width: 390})
  await expect(page.getByRole('button', {name: '순서 저장'})).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
  await page.getByRole('combobox', {name: '1순위 모델 ID'}).focus()
  await expect(page.getByRole('combobox', {name: '1순위 모델 ID'})).toBeFocused()
  await page.screenshot({fullPage: true, path: testInfo.outputPath('admin-api-ai-mobile.png')})
})

test('should register provider models, test without fallback, and select the saved model from a dropdown', async ({
  page,
}, testInfo) => {
  let stored = initial
  let tests = 0
  await page.route(`${FIXTURE_ORIGIN}/api/admin/api-ai**`, async (route) => {
    const request = route.request()
    if (request.url().endsWith('/test')) {
      expect(request.postDataJSON()).toEqual({model: 'custom:free', providerId: 'openrouter'})
      tests += 1
      await route.fulfill({
        json:
          tests === 1
            ? {
                details: 'Shared capacity exhausted',
                kind: 'failure',
                message: 'Provider returned error',
                retryAfter: '60',
                status: 429,
              }
            : {kind: 'success', modelId: 'actual-custom', text: '안녕하세요!', tokenCount: 12},
      })
      return
    }
    if (request.url().endsWith('/models')) {
      const update = request.postDataJSON()
      expect(update.revision).toBe(stored.revision)
      expect(update).not.toHaveProperty('routes')
      stored = {
        ...stored,
        catalog:
          update.operation === 'register'
            ? [...stored.catalog, {...update.entry, removable: true}]
            : stored.catalog.filter(
                (entry) =>
                  entry.model !== update.entry.model ||
                  entry.providerId !== update.entry.providerId,
              ),
        revision: stored.revision + 1,
        source: 'admin',
      }
    } else if (request.method() === 'PUT') {
      const update = request.postDataJSON()
      expect(update.revision).toBe(stored.revision)
      stored = {...stored, revision: stored.revision + 1, routes: update.routes}
    }
    await route.fulfill({json: stored})
  })
  await page.goto(`${FIXTURE_ORIGIN}/admin/api-ai-models`)
  await expect(page.getByRole('article', {name: 'openai gpt-6-luna'})).toBeVisible()
  await page.getByRole('combobox', {exact: true, name: '제공자'}).selectOption('openrouter')
  await expect(page.getByRole('article', {name: 'openai gpt-6-luna'})).toHaveCount(0)
  await page.getByRole('textbox', {exact: true, name: '모델 ID'}).fill('custom:free')
  await page.getByRole('textbox', {name: '표시 이름 (선택)'}).fill('테스트 모델')
  await page.getByRole('button', {exact: true, name: '모델 등록'}).click()
  await expect(page.getByRole('status')).toHaveText('지원 모델 목록을 저장했어요.')
  await expect(page.getByRole('combobox', {exact: true, name: '제공자'})).toHaveValue('openrouter')
  expect(stored.routes).toEqual(initial.routes)
  const custom = page.getByRole('article', {name: 'openrouter custom:free'})
  await expect(custom).toContainText('테스트 모델')
  await custom.getByRole('button', {name: '안녕 테스트'}).click()
  await expect(custom.getByRole('alert')).toContainText('Shared capacity exhausted')
  expect(tests).toBe(1)
  await custom.getByRole('button', {name: '안녕 테스트'}).click()
  await expect(custom.getByRole('status')).toContainText('actual-custom')
  await expect(custom.getByRole('status')).toContainText('안녕하세요!')
  await page.screenshot({fullPage: true, path: testInfo.outputPath('model-registry-desktop.png')})
  await page.setViewportSize({height: 844, width: 390})
  await expect(custom.getByRole('button', {name: '안녕 테스트'})).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
  await page.screenshot({fullPage: true, path: testInfo.outputPath('model-registry-mobile.png')})
  await page.reload()
  await page.getByRole('combobox', {exact: true, name: '제공자'}).selectOption('openrouter')
  await expect(custom).toContainText('테스트 모델')
  await page.getByRole('link', {name: '모델 실행 순서'}).click()
  await page.getByRole('combobox', {name: '1순위 제공자'}).selectOption('openrouter')
  await page.getByRole('combobox', {name: '1순위 모델 ID'}).selectOption('custom:free')
  await page.getByRole('button', {name: '순서 저장'}).click()
  await expect(page.getByRole('status')).toHaveText('모델 순서를 저장했어요.')
  await expect(page.getByRole('combobox', {name: '1순위 모델 ID'})).toHaveValue('custom:free')
  expect(stored.catalog.some((entry) => entry.model === 'custom:free')).toBe(true)
})
