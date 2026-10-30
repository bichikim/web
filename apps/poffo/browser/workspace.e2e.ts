import {expect, test} from 'playwright/test'
import {createDemoDocument, serializeDocument} from '@winter-love/puppet/player'

for (const path of ['/editor', '/studio', '/viewer', '/converter']) {
  test(`should render ${path} on direct production entry and refresh`, async ({page}) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(path)
    await expect(page).toHaveTitle('Poffo')
    if (path === '/converter') {
      await expect(page.getByRole('heading', {name: 'Poffo 변환기'})).toBeVisible()
    } else {
      await expect(page.getByRole('button', {name: '메인 메뉴'})).toBeVisible()
      await expect(page.getByRole('region', {name: '모델 보기'}).locator('canvas')).toBeVisible()
    }
    await page.reload()
    await expect(page.getByRole('main').filter({visible: true})).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('should serve the local tracking worker, model and WASM assets', async ({request}) => {
  const worker = await request.get('/tracking/worker.js')
  expect(worker.ok()).toBe(true)
  const model = await request.get('/tracking/face.task')
  expect(model.ok()).toBe(true)
  const wasm = await request.get('/tracking/vendor/vision_wasm_internal.wasm')
  expect(wasm.headers()['content-type']).toContain('application/wasm')
})

test('should apply rendering preferences and restore them after a production refresh', async ({
  page,
}) => {
  await page.goto('/viewer')
  await page.getByRole('button', {exact: true, name: '보기 설정'}).click()
  await expect(page.getByText('사용 중: WebGL · SSAA · 2× 해상도')).toBeVisible()
  const previous = await page
    .getByRole('region', {name: '모델 보기'})
    .locator('canvas')
    .elementHandle()
  if (previous === null) {
    throw new Error('Model canvas was not initialized')
  }
  await page.getByRole('button', {name: /^안티앨리어싱/u}).click()
  await page.getByRole('option', {exact: true, name: 'MSAA + 2× 해상도'}).click()
  await expect(page.getByText('사용 중: WebGL · MSAA + 2× 해상도')).toBeVisible()
  expect(await previous.evaluate((canvas) => canvas.isConnected)).toBe(false)
  await page.getByRole('button', {exact: true, name: '보기 설정'}).click()
  await expect(page.getByRole('dialog', {name: '보기 설정'})).not.toBeVisible()
  await page.getByRole('button', {exact: true, name: '보기 설정'}).click()
  await page.getByRole('button', {name: /^안티앨리어싱/u}).click()
  await page.getByRole('option', {exact: true, name: 'SSAA · 2× 해상도'}).click()
  await expect(page.getByText('사용 중: WebGL · SSAA · 2× 해상도')).toBeVisible()
  await page.getByRole('button', {name: /^안티앨리어싱/u}).click()
  await page.getByRole('option', {exact: true, name: 'MSAA + 2× 해상도'}).click()
  await expect(page.getByText('사용 중: WebGL · MSAA + 2× 해상도')).toBeVisible()
  await page.getByRole('button', {name: /^렌더러/u}).click()
  await page.getByRole('option', {exact: true, name: 'WebGL'}).click()
  await page.reload()
  await page.getByRole('button', {exact: true, name: '보기 설정'}).click()
  await expect(page.getByRole('button', {name: /^렌더러/u})).toContainText('WebGL')
  await expect(page.getByRole('button', {name: /^안티앨리어싱/u})).toContainText('MSAA')
  await expect(page.getByText('사용 중: WebGL · MSAA + 2× 해상도')).toBeVisible()
  await page.evaluate(() => {
    history.pushState(null, '', '/converter')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByRole('heading', {name: 'Poffo 변환기'})).toBeVisible()
  await expect(page.getByRole('dialog', {name: '보기 설정'})).not.toBeVisible()
})

test('should recover an unsupported saved renderer when a supported one is selected', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', {configurable: true, value: undefined})
    localStorage.setItem(
      'poffo:rendering:v1',
      JSON.stringify({antialiasing: 'ssaa', renderer: 'webgpu'}),
    )
  })
  await page.goto('/viewer')
  const unavailable = page.getByText('No available renderer for the current environment')
  await expect(unavailable).toBeVisible()
  await page.getByRole('button', {exact: true, name: '보기 설정'}).click()
  await page.getByRole('button', {name: /^렌더러/u}).click()
  await page.getByRole('option', {exact: true, name: 'WebGL'}).click()
  await expect(page.getByText('사용 중: WebGL · SSAA · 2× 해상도')).toBeVisible()
  await expect(page.getByRole('region', {name: '모델 보기'}).locator('canvas')).toBeVisible()
  await expect(unavailable).not.toBeVisible()
})

test('should share model history and retain the canvas and editor panels across pages', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/editor(?:\?|$)/u)
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(serializeDocument(createDemoDocument())),
    mimeType: 'application/json',
    name: 'model.json',
  })
  await expect(page.getByRole('button', {name: 'mesh-preview 레이어 선택'})).toBeVisible()
  await page.getByRole('button', {name: '왼쪽 패널 닫기'}).click()
  await page.getByRole('button', {exact: true, name: '애니메이션'}).click()
  await expect(page.getByRole('complementary', {name: '선택 작업'})).not.toHaveAttribute(
    'aria-busy',
    'true',
  )
  await page.getByRole('button', {exact: true, name: '모델링'}).click()
  await expect(page.getByRole('complementary', {name: '선택 작업'})).not.toHaveAttribute(
    'aria-busy',
    'true',
  )
  const canvas = await page
    .getByRole('region', {name: '모델 보기'})
    .locator('canvas')
    .elementHandle()
  if (canvas === null) {
    throw new Error('Model canvas was not initialized')
  }
  await page.evaluate(() => {
    history.pushState(null, '', '/converter')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByRole('heading', {name: 'Poffo 변환기'})).toBeVisible()
  await page.getByRole('link', {name: '← Poffo 편집기'}).click()
  await expect(page).toHaveURL(/\/editor(?:\?|$)/u)
  expect(await canvas.evaluate((element) => element.isConnected)).toBe(true)
  await page.getByRole('button', {exact: true, name: 'Viewer'}).click()
  await expect(page).toHaveURL(/\/viewer$/u)
  await page.getByRole('link', {exact: true, name: 'Studio'}).click()
  await expect(page).toHaveURL(/\/studio(?:\?|$)/u)
  await page.getByRole('link', {exact: true, name: 'Editor'}).click()
  await expect(page).toHaveURL(/\/editor(?:\?|$)/u)
  expect(await canvas.evaluate((element) => element.isConnected)).toBe(true)
  await expect(page.getByRole('button', {name: '왼쪽 패널 열기'})).toBeVisible()
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await expect(page.getByRole('button', {exact: true, name: '실행 취소'})).toBeEnabled()
  await page.getByRole('button', {exact: true, name: '실행 취소'}).click()
  await page.getByRole('button', {name: '왼쪽 패널 열기'}).click()
  await expect(page.getByLabel('파츠 0개')).toBeVisible()
})

test('should initialize local tracking with a simulated camera and stop it when the page deactivates', async ({
  page,
}) => {
  await page.goto('/studio')
  await page.getByRole('button', {exact: true, name: '카메라 시작'}).click()
  await expect(page.getByRole('status').filter({hasText: '얼굴을 찾는 중'})).toBeVisible()
  await page.getByRole('link', {exact: true, name: 'Editor'}).click()
  await expect(page.getByRole('button', {exact: true, name: '모델링'})).toBeVisible()
  await page.getByRole('button', {exact: true, name: 'Studio'}).click()
  await expect(page.getByRole('status').filter({hasText: '카메라 꺼짐'})).toBeVisible()
})

test('should close view settings after history navigation detaches its native popup', async ({
  page,
}) => {
  await page.goto('/editor')
  await page.getByRole('button', {exact: true, name: 'Studio'}).click()
  await expect(page).toHaveURL(/\/studio(?:\?|$)/u)
  const trigger = page.getByRole('button', {exact: true, name: '보기 설정'})
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
  await expect(page.getByRole('dialog', {name: '보기 설정'})).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/editor(?:\?|$)/u)
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('dialog', {name: '보기 설정'})).toHaveCount(0)
  await trigger.click()
  await expect(page.getByRole('dialog', {name: '보기 설정'})).toBeVisible()
})

for (const height of [480, 240]) {
  test(`should keep view settings compact and nested options clickable at 640 by ${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({height, width: 640})
    await page.goto('/viewer')
    await page.getByRole('button', {exact: true, name: '보기 설정'}).click()
    const settings = page.getByRole('dialog', {name: '보기 설정'})
    const bounds = await settings.boundingBox()
    expect(bounds).not.toBeNull()
    if (bounds === null) {
      throw new Error('View settings did not open')
    }
    expect(bounds.y).toBeGreaterThanOrEqual(0)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height)
    expect(bounds.height).toBeLessThanOrEqual(Math.min(360, height))
    const renderer = settings.getByRole('button', {name: /^렌더러/u})
    await renderer.click()
    await page.getByRole('option', {exact: true, name: 'WebGPU'}).hover()
    await page.keyboard.press('Escape')
    await expect(renderer).toBeFocused()
    await expect(settings).toBeVisible()
    await renderer.click()
    await page.getByRole('option', {exact: true, name: 'WebGL'}).click()
    await expect(renderer).toContainText('WebGL')
    await expect(settings).toBeVisible()
  })
}
