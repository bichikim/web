import {invoke} from '@tauri-apps/api/core'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  closeControlSurface,
  getBackgroundInteraction,
  openControlSurface,
  restoreSurface,
  setBackgroundInteraction,
  setBackgroundSurface,
  setWidgetSurface,
} from '../index'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn()}))

describe('desktop surface guest API', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should address background commands by window label', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined)

    await getBackgroundInteraction({label: 'background'})
    await setBackgroundSurface({interaction: 'passThrough', label: 'background'})
    await setBackgroundInteraction({interaction: 'interactive', label: 'background'})
    await restoreSurface({label: 'background'})
    await closeControlSurface({label: 'controls'})
    await setWidgetSurface({height: 500, label: 'background', width: 400})

    expect(invoke).toHaveBeenNthCalledWith(1, 'plugin:desktop-surface|get_background_interaction', {
      label: 'background',
    })
    expect(invoke).toHaveBeenNthCalledWith(2, 'plugin:desktop-surface|set_background_surface', {
      options: {interaction: 'passThrough', label: 'background'},
    })
    expect(invoke).toHaveBeenNthCalledWith(3, 'plugin:desktop-surface|set_background_interaction', {
      options: {interaction: 'interactive', label: 'background'},
    })
    expect(invoke).toHaveBeenNthCalledWith(4, 'plugin:desktop-surface|restore_surface', {
      label: 'background',
    })
    expect(invoke).toHaveBeenNthCalledWith(5, 'plugin:desktop-surface|close_control_surface', {
      label: 'controls',
    })
    expect(invoke).toHaveBeenNthCalledWith(6, 'plugin:desktop-surface|set_widget_surface', {
      options: {height: 500, label: 'background', width: 400},
    })
  })

  it('should send control window configuration as one command object', async () => {
    vi.mocked(invoke).mockResolvedValue({created: true})
    const options = {
      height: 240,
      label: 'controls',
      path: '/desktop/controls',
      width: 420,
      x: 20,
      y: 30,
    }

    await expect(openControlSurface(options)).resolves.toEqual({created: true})
    expect(invoke).toHaveBeenCalledWith('plugin:desktop-surface|open_control_surface', {options})
  })
})
