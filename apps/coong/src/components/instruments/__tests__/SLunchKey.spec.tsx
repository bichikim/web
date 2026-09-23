/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {SLunchKey} from '../SLunchKey'
import {HPianoRoot} from '../HPianoRoot'

describe('SLunchKey', () => {
  it('should render the lunch-key visual inside a piano context', () => {
    render(() => (
      <HPianoRoot>
        <SLunchKey key="A4" bgColor="red">
          lunch
        </SLunchKey>
      </HPianoRoot>
    ))

    expect(screen.getByText('lunch')).toHaveStyle({'--lunch-key-bg': 'red'})
  })
})
