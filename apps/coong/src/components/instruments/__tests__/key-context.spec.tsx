/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {useContext} from 'solid-js'
import {KeyContext} from '../key-context'

describe('key-context', () => {
  it('should provide default context state without a provider', () => {
    const Consumer = () => {
      const context = useContext(KeyContext)
      return <span>{String(context.disabled())}</span>
    }
    render(() => <Consumer />)
    expect(screen.getByText('false')).toBeInTheDocument()
  })
})
