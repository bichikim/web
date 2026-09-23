/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {expect, it} from 'vitest'

import {useAudioPlayer} from '../context'

it('should reject audio player parts outside a root', () => {
  createRoot((dispose) => {
    expect(() => useAudioPlayer()).toThrow(
      'Audio player parts must be rendered inside AudioPlayer.Root.',
    )
    dispose()
  })
})
