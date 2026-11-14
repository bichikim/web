import {join} from 'node:path'
import {chromium, webkit} from 'playwright'
import {expect as browserExpect} from 'playwright/test'
import {expect, it} from 'vitest'
import {write} from 'xlsx'
import {withViewer} from './with-viewer'

const engines = [
  {engine: chromium, name: 'Chromium'},
  {engine: webkit, name: 'WebKit'},
]
const workbook = write(
  {
    SheetNames: ['Boundary', 'Exceeded'],
    Sheets: {
      Boundary: {
        '!ref': 'A1:CV10000',
        A1: {t: 's', v: 'first'},
        CV10000: {t: 's', v: 'last included'},
      },
      Exceeded: {
        '!ref': 'A1:CW10001',
        A1: {t: 's', v: 'first'},
        CV10000: {t: 's', v: 'last included'},
        CW10001: {t: 's', v: 'outside limit'},
      },
    },
  },
  {bookType: 'xlsx', compression: true, type: 'buffer'},
)

it.each(engines)(
  'should retain boundary cells and disclose truncated XLSX sheets in $name',
  async ({engine}) => {
    await withViewer({engine, files: {'limits.xlsx': workbook}}, async (viewer) => {
      await viewer.page.goto(viewer.url)
      await viewer.app
        .getByRole('combobox', {name: '파일 경로 또는 검색어'})
        .fill(join(viewer.workspace, 'limits.xlsx'))
      await viewer.app.getByRole('button', {exact: true, name: '파일 열기'}).click()
      const notice = viewer.app.getByText('시트는 처음 10,000행·100열까지 표시합니다.', {
        exact: true,
      })
      await browserExpect(viewer.app.getByRole('cell', {exact: true, name: 'first'})).toBeVisible()
      await browserExpect(notice).toHaveCount(0)
      const filter = viewer.app.getByRole('textbox', {name: '행 필터링'})
      await filter.fill('last included')
      await browserExpect(
        viewer.app.getByRole('cell', {exact: true, name: 'last included'}),
      ).toBeAttached()
      await viewer.app.getByRole('combobox', {name: '시트 선택'}).click()
      await viewer.app.getByRole('option', {exact: true, name: 'Exceeded'}).click()
      await browserExpect(notice).toBeVisible()
      await browserExpect(filter).toHaveValue('')
      await filter.fill('last included')
      await browserExpect(
        viewer.app.getByRole('cell', {exact: true, name: 'last included'}),
      ).toBeAttached()
      await filter.fill('outside limit')
      await browserExpect(
        viewer.app.getByRole('cell', {exact: true, name: 'outside limit'}),
      ).toHaveCount(0)
      await browserExpect(
        viewer.app.getByRole('status').filter({hasText: '표시할 행이 없습니다'}),
      ).toBeVisible()
      expect(viewer.errors).toEqual([])
    })
  },
)
