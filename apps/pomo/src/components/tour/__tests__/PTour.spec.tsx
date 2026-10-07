/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {PTour, type PTourStep} from '../PTour'

const STEPS = [
  {
    description: '타이머 사용법을 확인해요.',
    id: 'timer',
    title: '집중 타이머',
    video: {label: '타이머 사용 영상', source: '/tour/timer.webm'},
  },
  {description: '집중할 음악을 골라요.', id: 'music', title: '음악 플레이어'},
] as const satisfies ReadonlyArray<PTourStep>

describe('PTour', () => {
  it('should guide through targets and close after the final step', async () => {
    const timerElement = document.createElement('button')
    const musicElement = document.createElement('button')
    timerElement.getBoundingClientRect = () => new DOMRect(40, 60, 120, 48)
    musicElement.getBoundingClientRect = () => new DOMRect(240, 180, 160, 64)
    const elements = new Map<string, Element>([
      ['timer', timerElement],
      ['music', musicElement],
    ])
    const onEvent = vi.fn()
    const onOpenChange = vi.fn()

    const Harness = () => {
      const [isOpen, setIsOpen] = createSignal(true)
      return (
        <PTour
          getStepElement={(stepId) => elements.get(stepId) ?? null}
          isOpen={isOpen()}
          onEvent={onEvent}
          onOpenChange={(nextOpen) => {
            setIsOpen(nextOpen)
            onOpenChange(nextOpen)
          }}
          steps={STEPS}
        />
      )
    }

    render(() => <Harness />)

    expect(await screen.findByRole('dialog', {name: '집중 타이머'})).toBeInTheDocument()
    expect(screen.getByText('타이머 사용법을 확인해요.')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    const video = screen.getByLabelText('타이머 사용 영상')
    expect(video).toHaveAttribute('src', '/tour/timer.webm')
    expect(video).toHaveProperty('autoplay', true)
    expect(video).toHaveProperty('controls', true)
    expect(video).toHaveProperty('loop', true)
    expect(video).toHaveProperty('muted', true)
    expect(video).toHaveProperty('playsInline', true)
    expect(screen.getByRole('button', {name: '이전'})).toBeDisabled()
    expect(onEvent).toHaveBeenLastCalledWith({
      activeElement: timerElement,
      step: STEPS[0],
      type: 'started',
    })

    fireEvent.click(screen.getByRole('button', {name: '다음'}))

    await waitFor(() =>
      expect(screen.getByRole('dialog', {name: '음악 플레이어'})).toBeInTheDocument(),
    )
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.queryByLabelText('타이머 사용 영상')).not.toBeInTheDocument()
    expect(screen.getByRole('button', {name: '완료'})).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: '이전'}))
    await waitFor(() =>
      expect(screen.getByRole('dialog', {name: '집중 타이머'})).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', {name: '다음'}))
    await waitFor(() =>
      expect(screen.getByRole('dialog', {name: '음악 플레이어'})).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', {name: '완료'}))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(onEvent).toHaveBeenLastCalledWith({
      activeElement: musicElement,
      step: STEPS[1],
      type: 'completed',
    })
  })

  it('should dismiss from the close control and report the active target', async () => {
    const element = document.createElement('button')
    element.getBoundingClientRect = () => new DOMRect(40, 60, 120, 48)
    const onEvent = vi.fn()
    const onOpenChange = vi.fn()

    render(() => (
      <PTour
        getStepElement={() => element}
        isOpen
        onEvent={onEvent}
        onOpenChange={onOpenChange}
        steps={STEPS.slice(0, 1)}
      />
    ))

    expect(await screen.findByRole('dialog', {name: '집중 타이머'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '닫기'}))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onEvent).toHaveBeenLastCalledWith({
      activeElement: element,
      step: STEPS[0],
      type: 'dismissed',
    })
  })

  it('should restore focus to the external control that opened the tour', async () => {
    const element = document.createElement('div')

    const Harness = () => {
      const [isOpen, setIsOpen] = createSignal(false)

      return (
        <>
          <button onClick={() => setIsOpen(true)} type="button">
            투어 열기
          </button>
          <PTour
            getStepElement={() => element}
            isOpen={isOpen()}
            onOpenChange={setIsOpen}
            steps={STEPS.slice(0, 1)}
          />
        </>
      )
    }

    render(() => <Harness />)
    const openButton = screen.getByRole('button', {name: '투어 열기'})

    openButton.focus()
    fireEvent.click(openButton)
    fireEvent.click(await screen.findByRole('button', {name: '닫기'}))

    await waitFor(() => expect(openButton).toHaveFocus())
  })

  it('should stay hidden and request closure when no requested step exists', async () => {
    const onOpenChange = vi.fn()

    render(() => (
      <PTour getStepElement={() => null} isOpen onOpenChange={onOpenChange} steps={[]} />
    ))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
