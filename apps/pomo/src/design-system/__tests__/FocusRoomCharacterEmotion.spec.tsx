/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'

import {FocusRoomCharacterEmotion} from '../FocusRoomCharacterEmotion'

describe('FocusRoomCharacterEmotion', () => {
  it.each([
    {emotion: 'focus', iconClass: 'i-tabler-bulb-filled'},
    {emotion: 'rest', iconClass: 'i-tabler-music'},
  ] as const)(
    'should render the $emotion emotion with its status symbol',
    ({emotion, iconClass}) => {
      const result = render(() => (
        <FocusRoomCharacterEmotion active emotion={emotion} image={`${emotion}.png`} />
      ))
      const emotionElement = result.container.querySelector('.focus-room-character-emotion')
      const imageElement = result.container.querySelector('img')
      const symbolElement = result.container.querySelector('.focus-room-character-emotion__symbol')

      expect(emotionElement?.getAttribute('data-active')).toBe('')
      expect(emotionElement?.getAttribute('data-emotion')).toBe(emotion)
      expect(imageElement?.getAttribute('src')).toBe(`${emotion}.png`)
      expect(symbolElement?.classList.contains(iconClass)).toBe(true)
    },
  )
})
