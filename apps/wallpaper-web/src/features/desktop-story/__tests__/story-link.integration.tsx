import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {useDesktopStory} from '../use-desktop-story'

afterEach(cleanup)

it('should let a focused link keep Space while the story still accepts it from the stage', async () => {
  const onRequest = vi.fn()
  const Story = () => {
    const [stage, setStage] = createSignal<HTMLElement | null>(null)
    useDesktopStory({onRequest, stage})
    return (
      <main aria-label="Story stage" ref={setStage} tabindex={0}>
        <a href="#download">Download</a>
      </main>
    )
  }
  const view = render(() => <Story />)

  view.getByRole('link', {name: 'Download'}).focus()
  await expect.element(page.getByRole('link', {name: 'Download'})).toHaveFocus()
  await userEvent.keyboard(' ')
  expect(onRequest).not.toHaveBeenCalled()

  view.getByRole('main', {name: 'Story stage'}).focus()
  await expect.element(page.getByRole('main', {name: 'Story stage'})).toHaveFocus()
  await userEvent.keyboard(' ')
  expect(onRequest).toHaveBeenCalledOnce()
})
