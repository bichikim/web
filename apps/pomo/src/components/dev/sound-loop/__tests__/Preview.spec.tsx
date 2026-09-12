/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {Preview} from '../Preview'

afterEach(cleanup)

it('should clear an earlier playback error when a replacement source becomes ready', () => {
  const [url, setUrl] = createSignal('blob:first')
  render(() => <Preview label="원본" url={url()} />)
  const audio = screen.getByLabelText('원본 재생')
  fireEvent.error(audio)
  expect(screen.getByRole('alert')).toHaveTextContent('이 파일을 재생할 수 없습니다.')

  setUrl('blob:second')
  fireEvent.emptied(audio)
  fireEvent.loadedMetadata(audio)

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: '끝 3초부터 듣기'})).toBeEnabled()
})
