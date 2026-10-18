import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import {useMeshEditor} from '../use-mesh-editor'

const mocks = vi.hoisted(() => ({sample: vi.fn()}))
vi.mock('../internal/mesh-preview', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../internal/mesh-preview')>()
  return {
    ...actual,
    getPartPreviewVertices: mocks.sample.mockImplementation(actual.getPartPreviewVertices),
  }
})
afterEach(() => vi.clearAllMocks())

test('should skip unselected meshes and reuse poses during vertex selection', () => {
  const document = createDemoDocument()
  const [selected, setSelected] = createSignal<readonly string[]>([])
  const [time, setTime] = createSignal(0)
  const [vertex, setVertex] = createSignal<number | null>(null)
  const root = createRoot((dispose) => {
    const mesh = useMeshEditor({
      activePartId: 'mesh-preview',
      document,
      get previewTime() {
        return time()
      },
      get selectedPartIds() {
        return selected()
      },
      get selectedVertexIndex() {
        return vertex()
      },
    })
    return {dispose, mesh}
  })
  const {mesh} = root
  expect(mesh.partViews()).toEqual([])
  expect(mesh.clippedPartViews()).toEqual([])
  setTime(1)
  expect(mocks.sample).not.toHaveBeenCalled()
  setSelected(['mesh-preview'])
  expect(mesh.vertices()[4]).toMatchObject({x: 320, y: 176})
  const samples = mocks.sample.mock.calls.length
  expect(samples).toBe(document.parts.length)
  setVertex(4)
  expect(mesh.selectedVertex()).toBe(4)
  expect(mocks.sample).toHaveBeenCalledTimes(samples)
  setTime(0)
  expect(mesh.vertices()[4]).toMatchObject({x: 320, y: 240})
  expect(mocks.sample).toHaveBeenCalledTimes(samples + document.parts.length)
  root.dispose()
})
