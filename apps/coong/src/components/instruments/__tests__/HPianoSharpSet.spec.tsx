/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {useContext} from 'solid-js'
import {HPianoSharpSet} from '../HPianoSharpSet'
import {KeyContext} from '../key-context'

describe('HPianoSharpSet', () => {
  it('should render generated keys and empty slots', () => {
    const KeyName = () => {
      const context = useContext(KeyContext)
      return <span data-testid="key">{context.name}</span>
    }
    render(() => (
      <HPianoSharpSet emptyChildren={<span>empty key</span>}>
        <KeyName />
      </HPianoSharpSet>
    ))
    expect(screen.getAllByTestId('key').length).toBeGreaterThan(0)
    expect(screen.getAllByText('empty key').length).toBeGreaterThan(0)
  })
})
