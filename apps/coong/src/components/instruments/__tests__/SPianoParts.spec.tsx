/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {
  SPianoBody,
  SPianoFlatKey,
  SPianoFlatSet,
  SPianoRoot,
  SPianoSharpEmpty,
  SPianoSharpKey,
  SPianoSharpSet,
} from '../SPianoParts'

describe('SPianoParts', () => {
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
})
