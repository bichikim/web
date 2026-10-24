/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {PSettings} from '../../p-settings/PSettings'
import {SceneSettingsPanel} from '../SettingsPanel'
vi.mock('../../p-settings/PSettings', () => ({PSettings: vi.fn()}))
it('should expose the interactive shell without a client loading placeholder', () => {
  expect(SceneSettingsPanel).toBe(PSettings)
})
