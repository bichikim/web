import {expect, test} from 'playwright/test'
import {
  createDemoDocument,
  getDocumentScene,
  parseDocumentValue,
  serializeDocument,
} from '@winter-love/puppet/player'

test('should insert and delete the keyform at the clicked grid position', async ({page}) => {
  await page.goto('/editor')
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(serializeDocument(createDemoDocument())),
    mimeType: 'application/json',
    name: 'keyforms.json',
  })
  const track = page.getByLabel('Angle X와 Angle Y 2차원 키폼 grid', {exact: true})
  const grid = track.locator('.parameter-grid')
  const markers = track.getByRole('button', {name: /^키폼 선택/u})
  await expect(markers).toHaveCount(9)
  const existing = await markers.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('aria-label')),
  )

  await grid.click({button: 'right', position: {x: 37, y: 42}})
  const menu = page.getByRole('menu', {name: '키폼 작업'})
  await expect(menu.getByRole('menuitem', {name: '키폼 삭제'})).toHaveCount(0)
  await menu.getByRole('menuitem', {name: '키폼 추가'}).click()
  await expect(markers).toHaveCount(10)

  const added = await markers.evaluateAll((elements, labels) => {
    return elements
      .map((element) => element.getAttribute('aria-label'))
      .find((label) => !labels.includes(label))
  }, existing)
  if (!added) {
    throw new Error('Added keyframe was not found')
  }
  const marker = track.getByRole('button', {exact: true, name: added})
  await marker.click({button: 'right'})
  await expect(menu.getByRole('menuitem', {name: '키폼 추가'})).toHaveCount(0)
  await menu.getByRole('menuitem', {name: '키폼 삭제'}).click()
  await expect(marker).toHaveCount(0)
  await expect(markers).toHaveCount(9)
})

test('should insert at the double-click position without a preceding selection', async ({page}) => {
  await page.goto('/editor')
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(serializeDocument(createDemoDocument())),
    mimeType: 'application/json',
    name: 'keyforms.json',
  })
  const track = page.getByLabel('Angle X와 Angle Y 2차원 키폼 grid', {exact: true})
  const grid = track.locator('.parameter-grid')
  const markers = track.getByRole('button', {name: /^키폼 선택/u})
  await expect(markers).toHaveCount(9)
  const bounds = await grid.boundingBox()
  if (bounds === null) {
    throw new Error('Keyform grid was not laid out')
  }
  await grid.dispatchEvent('dblclick', {
    bubbles: true,
    clientX: bounds.x + bounds.width / 4,
    clientY: bounds.y + bounds.height / 4,
  })
  await expect(
    track.getByRole('button', {exact: true, name: '키폼 선택: -15, 15'}),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(markers).toHaveCount(10)
})

test('should use the selected rotation center for keyform mirroring', async ({page}) => {
  const document = createDemoDocument()
  const scene = getDocumentScene(document)
  const rest = [100, 60, 220, 60]
  const roots = scene.roots.map((node) =>
    node.kind === 'group' && node.id === 'shapes'
      ? {
          ...node,
          boneRestPoints: rest,
          bounds: {height: 180, width: 220, x: 0, y: 0},
          columns: 1,
          controlPoints: rest,
          deformerType: 'rotation' as const,
          kind: 'deformer' as const,
          rows: 1,
        }
      : node,
  )
  const model = {...document, scene: {...scene, roots}}
  expect(parseDocumentValue(model)).toMatchObject({ok: true})
  await page.goto('/editor')
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(serializeDocument(model)),
    mimeType: 'application/json',
    name: 'mirror-center.json',
  })
  await page.getByRole('button', {exact: true, name: '키폼 선택: 30, 0'}).click()
  await page.getByRole('button', {exact: true, name: '키폼 도구'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: '키폼 도구'})
  await dialog.getByRole('button', {name: /메시 반전 기준 위치/u}).click()
  await dialog.getByRole('option', {exact: true, name: 'Shapes 중심'}).click()
  await expect(dialog.getByRole('button', {name: /메시 반전 기준 위치/u})).toHaveText('Shapes 중심')
  const center = dialog.getByRole('spinbutton', {exact: true, name: '메시 반전 기준'})
  await expect(center).toHaveValue('160')
  await dialog.getByRole('button', {exact: true, name: '상하'}).click()
  await expect(center).toHaveValue('60')
})
