/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {useContext} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {HKey} from '../HKey'
import {HPianoBody} from '../HPianoBody'
import {HPianoFlatSet} from '../HPianoFlatSet'
import {HPianoRoot} from '../HPianoRoot'
import {HPianoSharpSet} from '../HPianoSharpSet'
import {SLunchKey} from '../SLunchKey'
import {SPiano} from '../SPiano'
import {
  SPianoBody,
  SPianoFlatKey,
  SPianoFlatSet,
  SPianoRoot,
  SPianoSharpEmpty,
  SPianoSharpKey,
  SPianoSharpSet,
} from '../SPianoParts'
import {KeyContext} from '../key-context'
import {PianoContext} from '../piano-context'

describe('headless piano primitives', () => {
  it('should render body content and generated flat and sharp key sets', () => {
    const KeyName = () => {
      const context = useContext(KeyContext)
      return <span>{context.name}</span>
    }

    render(() => (
      <HPianoBody data-testid="body">
        <HPianoFlatSet>
          <KeyName />
        </HPianoFlatSet>
        <HPianoSharpSet emptyChildren={<span>empty key</span>}>
          <KeyName />
        </HPianoSharpSet>
      </HPianoBody>
    ))

    expect(screen.getByTestId('body')).toBeInTheDocument()
    expect(screen.getAllByText('empty key').length).toBeGreaterThan(0)
  })

  it('should translate global key state into piano down and up callbacks', () => {
    const onDown = vi.fn()
    const onUp = vi.fn()
    render(() => (
      <HPianoRoot onDown={onDown} onUp={onUp} velocity={0.7}>
        <HKey key="C4" name="C" showKeyName>
          key child
        </HKey>
      </HPianoRoot>
    ))

    window.dispatchEvent(
      new CustomEvent('global-touch__C4', {detail: {down: true, renderOnly: false}}),
    )
    window.dispatchEvent(
      new CustomEvent('global-touch__C4', {detail: {down: false, renderOnly: false}}),
    )

    expect(onDown).toHaveBeenCalledWith(expect.objectContaining({note: 'C4', velocity: 0.7}))
    expect(onUp).toHaveBeenCalledWith('C4')
    expect(screen.getByText('key child')).toBeInTheDocument()
  })

  it('should render the lunch-key visual inside a piano context', () => {
    render(() => (
      <HPianoRoot>
        <SLunchKey key="A4" bgColor="red">
          lunch
        </SLunchKey>
      </HPianoRoot>
    ))

    expect(screen.getByText('lunch')).toHaveStyle({'background-color': 'rgb(255, 0, 0)'})
  })
})

describe('styled piano composition', () => {
  it('should render the complete styled piano keyboard', () => {
    render(() => <SPiano data-testid="piano" showKeyName />)

    expect(screen.getByTestId('piano')).toBeInTheDocument()
    expect(screen.getAllByRole('button').length).toBeGreaterThan(100)
  })

  it('should expose each styled composition wrapper', () => {
    render(() => (
      <SPianoRoot>
        <SPianoBody data-testid="styled-body">
          <SPianoFlatSet>
            <SPianoFlatKey>flat</SPianoFlatKey>
          </SPianoFlatSet>
          <SPianoSharpSet emptyChildren={<SPianoSharpEmpty data-testid="empty" />}>
            <SPianoSharpKey>sharp</SPianoSharpKey>
          </SPianoSharpSet>
        </SPianoBody>
      </SPianoRoot>
    ))

    expect(screen.getByTestId('styled-body')).toBeInTheDocument()
    expect(screen.getAllByTestId('empty').length).toBeGreaterThan(0)
  })

  it('should provide inert default piano context behavior', () => {
    const Consumer = () => {
      const piano = useContext(PianoContext)
      const key = useContext(KeyContext)
      return <span>{`${piano.down().size}:${String(key.disabled())}`}</span>
    }
    render(() => <Consumer />)

    expect(screen.getByText('0:false')).toBeInTheDocument()
  })
})
