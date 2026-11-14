/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'

import {createEmptyDocument} from '@winter-love/puppet/player'
import {ConverterPage} from '../ConverterPage'
import flushPromises from 'flush-promises'
import {
  convertCmo3,
  convertCubismArchive,
  convertMoc3,
  readCubismTexture,
} from '@winter-love/puppet/converter'

vi.mock('../../../../../packages/puppet/src/converter/convert-cmo3', () => ({convertCmo3: vi.fn()}))
vi.mock('../../../../../packages/puppet/src/converter/convert-moc3', () => ({convertMoc3: vi.fn()}))
vi.mock('../../../../../packages/puppet/src/converter/convert-cubism-archive', () => ({
  convertCubismArchive: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:converted')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const result = {document: createEmptyDocument(), warnings: []}
  vi.mocked(convertCmo3).mockReturnValue(result)
  vi.mocked(convertMoc3).mockReturnValue(result)
  vi.mocked(convertCubismArchive).mockReturnValue(result)
})

const file = (name: string, bytes = new Uint8Array([1])) => {
  const source = new File([bytes], name)
  Object.defineProperty(source, 'arrayBuffer', {
    configurable: true,
    value: () => Promise.resolve(bytes.buffer),
  })
  return source
}

const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/qV8AAAAASUVORK5CYII=',
    'base64',
  ),
)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('should keep the latest selected file when an earlier read finishes later', async () => {
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
  const input = view.getByLabelText('모델 파일')
  fireEvent.change(input, {target: {files: [first]}})
  fireEvent.change(input, {target: {files: [second]}})
  await waitFor(() =>
    expect(view.getByRole('link', {name: 'Poffo JSON 다운로드'})).toHaveAttribute(
      'download',
      'second.poffo.json',
    ),
  )

  finishFirst(new ArrayBuffer(1))
  await waitFor(() => expect(convertCmo3).toHaveBeenCalledTimes(1))
  expect(view.getByRole('link', {name: 'Poffo JSON 다운로드'})).toHaveAttribute(
    'download',
    'second.poffo.json',
  )
  expect(createObjectURL).toHaveBeenCalledTimes(1)
})

test('should convert MOC3 with PNG textures in editable atlas order', async () => {
  const view = render(() => <ConverterPage />)
  const model = file('avatar.MOC3')
  fireEvent.change(view.getByLabelText('모델 파일'), {target: {files: [model]}})
  expect(convertMoc3).not.toHaveBeenCalled()
  expect(await view.findByRole('alert')).toHaveTextContent('PNG 텍스처 파일이 없습니다')
  expect(view.queryByRole('link', {name: 'Poffo JSON 다운로드'})).not.toBeInTheDocument()
  const first = file('texture_0.png', png)
  const second = file('texture_1.png', new Uint8Array([...png, 1]))
  fireEvent.change(view.getByLabelText('PNG 텍스처'), {target: {files: [second, first]}})
  await waitFor(() => expect(convertMoc3).toHaveBeenCalledOnce())
  expect(convertMoc3).toHaveBeenLastCalledWith(await model.arrayBuffer(), {
    textures: [readCubismTexture(png), readCubismTexture(new Uint8Array([...png, 1]))],
  })
  expect(view.getByRole('link', {name: 'Poffo JSON 다운로드'})).toHaveAttribute(
    'download',
    'avatar.poffo.json',
  )
  fireEvent.click(view.getByRole('button', {name: 'texture_1.png 앞으로'}))
  await waitFor(() => expect(convertMoc3).toHaveBeenCalledTimes(2))
  expect(vi.mocked(convertMoc3).mock.lastCall?.[1].textures).toEqual([
    readCubismTexture(new Uint8Array([...png, 1])),
    readCubismTexture(png),
  ])
  expect(convertCmo3).not.toHaveBeenCalled()
})

test('should display every missing filename and remove a previous conversion download', async () => {
  const view = render(() => <ConverterPage />)
  const input = view.getByLabelText('모델 파일')
  fireEvent.change(input, {target: {files: [file('complete.zip')]}})
  await view.findByRole('link', {name: 'Poffo JSON 다운로드'})
  vi.mocked(convertCubismArchive).mockImplementation(() => {
    throw new Error(
      '필요한 파일이 누락되었습니다.\nPNG 텍스처: atlas/texture_01.png\n물리 설정: hair.physics3.json',
    )
  })
  fireEvent.change(input, {target: {files: [file('incomplete.zip')]}})
  const alert = await view.findByRole('alert')
  expect(alert).toHaveTextContent('atlas/texture_01.png')
  expect(alert).toHaveTextContent('hair.physics3.json')
  expect(view.queryByRole('link', {name: 'Poffo JSON 다운로드'})).not.toBeInTheDocument()
})

test('should convert an SDK ZIP without requiring a separate editor model', async () => {
  const view = render(() => <ConverterPage />)
  const source = file('avatar.zip')
  fireEvent.change(view.getByLabelText('모델 파일'), {target: {files: [source]}})
  await waitFor(() => expect(convertCubismArchive).toHaveBeenCalledOnce())
  expect(convertCubismArchive).toHaveBeenCalledWith(await source.arrayBuffer())
  expect(view.getByRole('link', {name: 'Poffo JSON 다운로드'})).toHaveAttribute(
    'download',
    'avatar.poffo.json',
  )
})

test('should keep optional SDK metadata connected to the CMO3 source', async () => {
  const view = render(() => <ConverterPage />)
  const sdk = file('sdk.zip')
  const model = file('avatar.cmo3')
  fireEvent.change(view.getByLabelText('SDK 모델 ZIP'), {target: {files: [sdk]}})
  fireEvent.change(view.getByLabelText('모델 파일'), {target: {files: [model]}})
  await waitFor(() => expect(convertCubismArchive).toHaveBeenCalledOnce())
  expect(convertCubismArchive).toHaveBeenCalledWith(await sdk.arrayBuffer(), {
    modelSource: await model.arrayBuffer(),
  })
})

test('should show conversion failures and discard the old download', async () => {
  const view = render(() => <ConverterPage />)
  const input = view.getByLabelText('모델 파일')
  fireEvent.change(input, {target: {files: [file('avatar.cmo3')]}})
  await view.findByRole('link', {name: 'Poffo JSON 다운로드'})
  vi.mocked(convertCubismArchive).mockImplementation(() => {
    throw new Error('Missing texture')
  })
  fireEvent.change(input, {target: {files: [file('broken.zip')]}})
  expect(await view.findByRole('alert')).toHaveTextContent('Missing texture')
  expect(view.queryByRole('link', {name: 'Poffo JSON 다운로드'})).not.toBeInTheDocument()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:converted')
})

test('should cancel a stale MOC3 texture read when another model is selected', async () => {
  const view = render(() => <ConverterPage />)
  const input = view.getByLabelText('모델 파일')
  fireEvent.change(input, {target: {files: [file('avatar.moc3')]}})
  let finishTexture!: (value: ArrayBuffer) => void
  const texture = file('texture_0.png', png)
  Object.defineProperty(texture, 'arrayBuffer', {
    value: () =>
      new Promise<ArrayBuffer>((resolve) => {
        finishTexture = resolve
      }),
  })
  fireEvent.change(view.getByLabelText('PNG 텍스처'), {target: {files: [texture]}})
  fireEvent.change(input, {target: {files: [file('latest.zip')]}})
  const download = await view.findByRole('link', {name: 'Poffo JSON 다운로드'})
  expect(download).toHaveAttribute('download', 'latest.poffo.json')
  finishTexture(png.buffer)
  await flushPromises()
  expect(convertMoc3).not.toHaveBeenCalled()
  expect(download).toHaveAttribute('download', 'latest.poffo.json')
})

test('should reject an invalid PNG instead of producing an untextured MOC3 download', async () => {
  const view = render(() => <ConverterPage />)
  fireEvent.change(view.getByLabelText('모델 파일'), {target: {files: [file('avatar.moc3')]}})
  fireEvent.change(view.getByLabelText('PNG 텍스처'), {target: {files: [file('broken.png')]}})
  expect(await view.findByRole('alert')).toHaveTextContent('PNG')
  expect(convertMoc3).not.toHaveBeenCalled()
  expect(view.queryByRole('link', {name: 'Poffo JSON 다운로드'})).not.toBeInTheDocument()
})

test('should clear the selected textures when switching to another MOC3 model', () => {
  const view = render(() => <ConverterPage />)
  const input = view.getByLabelText('모델 파일')
  fireEvent.change(input, {target: {files: [file('first.moc3')]}})
  const textures = view.getByLabelText('PNG 텍스처')
  fireEvent.change(textures, {target: {files: [file('texture_0.png', png)]}})
  fireEvent.change(input, {target: {files: [file('second.moc3')]}})
  expect(view.getByLabelText('PNG 텍스처')).not.toBe(textures)
  expect(view.getByRole('list', {name: '텍스처 순서'})).toBeEmptyDOMElement()
  expect(view.queryByRole('link', {name: 'Poffo JSON 다운로드'})).not.toBeInTheDocument()
})

test('should discard the previous SDK ZIP when switching formats', async () => {
  const view = render(() => <ConverterPage />)
  const input = view.getByLabelText('모델 파일')
  fireEvent.change(view.getByLabelText('SDK 모델 ZIP'), {target: {files: [file('old.zip')]}})
  fireEvent.change(input, {target: {files: [file('avatar.moc3')]}})
  fireEvent.change(input, {target: {files: [file('new.cmo3')]}})
  await waitFor(() => expect(convertCmo3).toHaveBeenCalledOnce())
  expect(convertCubismArchive).not.toHaveBeenCalled()
})

test('should automatically read a model folder with nested textures and metadata', async () => {
  const view = render(() => <ConverterPage />)
  const folderFile = (path: string, bytes?: Uint8Array<ArrayBuffer>) => {
    const source = file(path.split('/').at(-1)!, bytes)
    Object.defineProperty(source, 'webkitRelativePath', {value: path})
    return source
  }
  const model = folderFile('Comfy/runtime/avatar.moc3')
  const texture = folderFile('Comfy/runtime/atlas/texture_00.png', png)
  const folder = view.getByLabelText('모델 폴더')
  expect(folder).toHaveAttribute('webkitdirectory')
  fireEvent.change(folder, {target: {files: [texture, model]}})
  await waitFor(() => expect(convertCubismArchive).toHaveBeenCalledOnce())
  const archive = vi.mocked(convertCubismArchive).mock.lastCall?.[0]
  expect(archive).toHaveProperty('entries')
  expect(view.getByRole('link', {name: 'Poffo JSON 다운로드'})).toHaveAttribute(
    'download',
    'Comfy.poffo.json',
  )
  expect(view.queryByLabelText('PNG 텍스처')).not.toBeInTheDocument()
})

test('should discard a pending folder read when a different source is selected', async () => {
  const view = render(() => <ConverterPage />)
  let finishRead!: (bytes: ArrayBuffer) => void
  const model = file('avatar.moc3')
  Object.defineProperty(model, 'webkitRelativePath', {value: 'model/avatar.moc3'})
  Object.defineProperty(model, 'arrayBuffer', {
    value: () =>
      new Promise<ArrayBuffer>((resolve) => {
        finishRead = resolve
      }),
  })
  fireEvent.change(view.getByLabelText('모델 폴더'), {target: {files: [model]}})
  fireEvent.change(view.getByLabelText('모델 파일'), {target: {files: [file('latest.cmo3')]}})
  await view.findByRole('link', {name: 'Poffo JSON 다운로드'})
  finishRead(new ArrayBuffer(1))
  await flushPromises()
  expect(convertCubismArchive).not.toHaveBeenCalled()
  expect(view.getByRole('link', {name: 'Poffo JSON 다운로드'})).toHaveAttribute(
    'download',
    'latest.poffo.json',
  )
})
