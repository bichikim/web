import {join} from 'node:path'
import {expect} from 'playwright/test'
import {withViewer} from '../../src/preview/__tests__/with-viewer'

/** Prepares a separate viewer and starts real XLSX parsing only when dispatched by the trial. */
export const createOfficeLoad = async (workbook: Uint8Array) => {
  const ready = Promise.withResolvers<void>()
  const begin = Promise.withResolvers<void>()
  const started = Promise.withResolvers<void>()
  let stopped = false
  const result = withViewer({files: {'dense.xlsx': workbook}}, async (viewer) => {
    await viewer.page.goto(viewer.url)
    await expect(viewer.app.getByRole('combobox', {name: '파일 경로 또는 검색어'})).toBeEnabled()
    ready.resolve()
    await begin.promise
    if (stopped) {
      return
    }
    viewer.page.on('request', (request) => {
      if (request.url().endsWith('/tool') && request.postDataJSON()?.name === 'code.media') {
        started.resolve()
      }
    })
    await viewer.app
      .getByRole('combobox', {name: '파일 경로 또는 검색어'})
      .fill(join(viewer.workspace, 'dense.xlsx'))
    await viewer.app.getByRole('button', {exact: true, name: '파일 열기'}).click()
    await expect(viewer.app.getByRole('cell', {exact: true, name: '0:0'})).toBeVisible()
  })
  const settled = Promise.allSettled([result])
  result.catch((error: unknown) => {
    ready.reject(error)
    started.reject(error)
  })
  started.promise.catch(() => undefined)
  await ready.promise
  return {
    close: async () => {
      stopped = true
      begin.resolve()
      await settled
    },
    result,
    start: async () => {
      begin.resolve()
      await started.promise
    },
  }
}
