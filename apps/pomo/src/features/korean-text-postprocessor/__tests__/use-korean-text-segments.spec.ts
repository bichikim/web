import {createRoot, createSignal} from 'solid-js'
import {expect, it} from 'vitest'

import {useKoreanTextSegments} from '../use-korean-text-segments'

it('should derive Korean text segments reactively', () => {
  createRoot((dispose) => {
    const [text, setText] = createSignal('안녕하세요.')
    const segments = useKoreanTextSegments({text})

    expect(segments()).toEqual([{kind: 'text', text: '안녕하세요.'}])

    setText('今日は 맑아요.')
    expect(segments()).toEqual([{kind: 'refining', text: '今日は 맑아요.'}])
    dispose()
  })
})
