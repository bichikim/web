import {expect, test} from 'playwright/test'
import {mkdir, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {resolveControl} from '../pixels/resolve-control'

test('should resolve half-covered RGBA8 samples consistently before reading pixels', async ({
  page,
  browserName,
}, testInfo) => {
  const control = await resolveControl(page)
  const output =
    process.env.POFFO_VALIDATION_OUTPUT === undefined
      ? testInfo.outputPath('artifacts')
      : join(process.env.POFFO_VALIDATION_OUTPUT, browserName)
  await mkdir(output, {recursive: true})
  await writeFile(join(output, 'resolve-control.json'), JSON.stringify(control, null, 2))
  expect(control.error).toBe(0)
  expect(control.samples).toBeGreaterThan(1)
  expect(control.canvasBlit).toEqual(control.explicit)
  const COLORS = 256
  const MAXIMUM = 255
  const HALF = 2
  const expected = Array.from({length: COLORS}, (_value, color) => [
    Math.round(color / HALF),
    Math.round((MAXIMUM - color) / HALF),
    Math.round(color / HALF),
    Math.round(MAXIMUM / HALF),
  ]).flat()
  expect(control.explicit).toEqual(expected)
})
