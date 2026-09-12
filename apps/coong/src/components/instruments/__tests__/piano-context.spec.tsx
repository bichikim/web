/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {useContext} from 'solid-js'
import {PianoContext} from '../piano-context'

describe('piano-context', () => {
  it('should provide default context state without a provider', () => {
    const Consumer = () => {
      const context = useContext(PianoContext)
      return <span>{context.down().size}</span>
    }
    render(() => <Consumer />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
