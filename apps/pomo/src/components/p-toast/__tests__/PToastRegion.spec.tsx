/** @vitest-environment jsdom */
import {finishAnimation} from '../../__tests__/animation'
import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {onMount} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {type ToastInput, ToastProvider, useToast} from '@winter-love/solid-components'
import * as m from '@paraglide/message'
import {PToastRegion} from '..'

const ToastHarness = (props: {readonly messages: ReadonlyArray<ToastInput>}) => {
  const toast = useToast()
  onMount(() => props.messages.forEach(toast.showToast))
  return <PToastRegion />
}

describe('PToastRegion', () => {
  it('should display queued counts after the cards and hide them when every toast is visible', () => {
    render(() => (
      <ToastProvider>
        <ToastHarness
          messages={[
            {message: '첫 오류', tone: 'error'},
            {message: '둘째 오류', tone: 'error'},
            {message: '셋째 오류', tone: 'error'},
            {message: '대기 오류', tone: 'error'},
          ]}
        />
      </ToastProvider>
    ))
    const region = screen.getByRole('region', {name: m.toast_label()})
    const cards = within(region).getAllByRole('alert')
    expect(cards).toHaveLength(3)
    expect(region).toHaveTextContent(m.toast_count({count: 4}))
    expect(region).toHaveTextContent(m.toast_waiting({count: 1}))
    const count = within(region).getByText(m.toast_count({count: 4}), {exact: false})
    expect(cards[2].compareDocumentPosition(count)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.queryByText('대기 오류')).toBeNull()
    fireEvent.click(within(region).getAllByRole('button', {name: m.toast_close()})[0])
    expect(screen.getByText('첫 오류')).toBeInTheDocument()
    expect(screen.queryByText('대기 오류')).toBeNull()
    expect(within(region).getAllByRole('alert')).toHaveLength(3)
    finishAnimation(cards[0], 'toast-exit')
    expect(screen.queryByText('첫 오류')).toBeNull()
    expect(screen.getByText('대기 오류')).toBeInTheDocument()
    expect(region).not.toHaveTextContent(m.toast_count({count: 3}))
    expect(region).not.toHaveTextContent(m.toast_waiting({count: 1}))
  })

  it.each([1, 2, 3])('should omit the count when all %i toasts fit', (count) => {
    render(() => (
      <ToastProvider>
        <ToastHarness
          messages={Array.from({length: count}, (_, index) => ({
            message: `오류 ${index + 1}`,
            tone: 'error',
          }))}
        />
      </ToastProvider>
    ))
    const region = screen.getByRole('region', {name: m.toast_label()})
    expect(within(region).getAllByRole('alert')).toHaveLength(count)
    expect(region).not.toHaveTextContent(m.toast_count({count}))
  })

  it('should remove the region after the last function-created notification is closed', () => {
    render(() => (
      <ToastProvider>
        <ToastHarness messages={[{message: '저장했어요'}]} />
      </ToastProvider>
    ))
    expect(screen.getByRole('status')).toHaveTextContent('저장했어요')
    const notification = screen.getByRole('status')
    fireEvent.click(screen.getByRole('button', {name: m.toast_close()}))
    expect(notification).toBeInTheDocument()
    finishAnimation(notification, 'toast-exit')
    expect(screen.queryByRole('region', {name: m.toast_label()})).toBeNull()
  })
})
