import {expect, test} from 'playwright/test'
import {createDemoDocument, serializeDocument} from '@winter-love/puppet/player'

for (const partCount of [1, 40]) {
  for (const panCount of [1, 20]) {
    test(`should reuse the ${partCount}-part canvas during ${panCount} theme-neutral pans`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          'poffo:rendering:v1',
          JSON.stringify({antialiasing: 'ssaa', renderer: 'webgl'}),
        )
        for (const prototype of [
          WebGLRenderingContext.prototype,
          WebGL2RenderingContext.prototype,
        ]) {
          const clear = prototype.clear
          prototype.clear = function countClears(mask: number) {
            if (this.canvas instanceof HTMLCanvasElement) {
              const count = Number(this.canvas.dataset.themeTestClears ?? 0)
              this.canvas.dataset.themeTestClears = String(count + 1)
            }
            return clear.call(this, mask)
          }
        }
      })
      const demo = createDemoDocument()
      const source = demo.parts[0]!
      const columns = Math.ceil(Math.sqrt(partCount))
      // Tile parts to vary draw count without stacking full-canvas textures.
      const parts = Array.from({length: partCount}, (_, index) => ({
        ...source,
        id: `part-${index}`,
        mesh: {
          ...source.mesh,
          vertices: source.mesh.vertices.map(
            (coordinate, axis) =>
              (coordinate +
                (axis % 2 === 0
                  ? (index % columns) * demo.viewport.width
                  : Math.floor(index / columns) * demo.viewport.height)) /
              columns,
          ),
        },
      }))
      const document = {
        ...demo,
        motions: [],
        parameterBindings: [],
        parameters: [],
        parts,
        scene: {
          roots: parts.map(({id}) => ({
            id,
            kind: 'part' as const,
            locked: false,
            name: id,
            visible: true,
          })),
        },
      }
      await page.goto('/editor')
      await page.getByRole('button', {name: '메인 메뉴'}).click()
      await page.getByLabel('불러오기', {exact: true}).setInputFiles({
        buffer: Buffer.from(serializeDocument(document)),
        mimeType: 'application/json',
        name: 'static-model.json',
      })
      await expect(
        page.getByRole('button', {exact: true, name: `part-${partCount - 1} 레이어 선택`}),
      ).toBeVisible()
      await expect(page.getByRole('status', {name: '데이터 적용 중'})).toHaveCount(0)
      const viewport = page.getByRole('region', {name: '모델 보기'})
      const canvas = viewport.locator('canvas')
      await expect(canvas).toBeVisible()
      // Wait for actual paint boundaries, including observer-driven redraw requests.
      const painted = () =>
        page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            }),
        )
      await viewport.hover({position: {x: 100, y: 100}})
      await painted()
      const baseline = Number(await canvas.getAttribute('data-theme-test-clears'))
      expect(baseline).toBeGreaterThan(0)
      await painted()
      expect(Number(await canvas.getAttribute('data-theme-test-clears'))).toBe(baseline)
      const originalCamera = await viewport.evaluate((element) =>
        element.style.getPropertyValue('--camera-x'),
      )
      for (let index = 0; index < panCount; index += 1) {
        // Each event must reach the camera before the next input.
        // eslint-disable-next-line no-await-in-loop
        await page.mouse.wheel(2, 1)
        // eslint-disable-next-line no-await-in-loop
        await painted()
      }
      await expect
        .poll(() => viewport.evaluate((element) => element.style.getPropertyValue('--camera-x')))
        .not.toBe(originalCamera)
      const extraClears = Number(await canvas.getAttribute('data-theme-test-clears')) - baseline
      test.info().annotations.push({
        description: JSON.stringify({extraClears, panCount, partCount}),
        type: 'GPU clears',
      })
      expect(extraClears).toBe(0)
    })
  }
}
