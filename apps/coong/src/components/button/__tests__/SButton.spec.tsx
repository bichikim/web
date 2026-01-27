/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi} from 'vitest'
import {fireEvent, render} from '@solidjs/testing-library'
import {SButton, type SButtonProps} from '../SButton'

describe('SButton', () => {
  it('should render children', () => {
    const {getByText, getByRole} = render(() => <SButton>Test Button</SButton>)

    expect(getByText('Test Button')).toBeInTheDocument()
    expect(getByRole('button')).toBeInTheDocument()
    expect(getByRole('button')).toMatchSnapshot()
  })

  it.each([
    {color: 'primary'},
    {color: 'secondary'},
    {color: 'warning'},
    {color: 'default'},
    {color: 'transparent'},
    {color: 'error'},
    {color: 'warning'},
    {color: 'info'},
    {color: 'success'},
  ] as const)('should render color variant: $color', ({color}: {color: SButtonProps['color']}) => {
    const {getByRole} = render(() => <SButton color={color}>Color Button</SButton>)

    expect(getByRole('button')).toBeInTheDocument()
    expect(getByRole('button')).toMatchSnapshot()
  })

  it.each([{size: 'sm'}, {size: 'md'}, {size: 'lg'}] as const)(
    'should render size variant: $size',
    ({size}: {size: SButtonProps['size']}) => {
      const {getByRole} = render(() => <SButton size={size}>Size Button</SButton>)

      expect(getByRole('button')).toBeInTheDocument()
      expect(getByRole('button')).toMatchSnapshot()
    },
  )

  it('should render flat, glass, outline, fit', () => {
    const {getByRole} = render(() => (
      <SButton flat glass outline fit>
        Styled Button
      </SButton>
    ))

    expect(getByRole('button')).toBeInTheDocument()
    expect(getByRole('button')).toMatchSnapshot()
  })

  it('should render loading (boolean)', () => {
    const {getByRole} = render(() => <SButton loading>Loading Button</SButton>)

    expect(getByRole('button')).toBeDisabled()
    expect(getByRole('button')).toMatchSnapshot()
  })

  it('should render loading (number > 0)', () => {
    const {getByRole} = render(() => <SButton loading={50}>Loading 50%</SButton>)

    expect(getByRole('button')).toBeDisabled()
    expect(getByRole('button')).toMatchSnapshot()
  })

  it('should not be disabled when preventLoadingDisabled is true', () => {
    const {getByRole} = render(() => (
      <SButton loading preventLoadingDisabled>
        Active
      </SButton>
    ))

    expect(getByRole('button')).not.toBeDisabled()
  })

  it('should be disabled when disabled prop is true', () => {
    const {getByRole} = render(() => <SButton disabled>Disabled</SButton>)

    expect(getByRole('button')).toBeDisabled()
  })

  it('should call onClick', async () => {
    const handleClick = vi.fn()
    const {getByRole} = render(() => <SButton onClick={handleClick}>Click</SButton>)

    await fireEvent.click(getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })

  it('should call onDoubleClick', async () => {
    const handleDoubleClick = vi.fn()
    const {getByRole} = render(() => <SButton onDoubleClick={handleDoubleClick}>DoubleClick</SButton>)

    const button = getByRole('button')

    await fireEvent.click(button)
    await fireEvent.click(button)
    expect(handleDoubleClick).toHaveBeenCalled()
  })

  it('should apply custom class', () => {
    const {getByRole} = render(() => <SButton class="custom-class">Class Button</SButton>)

    expect(getByRole('button')).toHaveClass('custom-class')
  })
})
