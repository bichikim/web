/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {HPianoBody} from '../HPianoBody'

describe('HPianoBody', () => {
  it('should render body content and forward attributes', () => {
    render(() => <HPianoBody data-testid="body">body content</HPianoBody>)
    expect(screen.getByTestId('body')).toHaveTextContent('body content')
  })
})
