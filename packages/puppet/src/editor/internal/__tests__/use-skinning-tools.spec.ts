import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createSkinDocument} from '../../../deformation/__tests__/fixtures/skin'
import {useSkinningTools} from '../use-skinning-tools'

const mocks = vi.hoisted(() => ({sample: vi.fn()}))
vi.mock('../mesh-preview', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../mesh-preview')>()
  return {
    ...actual,
    getPartPreviewVertices: mocks.sample.mockImplementation(actual.getPartPreviewVertices),
  }
})
afterEach(() => vi.clearAllMocks())

test('should sample only while skin editing is enabled and resume with current input', () => {
  const document = createSkinDocument()
  createRoot((dispose) => {
    const [time, setTime] = createSignal(0)
    const tools = useSkinningTools({
      activePartId: document.parts[0]!.id,
      document,
      get previewTime() {
        return time()
      },
      sourceDocument: document,
    })
    expect(tools.positions()).toEqual([])
    setTime(1)
    expect(mocks.sample).not.toHaveBeenCalled()
    tools.setEnabled(true)
    expect(tools.positions()).toHaveLength(document.parts[0]!.mesh.vertices.length)
    expect(mocks.sample).toHaveBeenCalledTimes(document.parts.length)
    tools.setEnabled(false)
    setTime(0)
    expect(tools.positions()).toEqual([])
    expect(mocks.sample).toHaveBeenCalledTimes(document.parts.length)
    tools.setEnabled(true)
    expect(tools.positions()).toHaveLength(document.parts[0]!.mesh.vertices.length)
    expect(mocks.sample).toHaveBeenCalledTimes(2 * document.parts.length)
    dispose()
  })
})
