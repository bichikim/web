/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PTourBody} from '../Body'
import {HTour} from '../headless'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should present step media and finish navigation inside the tour context', async () => {
  const onOpenChange = vi.fn()
  const target = document.createElement('button')
  render(() => (
    <HTour.Root
      isOpen
      getStepElement={() => target}
      onOpenChange={onOpenChange}
      steps={[
        {
          description: '기능 설명',
          id: 'first',
          title: '안내',
          video: {label: '사용 영상', source: '/tour.webm'},
        },
      ]}
    >
      {(tour) => <PTourBody titleId="step-title" tour={tour} />}
    </HTour.Root>
  ))
  expect(await screen.findByRole('dialog', {name: '안내'})).toBeVisible()
  expect(screen.getByText('기능 설명')).toBeVisible()
  expect(screen.getByLabelText('사용 영상')).toHaveAttribute('src', '/tour.webm')
  expect(screen.getByRole('button', {name: m.tour_previous()})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: m.tour_finish()}))
  expect(onOpenChange).toHaveBeenCalledWith(false)
})
