/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {useContext} from 'solid-js'
import {HPianoFlatSet} from '../HPianoFlatSet'
import {KeyContext} from '../key-context'

describe('HPianoFlatSet', () => {
  it('should render generated keys', () => {
    const KeyName = () => {
      const context = useContext(KeyContext)
      return <span data-testid="key">{context.name}</span>
    }
    render(() => (
      <HPianoFlatSet>
        <KeyName />
      </HPianoFlatSet>
    ))
    expect(screen.getAllByTestId('key').length).toBeGreaterThan(0)
  })
})
