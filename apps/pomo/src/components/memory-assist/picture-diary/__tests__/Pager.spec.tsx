/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PictureDiaryPager} from '../Pager'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should forward turn direction and disable unavailable pages', () => {
  const onTurn = vi.fn()
  const [canGoOlder, setOlder] = createSignal(true)
  render(() => <PictureDiaryPager canGoOlder={canGoOlder()} canGoNewer onTurn={onTurn} />)
  fireEvent.click(screen.getByRole('button', {name: m.picture_diary_previous_entry()}))
  fireEvent.click(screen.getByRole('button', {name: m.picture_diary_next_entry()}))
  expect(onTurn.mock.calls).toEqual([['older'], ['newer']])
  setOlder(false)
  expect(screen.getByRole('button', {name: m.picture_diary_previous_entry()})).toBeDisabled()
})
