/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {HTourRoot} from '../HTourRoot'

const STEPS = [{id: 'timer'}, {id: 'music'}] as const

describe('HTourRoot', () => {
  it('should expose step state and actions without prescribing presentation', async () => {
    const timerElement = document.createElement('button')
    const musicElement = document.createElement('button')
    const elements = new Map<string, Element>([
      ['timer', timerElement],
      ['music', musicElement],
    ])
    const onEvent = vi.fn()
    const onOpenChange = vi.fn()

    const Harness = () => {
      const [isOpen, setIsOpen] = createSignal(true)

      return (
        <HTourRoot
          getStepElement={(stepId) => elements.get(stepId) ?? null}
          isOpen={isOpen()}
          onEvent={onEvent}
          onOpenChange={(nextOpen) => {
            setIsOpen(nextOpen)
            onOpenChange(nextOpen)
          }}
          steps={STEPS}
        >
          {(tour) => (
            <section aria-label="unstyled tour">
              <output>{tour.activeStep()?.id}</output>
              <button disabled={tour.isFirstStep()} onClick={() => tour.previous()} type="button">
                Previous
              </button>
              <button onClick={() => tour.next()} type="button">
                {tour.isLastStep() ? 'Finish' : 'Next'}
              </button>
              <button onClick={() => tour.dismiss()} type="button">
                Dismiss
              </button>
            </section>
          )}
        </HTourRoot>
      )
    }

    render(() => <Harness />)

    expect(await screen.findByText('timer')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Previous'})).toBeDisabled()
    expect(onEvent).toHaveBeenLastCalledWith({
      activeElement: timerElement,
      step: STEPS[0],
      type: 'started',
    })

    fireEvent.click(screen.getByRole('button', {name: 'Next'}))

    expect(await screen.findByText('music')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Previous'})).toBeEnabled()
    expect(screen.getByRole('button', {name: 'Finish'})).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: 'Finish'}))

    await waitFor(() => expect(screen.queryByRole('region', {name: 'unstyled tour'})).toBeNull())
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(onEvent).toHaveBeenLastCalledWith({
      activeElement: musicElement,
      step: STEPS[1],
      type: 'completed',
    })
  })

  it('should request closure without rendering when the initial step is unavailable', async () => {
    const onOpenChange = vi.fn()

    render(() => (
      <HTourRoot getStepElement={() => null} isOpen onOpenChange={onOpenChange} steps={[]}>
        {() => <span>Unexpected content</span>}
      </HTourRoot>
    ))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(screen.queryByText('Unexpected content')).toBeNull()
  })

  it('should request closure when a reactive step list removes the active step', async () => {
    const onOpenChange = vi.fn()

    const Harness = () => {
      const [isOpen, setIsOpen] = createSignal(true)
      const [steps, setSteps] = createSignal<ReadonlyArray<(typeof STEPS)[number]>>(STEPS)

      return (
        <HTourRoot
          getStepElement={() => null}
          isOpen={isOpen()}
          onOpenChange={(nextOpen) => {
            setIsOpen(nextOpen)
            onOpenChange(nextOpen)
          }}
          steps={steps()}
        >
          {(tour) => (
            <button onClick={() => setSteps(STEPS.slice(1))} type="button">
              Remove {tour.activeStep()?.id}
            </button>
          )}
        </HTourRoot>
      )
    }

    render(() => <Harness />)
    fireEvent.click(await screen.findByRole('button', {name: 'Remove timer'}))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(screen.queryByRole('button', {name: /Remove/})).not.toBeInTheDocument()
  })
})
