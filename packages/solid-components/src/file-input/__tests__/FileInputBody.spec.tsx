/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {FileInputBody} from '../FileInputBody'

describe('FileInputBody', () => {
  it('should render the file input placeholder', () => {
    const view = render(() => <FileInputBody />)

    expect(view.getByText('FileInputBody')).toBeDefined()
  })
})
