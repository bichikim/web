/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {InlineIconText} from '../InlineIconText'

describe('InlineIconText', () => {
  it('should render repeated and adjacent icons while preserving surrounding text', () => {
    const {container} = render(() => (
      <InlineIconText
        text="오른쪽 [icon:tour][icon:play] 둘러보기 [icon:tour]"
        icons={{play: 'i-tabler-player-play', tour: 'i-tabler-route'}}
      />
    ))

    expect(container.textContent).toBe('오른쪽  둘러보기 ')
    expect([...container.querySelectorAll('span')].map((icon) => icon.className)).toEqual([
      expect.stringContaining('i-tabler-route'),
      expect.stringContaining('i-tabler-player-play'),
      expect.stringContaining('i-tabler-route'),
    ])
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3)
  })

  it('should preserve unknown and malformed tokens and render markup as text', () => {
    const text = '<b>안내</b> [icon:missing] [icon:constructor] [icon:] [icon:tour'
    const {container} = render(() => (
      <InlineIconText text={text} icons={{tour: 'i-tabler-route'}} />
    ))

    expect(container.textContent).toBe(text)
    expect(container.children).toHaveLength(0)
  })

  it('should render plain text, missing mappings, and empty text', () => {
    const [text, setText] = createSignal('안내 [icon:tour]')
    const {container} = render(() => <InlineIconText text={text()} />)

    expect(container.textContent).toBe('안내 [icon:tour]')
    setText('')
    expect(container.textContent).toBe('')
  })

  it('should react to changes in the text and icon mapping', () => {
    const [text, setText] = createSignal('[icon:tour]')
    const [icons, setIcons] = createSignal<Readonly<Record<string, string>>>({
      tour: 'i-tabler-route',
    })
    const {container} = render(() => <InlineIconText text={text()} icons={icons()} />)

    setIcons({tour: 'i-tabler-book'})
    expect(container.querySelector('span')).toHaveClass('i-tabler-book')
    setIcons({})
    expect(container.textContent).toBe('[icon:tour]')
    setText('변경된 안내')
    expect(container.textContent).toBe('변경된 안내')
  })
})
