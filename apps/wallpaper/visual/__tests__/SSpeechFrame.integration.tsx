import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'
import type {ChatTone} from '../../src/features/codex'
import {SSpeechFrame} from '../../src/components/SSpeechFrame'
import 'virtual:uno.css'

afterEach(cleanup)

const tones: readonly (ChatTone | undefined)[] = [
  undefined,
  'blue',
  'teal',
  'violet',
  'rose',
  'amber',
  'sky',
]

it.each(tones)(
  'should keep the %s frame and tail opaque even when a stacked card is partially revealed',
  async (tone) => {
    const {container} = render(() => (
      <div
        class="wallpaper-speech relative h-30 w-60"
        style={{'--speech-height': '120px', '--speech-reveal': '0.4'}}
      >
        <SSpeechFrame tone={tone} target={{x: 400, y: 300}} />
      </div>
    ))
    // The painted frame and tail are intentionally hidden from accessibility APIs.
    const frame = container.firstElementChild!.firstElementChild!
    await expect.poll(() => frame.querySelector('span')).not.toBeNull()
    const color = getComputedStyle(frame).backgroundColor
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d')!
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    expect(context.getImageData(0, 0, 1, 1).data[3]).toBe(255)
    const tail = frame.querySelector('span')!
    expect(getComputedStyle(tail).backgroundColor).toBe(color)
    expect(getComputedStyle(tail).opacity).toBe('1')
  },
)
