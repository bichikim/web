import {render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {ElementRef} from './ElementRef'

describe('ElementRef', () => {
  it('can be removed without an optional ref callback', () => {
    const view = render(() => <ElementRef component="div" />)

    expect(() => view.unmount()).not.toThrow()
  })
})
