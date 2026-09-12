/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {PButton} from '../../PButton'
import {PStudioTourHint} from '../TourHint'

vi.mock('../../PButton', () => ({
  PButton: vi.fn((props: {readonly accessibleLabel?: string; readonly onPress?: () => void}) => (
    <button aria-label={props.accessibleLabel} onClick={props.onPress} type="button" />
  )),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('PStudioTourHint', () => {
  it('should point first-time users to the tour and provide dismissal', () => {
    const onDismiss = vi.fn()

    render(() => <PStudioTourHint onDismiss={onDismiss} />)

    expect(screen.getByRole('status', {name: '처음 오셨나요?'})).toHaveTextContent(
      '오른쪽 위의 ‘ 둘러보기’를 눌러',
    )
    expect(screen.getByRole('status').querySelector('.i-tabler-route')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(screen.getByRole('status')).not.toHaveTextContent('[icon:tour]')

    fireEvent.click(screen.getByRole('button', {name: '닫기'}))

    expect(onDismiss).toHaveBeenCalledOnce()
    expect(PButton).toHaveBeenCalledWith(expect.objectContaining({icon: 'i-tabler-x'}))
  })
})
