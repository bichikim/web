/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createNativeSymbols} from '../create-native-symbols'
import {resolveNativeBinary} from '../resolve-native-binary'

vi.mock('../resolve-native-binary', () => ({resolveNativeBinary: vi.fn()}))
afterEach(() => vi.clearAllMocks())
describe('createNativeSymbols', () => {
  it('should leave executable preparation idle until native navigation is needed', async () => {
    const symbols = createNativeSymbols('/workspace')
    await symbols.dispose()
    expect(resolveNativeBinary).not.toHaveBeenCalled()
  })
})
