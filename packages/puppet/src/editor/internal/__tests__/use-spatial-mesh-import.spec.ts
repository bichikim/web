import {createRoot} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {useSpatialMeshImport} from '../use-spatial-mesh-import'

const mocks = vi.hoisted(() => ({parse: vi.fn()}))
vi.mock('../../../deformation/import-spatial-mesh', () => ({importSpatialMesh: mocks.parse}))
afterEach(() => vi.clearAllMocks())

test.each(['reset', 'dispose'] as const)(
  'should ignore a pending rejection after %s',
  async (end) => {
    let reject!: (error: Error) => void
    const buffer = new Promise<ArrayBuffer>((_, fail) => {
      reject = fail
    })
    const file = new File([], 'late.glb')
    Object.defineProperty(file, 'arrayBuffer', {value: () => buffer})
    const onError = vi.fn()
    const onImport = vi.fn()
    const root = createRoot((dispose) => ({
      dispose,
      importer: useSpatialMeshImport({
        bounds: () => ({height: 100, width: 100, x: 0, y: 0}),
        onError,
        onImport,
      }),
    }))
    const pending = root.importer.importFile(file)
    if (end === 'reset') {
      root.importer.resetImport()
    } else {
      root.dispose()
    }
    reject(new Error('read failed'))
    await pending
    expect(onError).not.toHaveBeenCalled()
    expect(onImport).not.toHaveBeenCalled()
    expect(mocks.parse).not.toHaveBeenCalled()
    root.dispose()
  },
)

test('should report an active file-read failure without importing an object', async () => {
  const file = new File([], 'broken.glb')
  Object.defineProperty(file, 'arrayBuffer', {
    value: () => Promise.reject(new Error('read failed')),
  })
  const onError = vi.fn()
  const onImport = vi.fn()
  const root = createRoot((dispose) => ({
    dispose,
    importer: useSpatialMeshImport({
      bounds: () => ({height: 100, width: 100, x: 0, y: 0}),
      onError,
      onImport,
    }),
  }))
  await root.importer.importFile(file)
  expect(onError).toHaveBeenCalledExactlyOnceWith('read failed')
  expect(onImport).not.toHaveBeenCalled()
  expect(mocks.parse).not.toHaveBeenCalled()
  root.dispose()
})
