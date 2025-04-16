/**
 * @vitest-environment jsdom
 */
import {describe, expect, it} from 'vitest'
import {render} from '@solidjs/testing-library'
// import userEvent from '@testing-library/user-event'
import {SText} from './SText'

describe('SText', () => {
  it('should render', () => {
    const {getByText} = render(() => <SText>Hello</SText>)

    expect(getByText('Hello')).toBeInTheDocument()
    expect(getByText('Hello')).toMatchSnapshot()
  })

  it.each([
    //
    {size: 'md'},
    {size: 'lg'},
    {size: 'sm'},
  ])('should render size: $size', ({size}: any) => {
    const {getByText} = render(() => <SText size={size}>Hello</SText>)

    expect(getByText('Hello')).toMatchSnapshot()
  })
})
