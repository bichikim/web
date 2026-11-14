import {expect, test} from 'playwright/test'
import {createDemoDocument, serializeDocument} from '@winter-love/puppet/player'

test('should keep the Viewer usable with a named CSS canvas color', async ({page}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/viewer')
  await page.addStyleTag({content: ':root { --puppet-color-canvas: rebeccapurple; }'})
  // A class change is a supported trigger for an inherited host theme.
  await page.evaluate(() => document.documentElement.classList.add('host-theme'))
  await expect(page.getByRole('textbox', {exact: true, name: '배경색'})).toHaveValue('#663399')
  await expect(page.getByRole('region', {name: '모델 보기'})).toHaveCSS(
    'background-color',
    'rgb(102, 51, 153)',
  )
  expect(errors).toEqual([])
})

test('should open theme settings for a named CSS color without losing editing controls', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/editor')
  await page.addStyleTag({content: ':root { --puppet-color-accent: rebeccapurple; }'})
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: '색 테마'})
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox', {exact: true, name: '강조색'})).toHaveValue('#663399')
  await dialog.getByRole('button', {exact: true, name: '취소'}).click()
  await expect(page.getByRole('button', {name: '메인 메뉴'})).toBeEnabled()
  expect(errors).toEqual([])
})

test('should preserve CSS-formatted inline colors together with new saved colors on reload', async ({
  page,
}) => {
  await page.goto('/editor')
  await page.evaluate(() =>
    document.documentElement.style.setProperty('--puppet-color-accent', 'rgb(120, 60, 180)'),
  )
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: '색 테마'})
  const panel = dialog.getByRole('textbox', {exact: true, name: '패널'})
  await panel.fill('#202030')
  await panel.press('Tab')
  await dialog.getByRole('button', {exact: true, name: '적용'}).click()
  await page.reload()
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  await expect(dialog.getByRole('textbox', {exact: true, name: '강조색'})).toHaveValue('#783CB4')
  await expect(panel).toHaveValue('#202030')
})

test('should apply every theme setting to controls, hover states and runtime surfaces', async ({
  page,
}) => {
  const colors = [
    ['강조색', 'accent', '#e599ff'],
    ['패널', 'panel', '#20162d'],
    ['캔버스 바탕', 'canvas', '#170d23'],
    ['X축', 'axis-x', '#f080e0'],
    ['Y축', 'axis-y', '#c0ef80'],
    ['Z축', 'axis-z', '#80b0ff'],
    ['낮은 웨이트', 'weight-low', '#6240e0'],
    ['높은 웨이트', 'weight-high', '#e0b040'],
    ['밝은 편집 표시', 'overlay-light', '#f0ffe0'],
    ['어두운 편집 표시', 'overlay-dark', '#241430'],
    ['모달 배경 딤', 'backdrop', '#181030'],
    ['그림자', 'shadow', '#400080'],
    ['3D 미리보기 조명', 'light', '#fff0e0'],
    ['기본 글자', 'text', '#fce9ff'],
    ['보조 글자', 'text-secondary', '#d4b8f0'],
    ['오류색', 'error', '#ff8090'],
    ['경고색', 'warning', '#ffe080'],
    ['흐린 글자', 'text-muted', '#bd8dd4'],
    ['컨트롤 바탕', 'control', '#34213e'],
    ['입력창 바탕', 'input', '#29192f'],
    ['테두리', 'border', '#a85ec5'],
    ['구분선', 'divider', '#833d98'],
    ['선택 바탕', 'selected', '#542b6f'],
    ['호버 바탕', 'hover', '#783d9f'],
    ['강조색 위 글자', 'on-accent', '#200627'],
  ] as const
  await page.addInitScript(() => {
    if (localStorage.getItem('poffo:color-theme:v1') === null) {
      localStorage.setItem(
        'poffo:color-theme:v1',
        JSON.stringify({
          background: '#00ff00',
          ruler: '#ff0000',
          'ruler-text': '#00ff00',
          'ruler-tick': '#0000ff',
        }),
      )
    }
  })
  await page.goto('/editor')
  const menu = page.getByRole('button', {name: '메인 메뉴'})
  await menu.click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(serializeDocument(createDemoDocument())),
    mimeType: 'application/json',
    name: 'model.json',
  })
  const kind = page.getByRole('button', {name: 'Shapes 종류 변경'})
  await expect(kind).toBeVisible()
  await menu.click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: '색 테마'})
  await dialog.locator('summary').click()
  await expect(dialog.getByRole('textbox', {exact: true, name: '기본 바탕'})).toHaveCount(0)
  await expect(dialog.getByRole('textbox', {exact: true, name: '눈금자 바탕'})).toHaveCount(0)
  await expect(dialog.getByRole('textbox', {exact: true, name: '눈금자 글자'})).toHaveCount(0)
  await expect(dialog.getByRole('textbox', {exact: true, name: '눈금선'})).toHaveCount(0)
  for (const [label, , color] of colors) {
    const field = dialog.getByRole('textbox', {exact: true, name: label})
    // One focused color input must commit before moving to the next field.
    // eslint-disable-next-line no-await-in-loop
    await field.fill(color)
    // eslint-disable-next-line no-await-in-loop
    await field.press('Tab')
  }
  await expect(dialog).toHaveCSS('background-color', 'rgb(32, 22, 45)')
  await expect(dialog.getByRole('button', {exact: true, name: '적용'})).toHaveCSS(
    'color',
    'rgb(32, 6, 39)',
  )
  await dialog.getByRole('button', {exact: true, name: '적용'}).click()
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('poffo:color-theme:v1')!),
  )
  expect(stored).toEqual(
    Object.fromEntries(colors.map(([, key, value]) => [key, value.toUpperCase()])),
  )
  await expect(page.getByRole('main').filter({visible: true})).toHaveCSS(
    'background-color',
    'rgb(32, 22, 45)',
  )
  await expect(page.getByRole('region', {name: '모델 보기'})).toHaveCSS(
    'background-color',
    'rgb(23, 13, 35)',
  )
  await expect(page.getByRole('navigation', {name: '작업 공간 이동'})).toHaveCSS(
    'background-color',
    'rgb(52, 33, 62)',
  )
  const ruler = page.getByRole('img', {name: '가로 좌표 자'})
  await expect(ruler).toHaveCSS('background-color', 'rgb(32, 22, 45)')
  await expect(ruler).toHaveCSS('fill', 'rgb(212, 184, 240)')
  await expect(ruler.locator('line').first()).toHaveCSS('stroke', 'rgb(189, 141, 212)')
  await expect(page.getByRole('group', {name: '편집 작업 공간'})).toHaveCSS(
    'background-color',
    'rgb(52, 33, 62)',
  )
  await expect(page.getByRole('region', {name: '모델 보기'})).toHaveCSS(
    'background-image',
    /rgb\(131, 61, 152\)/u,
  )
  await expect(page.getByLabel('레이어 목록 스크롤', {exact: true})).toHaveCSS(
    'scrollbar-color',
    /rgb\((168, 94, 197|189, 141, 212)\) rgb\(32, 22, 45\)/u,
  )
  await menu.click()
  const theme = page.getByRole('button', {exact: true, name: '색 테마'})
  await theme.hover()
  await expect(theme).toHaveCSS('background-color', 'rgb(120, 61, 159)')
  await page.keyboard.press('Escape')
  await kind.click()
  const item = page.getByRole('menuitemradio', {exact: true, name: '일반 그룹'})
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--puppet-color-hover', '#ede9fe')
    document.documentElement.style.setProperty('--puppet-color-text', '#111111')
  })
  await item.hover()
  await expect(item).toHaveCSS('color', 'rgb(17, 17, 17)')
  await expect(item).toHaveCSS('background-color', 'rgb(237, 233, 254)')
  await page.keyboard.press('Escape')
  await page.getByRole('button', {exact: true, name: 'Viewer'}).click()
  await expect(page.getByRole('region', {name: '모델 보기'})).toHaveCSS(
    'background-color',
    'rgb(23, 13, 35)',
  )
  await expect(page.getByRole('slider').first()).toHaveCSS('accent-color', 'rgb(229, 153, 255)')
  const background = page.getByRole('textbox', {exact: true, name: '배경색'})
  await expect(background).toHaveValue('#170D23')
  await page.evaluate(() =>
    document.documentElement.style.setProperty('--puppet-color-canvas', '#132a4b'),
  )
  await expect(background).toHaveValue(/#132a4b/iu)
  await expect(page.getByRole('region', {name: '모델 보기'})).toHaveCSS(
    'background-color',
    'rgb(19, 42, 75)',
  )
  await background.fill('#ffffff')
  await background.press('Tab')
  await expect(page.getByRole('region', {name: '모델 보기'})).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  )
  await page.getByRole('link', {exact: true, name: 'Studio'}).click()
  const graph = page.getByRole('region', {name: '파라미터 연결 그래프'})
  await expect(graph).toBeVisible()
  // Pattern dots have no separate accessible action; inspect them within their named graph.
  await expect(graph.locator('pattern circle').first()).toHaveCSS('fill', 'rgb(131, 61, 152)')
  await page.goto('/converter')
  await expect(page.getByRole('main').filter({visible: true})).toHaveCSS(
    'background-color',
    'rgb(32, 22, 45)',
  )
  await expect(page.getByLabel('모델 파일', {exact: true})).toHaveCSS(
    'background-color',
    'rgb(41, 25, 47)',
  )
  await expect(page.getByLabel('모델 파일', {exact: true})).toHaveCSS(
    'border-top-color',
    'rgb(168, 94, 197)',
  )
})

test('should repaint an open 3D preview when inherited theme colors change', async ({page}) => {
  await page.goto('/editor')
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(serializeDocument(createDemoDocument())),
    mimeType: 'application/json',
    name: 'model.json',
  })
  await page.getByRole('button', {exact: true, name: '모델링'}).click()
  await page.getByRole('button', {name: 'Shapes 종류 변경'}).click()
  await page.getByRole('menuitemradio', {exact: true, name: '3D 디포머'}).click()
  await page.getByRole('button', {exact: true, name: '메시 만들기'}).click()
  const preview = page.getByRole('group', {name: '3D 메시 회전 미리보기'})
  await expect(preview).toBeVisible()
  await page.evaluate(() =>
    document.documentElement.style.setProperty('--puppet-color-control', '#991122'),
  )
  await expect
    .poll(() =>
      preview.evaluate((canvas) => {
        const context = (canvas as HTMLCanvasElement).getContext('webgl2')!
        return Array.from(context.getParameter(context.COLOR_CLEAR_VALUE) as Float32Array).map(
          (channel) => Math.round(channel * 255),
        )
      }),
    )
    .toEqual([153, 17, 34, 255])
})

test('should preview, save and reset error and warning colors independently', async ({page}) => {
  await page.goto('/editor')
  const menu = page.getByRole('button', {name: '메인 메뉴'})
  const dialog = page.getByRole('dialog', {exact: true, name: '색 테마'})
  await menu.click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  const previews = dialog.getByRole('group', {name: '상태색 미리보기'})
  const error = previews.getByText('오류', {exact: true})
  const warning = previews.getByText('경고', {exact: true})
  const defaults = await error.evaluate((element) => getComputedStyle(element).backgroundColor)
  await expect(dialog.getByRole('textbox', {exact: true, name: '오류색'})).toHaveValue('#FF7A76')
  await expect(dialog.getByRole('textbox', {exact: true, name: '경고색'})).toHaveValue('#E5B55A')
  await dialog.getByRole('textbox', {exact: true, name: '오류색'}).fill('#f080c0')
  await dialog.getByRole('textbox', {exact: true, name: '오류색'}).press('Tab')
  await expect(error).toHaveCSS('color', 'rgb(240, 128, 192)')
  await expect(warning).toHaveCSS('color', 'rgb(199, 184, 137)')
  await expect
    .poll(() => error.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(defaults)
  await dialog.getByRole('button', {exact: true, name: '취소'}).click()
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--puppet-color-error'),
    ),
  ).toBe('')
  await menu.click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  await dialog.getByRole('textbox', {exact: true, name: '오류색'}).fill('#f080c0')
  await dialog.getByRole('textbox', {exact: true, name: '경고색'}).fill('#b0e080')
  await dialog.getByRole('textbox', {exact: true, name: '경고색'}).press('Tab')
  await expect(warning).toHaveCSS('color', 'rgb(176, 224, 128)')
  await expect(error).toHaveCSS('color', 'rgb(240, 128, 192)')
  await dialog.getByRole('button', {exact: true, name: '적용'}).click()
  await page.reload()
  await menu.click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  await expect(dialog.getByRole('textbox', {exact: true, name: '오류색'})).toHaveValue('#F080C0')
  await expect(dialog.getByRole('textbox', {exact: true, name: '경고색'})).toHaveValue('#B0E080')
  await expect(error).toHaveCSS('color', 'rgb(240, 128, 192)')
  await expect(warning).toHaveCSS('color', 'rgb(176, 224, 128)')
  await dialog.getByRole('button', {name: '기본값 복원'}).click()
  await expect(error).toHaveCSS('background-color', defaults)
  await dialog.getByRole('button', {exact: true, name: '적용'}).click()
  await page.reload()
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('poffo:color-theme:v1')!)),
  ).toEqual({})
})

test('should apply the accent color to group icons and layer parameter tags', async ({page}) => {
  await page.goto('/editor')
  const menu = page.getByRole('button', {name: '메인 메뉴'})
  await menu.click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(serializeDocument(createDemoDocument())),
    mimeType: 'application/json',
    name: 'model.json',
  })
  const layer = page.getByRole('button', {name: 'mesh-preview 레이어 선택'})
  const group = page
    .getByRole('button', {name: 'Shapes 종류 변경'})
    .locator('[data-layer-icon=group]')
  await expect(group).toHaveCSS('color', 'rgb(229, 181, 90)')
  // The parameter tags are static spans inside the layer's accessible selection action.
  const tag = layer.locator('.puppet-layer-parameter-links > span').first()
  await expect(tag).toBeVisible()
  const previous = await tag.evaluate((element) => getComputedStyle(element).backgroundColor)
  await menu.click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: '색 테마'})
  await dialog.getByRole('textbox', {exact: true, name: '강조색'}).fill('#e599ff')
  await dialog.getByRole('textbox', {exact: true, name: '강조색'}).press('Tab')
  await expect(tag).toHaveCSS('color', 'rgb(229, 153, 255)')
  await expect(group).toHaveCSS('color', 'rgb(229, 153, 255)')
  await expect
    .poll(() => tag.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(previous)
  await dialog.getByRole('button', {exact: true, name: '취소'}).click()
  await expect(tag).toHaveCSS('color', 'rgb(159, 231, 212)')
  await expect(tag).toHaveCSS('background-color', previous)
  await expect(group).toHaveCSS('color', 'rgb(229, 181, 90)')
})

test('should preview, cancel, apply and restore color themes from the editor menu', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/editor')
  const menu = page.getByRole('button', {name: '메인 메뉴'})
  const dialog = page.getByRole('dialog', {exact: true, name: '색 테마'})
  await menu.click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true)
  await expect(dialog.getByRole('button', {exact: true, name: '적용'})).toHaveCSS(
    'color',
    'rgb(7, 17, 15)',
  )
  await expect(dialog.getByRole('textbox', {exact: true, name: '강조색'})).toHaveValue('#64E5C4')
  await dialog.getByRole('textbox', {exact: true, name: '패널'}).fill('#202030')
  await dialog.getByRole('textbox', {exact: true, name: '패널'}).press('Tab')
  await expect(dialog).toHaveCSS('background-color', 'rgb(32, 32, 48)')
  await expect(page.getByRole('main').filter({visible: true}).locator('.layers-panel')).toHaveCSS(
    'background-color',
    'rgb(32, 32, 48)',
  )
  expect(await page.evaluate(() => localStorage.getItem('poffo:color-theme:v1'))).toBeNull()
  await dialog.getByRole('button', {exact: true, name: '취소'}).click()
  await expect(dialog).not.toBeVisible()
  await expect(menu).toBeFocused()
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--puppet-color-panel'),
    ),
  ).toBe('')

  await menu.click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  await dialog.getByRole('textbox', {exact: true, name: '패널'}).fill('#202030')
  await dialog.getByRole('button', {exact: true, name: '적용'}).click()
  await expect(dialog).not.toBeVisible()
  await page.reload()
  await menu.click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  await expect(dialog.getByRole('textbox', {exact: true, name: '패널'})).toHaveValue('#202030')
  await expect(dialog).toHaveCSS('background-color', 'rgb(32, 32, 48)')
  await dialog.getByRole('button', {name: '기본값 복원'}).click()
  await expect(dialog).toHaveCSS('background-color', 'rgb(17, 23, 20)')
  await dialog.getByRole('button', {exact: true, name: '적용'}).click()
  await page.reload()
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--puppet-color-panel'),
    ),
  ).toBe('')
  expect(errors).toEqual([])
})

test('should keep the color picker above the modal and cancel with Escape', async ({page}) => {
  await page.goto('/editor')
  await page.evaluate(() =>
    document.documentElement.style.setProperty('--puppet-color-accent', '#abcdef', 'important'),
  )
  const menu = page.getByRole('button', {name: '메인 메뉴'})
  await menu.click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: '색 테마'})
  await dialog.getByRole('button', {exact: true, name: '강조색 선택'}).click()
  const picker = page.getByRole('dialog', {exact: true, name: '강조색'})
  await expect(picker).toBeVisible()
  expect(await picker.evaluate((element) => element.matches(':popover-open'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(picker).not.toBeVisible()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', {exact: true, name: '적용'}).focus()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', {name: '색 테마 닫기'})).toBeFocused()
  await dialog.getByRole('textbox', {exact: true, name: '강조색'}).fill('#ee99cc')
  await dialog.getByRole('textbox', {exact: true, name: '강조색'}).press('Tab')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(menu).toBeFocused()
  expect(
    await page.evaluate(() => ({
      priority: document.documentElement.style.getPropertyPriority('--puppet-color-accent'),
      value: document.documentElement.style.getPropertyValue('--puppet-color-accent'),
    })),
  ).toEqual({priority: 'important', value: '#abcdef'})
})

test('should keep theme controls usable in a narrow viewport', async ({page}) => {
  await page.setViewportSize({height: 740, width: 390})
  await page.goto('/editor')
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByRole('button', {exact: true, name: '색 테마'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: '색 테마'})
  await dialog.getByText('세부 색상', {exact: true}).click()
  await dialog.getByRole('textbox', {exact: true, name: '테두리'}).fill('#667788')
  await dialog.getByRole('button', {exact: true, name: '적용'}).click()
  await expect(dialog).not.toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('should inherit root colors through shadow DOM and allow per-host overrides', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4180/element.html')
  await page.addStyleTag({
    content: ':root { --puppet-color-panel: #202030; --puppet-color-canvas: #302020; }',
  })
  const original = page.locator('puppet-editor').first()
  await expect(original.locator('.layers-panel')).toBeVisible()
  await expect(original.locator('.layers-panel')).toHaveCSS('background-color', 'rgb(32, 32, 48)')
  await expect(original.locator('.workspace-camera')).toHaveCSS(
    'background-color',
    'rgb(48, 32, 32)',
  )
  await page.evaluate(() => {
    const second = document.createElement('puppet-editor')
    second.id = 'second-editor'
    second.style.setProperty('--puppet-color-panel', '#304050')
    document.body.append(second)
  })
  await expect(page.locator('#second-editor').locator('.layers-panel')).toHaveCSS(
    'background-color',
    'rgb(48, 64, 80)',
  )
  await expect(original.locator('.layers-panel')).toHaveCSS('background-color', 'rgb(32, 32, 48)')
})
