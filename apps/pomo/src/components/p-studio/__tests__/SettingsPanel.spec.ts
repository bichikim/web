import {expect, it, vi} from 'vitest'
import {PSettings} from '../../PSettings'
import {SceneSettingsPanel} from '../SettingsPanel'
vi.mock('../../PSettings', () => ({PSettings: vi.fn()}))
it('should expose the interactive shell without a client loading placeholder', () => {
  expect(SceneSettingsPanel).toBe(PSettings)
})
