/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'

import {PCharacterEmotion} from '../PCharacterEmotion'

describe('PCharacterEmotion', () => {
  it('should render an inactive emotion in grayscale', () => {
    const result = render(() => <PCharacterEmotion emotion="focus" image="focus.png" />)
    const imageElement = result.container.querySelector('img')

    expect(imageElement?.className).toContain('[filter:grayscale(1)_drop-shadow(')
  })

  it.each([
    {emotion: 'focus', iconClass: 'i-tabler-bulb-filled'},
    {emotion: 'rest', iconClass: 'i-tabler-music'},
  ] as const)(
    'should render the $emotion emotion with its status symbol',
    ({emotion, iconClass}) => {
      const result = render(() => (
        <PCharacterEmotion active emotion={emotion} image={`${emotion}.png`} />
      ))
      const emotionElement = result.container.querySelector('[data-pomo-character-emotion]')
      const imageElement = result.container.querySelector('img')
      const symbolElement = result.container.querySelector(`.${iconClass}`)

      expect(emotionElement?.getAttribute('data-active')).toBe('')
      expect(emotionElement?.getAttribute('data-emotion')).toBe(emotion)
      expect(imageElement?.getAttribute('src')).toBe(`${emotion}.png`)
      expect(symbolElement?.classList.contains(iconClass)).toBe(true)
    },
  )
})
