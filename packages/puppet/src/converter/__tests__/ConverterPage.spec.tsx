/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'

import {createEmptyDocument} from '../../player/create-empty-document'
import {ConverterPage} from '../ConverterPage'
import {convertCmo3} from '../convert-cmo3'

vi.mock('../convert-cmo3', () => ({convertCmo3: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('keeps the latest selected file when an earlier read finishes later', async () => {
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:converted')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.mocked(convertCmo3).mockReturnValue({document: createEmptyDocument(), warnings: []})

  let finishFirst!: (value: ArrayBuffer) => void
  const first = new File(['first'], 'first.cmo3')
  const second = new File(['second'], 'second.cmo3')
  Object.defineProperty(first, 'arrayBuffer', {
    value: () =>
      new Promise<ArrayBuffer>((resolve) => {
        finishFirst = resolve
      }),
  })
  Object.defineProperty(second, 'arrayBuffer', {value: () => Promise.resolve(new ArrayBuffer(2))})

  const view = render(() => <ConverterPage />)
  const input = view.getByLabelText('CMO3 파일')
  fireEvent.change(input, {target: {files: [first]}})
  fireEvent.change(input, {target: {files: [second]}})
  await waitFor(() =>
    expect(view.getByRole('link', {name: 'Puppet JSON 다운로드'})).toHaveAttribute(
      'download',
      'second.puppet.json',
    ),
  )

  finishFirst(new ArrayBuffer(1))
  await waitFor(() => expect(convertCmo3).toHaveBeenCalledTimes(1))
  expect(view.getByRole('link', {name: 'Puppet JSON 다운로드'})).toHaveAttribute(
    'download',
    'second.puppet.json',
  )
  expect(createObjectURL).toHaveBeenCalledTimes(1)
})
