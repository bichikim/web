import {describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({getPresetData: vi.fn()}))

vi.mock('src/server/preset', () => ({getPresetData: mocks.getPresetData}))

import {GET} from '../[id]'

describe('preset API route', () => {
  it('should return preset data for the route parameter', async () => {
    const preset = {id: 'known', musics: [], title: 'Known'}
    mocks.getPresetData.mockReturnValue(preset)

    await expect(GET({params: {id: 'known'}} as never)).resolves.toBe(preset)
    expect(mocks.getPresetData).toHaveBeenCalledWith('known')
  })
})
