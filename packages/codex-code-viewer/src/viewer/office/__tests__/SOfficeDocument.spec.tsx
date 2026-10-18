/** @vitest-environment jsdom */
import {Blob} from 'node:buffer'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it} from 'vitest'
import {utils, write} from 'xlsx'
import {SOfficeDocument} from '../SOfficeDocument'

describe('SOfficeDocument', () => {
  afterEach(cleanup)
  it('should decode a transferred XLSX Blob and render its cells', async () => {
    const bytes = write(
      {SheetNames: ['자료'], Sheets: {자료: utils.aoa_to_sheet([['한글 내용']])}},
      {bookType: 'xlsx', type: 'array'},
    )
    render(() => <SOfficeDocument blob={new Blob([bytes])} kind="spreadsheet" />)
    expect(await screen.findByRole('cell', {name: '한글 내용'})).toBeTruthy()
    expect(screen.getByRole('combobox', {name: '시트 선택'}).textContent).toBe('자료')
  })
  it('should show a failure message for corrupt office bytes', async () => {
    render(() => <SOfficeDocument blob={new Blob(['invalid'])} kind="spreadsheet" />)
    expect(await screen.findByText(/XLSX 파일을 읽을 수 없습니다/u)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
