/** @vitest-environment jsdom */

import {createRoot, createSignal} from 'solid-js'
import {scrollIntoViewIfNeeded} from '@winter-love/utils'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {type TourEvent, type TourStep, useTour} from '@winter-love/solid-use/tour'

vi.mock('@winter-love/utils', () => ({scrollIntoViewIfNeeded: vi.fn()}))

interface TestStep extends TourStep {
  readonly scrollIntoView?: boolean
  readonly title: string
}

const STEPS = [
  {id: 'timer', title: 'Timer'},
  {id: 'music', title: 'Music'},
  {id: 'settings', title: 'Settings'},
] as const satisfies ReadonlyArray<TestStep>
const getStepElement = () => null

describe('useTour', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start at the first step and expose progress', () => {
    createRoot((dispose) => {
      const tour = useTour({getStepElement, steps: () => STEPS})

      expect(tour.activeStep()).toBeNull()
      expect(tour.isOpen()).toBe(false)
      expect(tour.start()).toBe(true)
      expect(tour.activeStep()).toBe(STEPS[0])
      expect(tour.isOpen()).toBe(true)
      expect(tour.stepCount()).toBe(3)
      expect(tour.stepIndex()).toBe(0)

      dispose()
    })
  })

  it('should start at a requested step and reject an unknown step', () => {
    createRoot((dispose) => {
      const tour = useTour({getStepElement, steps: () => STEPS})

      expect(tour.start('music')).toBe(true)
      expect(tour.activeStep()).toBe(STEPS[1])
      expect(tour.start('unknown')).toBe(false)
      expect(tour.activeStep()).toBe(STEPS[1])

      dispose()
    })
  })

  it('should move backward and forward without crossing the first step', () => {
    createRoot((dispose) => {
      const events: TourEvent<TestStep>[] = []
      const tour = useTour({
        getStepElement,
        onEvent: (event) => events.push(event),
        steps: () => STEPS,
      })

      tour.start()
      expect(tour.previous()).toBe(false)
      expect(tour.activeStep()).toBe(STEPS[0])
      expect(tour.next()).toBe(true)
      expect(tour.activeStep()).toBe(STEPS[1])
      expect(tour.previous()).toBe(true)
      expect(tour.activeStep()).toBe(STEPS[0])
      expect(events).toEqual([
        {activeElement: null, step: STEPS[0], type: 'started'},
        {activeElement: null, previousStep: STEPS[0], step: STEPS[1], type: 'step-changed'},
        {activeElement: null, previousStep: STEPS[1], step: STEPS[0], type: 'step-changed'},
      ])

      dispose()
    })
  })

  it('should complete after the last step', () => {
    createRoot((dispose) => {
      const events: TourEvent<TestStep>[] = []
      const tour = useTour({
        getStepElement,
        onEvent: (event) => events.push(event),
        steps: () => STEPS,
      })

      tour.start('settings')
      expect(tour.next()).toBe(false)
      expect(tour.activeStep()).toBeNull()
      expect(tour.isOpen()).toBe(false)
      expect(events).toEqual([
        {activeElement: null, step: STEPS[2], type: 'started'},
        {activeElement: null, step: STEPS[2], type: 'completed'},
      ])

      dispose()
    })
  })

  it('should dismiss the active tour and remain idle when already closed', () => {
    createRoot((dispose) => {
      const onEvent = vi.fn<(event: TourEvent<TestStep>) => void>()
      const tour = useTour({getStepElement, onEvent, steps: () => STEPS})

      tour.start()
      tour.dismiss()
      tour.dismiss()

      expect(tour.activeStep()).toBeNull()
      expect(onEvent).toHaveBeenCalledTimes(2)
      expect(onEvent).toHaveBeenLastCalledWith({
        activeElement: null,
        step: STEPS[0],
        type: 'dismissed',
      })

      dispose()
    })
  })

  it('should use the latest steps and event callback', () => {
    createRoot((dispose) => {
      const [steps, setSteps] = createSignal<ReadonlyArray<TestStep>>(STEPS)
      const firstCallback = vi.fn<(event: TourEvent<TestStep>) => void>()
      const secondCallback = vi.fn<(event: TourEvent<TestStep>) => void>()
      const [onEvent, setOnEvent] = createSignal(firstCallback)
      const tour = useTour({
        getStepElement,
        get onEvent() {
          return onEvent()
        },
        steps,
      })

      setSteps(STEPS.slice(1))
      setOnEvent(() => secondCallback)
      tour.start()

      expect(tour.activeStep()).toBe(STEPS[1])
      expect(firstCallback).not.toHaveBeenCalled()
      expect(secondCallback).toHaveBeenCalledWith({
        activeElement: null,
        step: STEPS[1],
        type: 'started',
      })

      dispose()
    })
  })

  it('should remain closed when there are no steps', () => {
    createRoot((dispose) => {
      const tour = useTour({getStepElement, steps: () => []})

      expect(tour.start()).toBe(false)
      expect(tour.next()).toBe(false)
      expect(tour.previous()).toBe(false)
      expect(tour.stepCount()).toBe(0)
      expect(tour.stepIndex()).toBe(-1)

      dispose()
    })
  })

  it('should become inactive when the active step is removed', () => {
    const {dispose, setSteps, tour} = createRoot((dispose) => {
      const [steps, setSteps] = createSignal<ReadonlyArray<TestStep>>(STEPS)
      const tour = useTour({getStepElement, steps})

      return {dispose, setSteps, tour}
    })

    tour.start('music')
    setSteps([STEPS[2]])

    expect(tour.activeStep()).toBeNull()
    expect(tour.isOpen()).toBe(false)
    expect(tour.stepIndex()).toBe(-1)
    expect(tour.next()).toBe(false)
    expect(tour.previous()).toBe(false)
    expect(tour.dismiss()).toBeUndefined()

    setSteps(STEPS)
    expect(tour.activeStep()).toBeNull()
    expect(tour.isOpen()).toBe(false)

    dispose()
  })

  it('should resolve the current element from its step id on every read', () => {
    createRoot((dispose) => {
      const initialElement = document.createElement('button')
      const replacementElement = document.createElement('button')
      let currentElement: Element | null = initialElement
      const resolveStepElement = vi.fn((stepId: string) =>
        stepId === 'music' ? currentElement : null,
      )
      const tour = useTour({getStepElement: resolveStepElement, steps: () => STEPS})

      expect(tour.activeElement()).toBeNull()
      expect(resolveStepElement).not.toHaveBeenCalled()

      tour.start('music')
      expect(tour.activeElement()).toBe(initialElement)

      currentElement = replacementElement
      expect(tour.activeElement()).toBe(replacementElement)
      expect(resolveStepElement).toHaveBeenNthCalledWith(1, 'music')
      expect(resolveStepElement).toHaveBeenNthCalledWith(2, 'music')

      dispose()
    })
  })

  it('should reveal an opted-in step without forcing hidden overflow containers', () => {
    createRoot((dispose) => {
      const element = document.createElement('button')
      const steps = [
        {id: 'timer', scrollIntoView: true, title: 'Timer'},
      ] satisfies ReadonlyArray<TestStep>
      const tour = useTour({getStepElement: () => element, steps: () => steps})

      tour.start()

      expect(scrollIntoViewIfNeeded).toHaveBeenCalledWith(element, {
        skipOverflowHiddenElements: true,
      })

      dispose()
    })
  })

  it('should reveal an opted-in step when moving through the tour', () => {
    createRoot((dispose) => {
      const element = document.createElement('button')
      const steps = [
        {id: 'timer', title: 'Timer'},
        {id: 'music', scrollIntoView: true, title: 'Music'},
      ] satisfies ReadonlyArray<TestStep>
      const tour = useTour({
        getStepElement: (stepId) => (stepId === 'music' ? element : null),
        steps: () => steps,
      })

      tour.start()
      expect(scrollIntoViewIfNeeded).not.toHaveBeenCalled()

      tour.next()
      expect(scrollIntoViewIfNeeded).toHaveBeenCalledWith(element, {
        skipOverflowHiddenElements: true,
      })

      dispose()
    })
  })

  it('should not scroll when an opted-in step has no target element', () => {
    createRoot((dispose) => {
      const steps = [
        {id: 'timer', scrollIntoView: true, title: 'Timer'},
      ] satisfies ReadonlyArray<TestStep>
      const tour = useTour({getStepElement, steps: () => steps})

      tour.start()

      expect(scrollIntoViewIfNeeded).not.toHaveBeenCalled()

      dispose()
    })
  })

  it('should include the corresponding element in every lifecycle event', () => {
    createRoot((dispose) => {
      const timerElement = document.createElement('button')
      const musicElement = document.createElement('button')
      const steps = STEPS.slice(0, 2)
      const events: TourEvent<TestStep>[] = []
      const tour = useTour({
        getStepElement: (stepId) => {
          if (stepId === 'timer') {
            return timerElement
          }

          return stepId === 'music' ? musicElement : null
        },
        onEvent: (event) => events.push(event),
        steps: () => steps,
      })

      tour.start()
      tour.next()
      tour.next()
      tour.start()
      tour.dismiss()

      expect(events).toEqual([
        {activeElement: timerElement, step: steps[0], type: 'started'},
        {
          activeElement: musicElement,
          previousStep: steps[0],
          step: steps[1],
          type: 'step-changed',
        },
        {activeElement: musicElement, step: steps[1], type: 'completed'},
        {activeElement: timerElement, step: steps[0], type: 'started'},
        {activeElement: timerElement, step: steps[0], type: 'dismissed'},
      ])

      dispose()
    })
  })

  it('should not resolve event elements when there is no event listener', () => {
    createRoot((dispose) => {
      const resolveStepElement = vi.fn(() => null)
      const tour = useTour({getStepElement: resolveStepElement, steps: () => STEPS})

      tour.start('settings')
      tour.next()
      tour.start()
      tour.dismiss()

      expect(resolveStepElement).not.toHaveBeenCalled()

      dispose()
    })
  })
})
