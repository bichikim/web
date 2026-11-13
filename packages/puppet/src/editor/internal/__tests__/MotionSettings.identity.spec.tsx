/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../../../player'
import {createHistory as useDocumentHistory} from '../../__tests__/fixtures/history'
import {MotionSettings} from '../MotionSettings'

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [
    {
      duration: 2,
      events: [
        {time: 0.5, value: 'first'},
        {time: 1.5, value: 'second'},
      ],
      id: 'wave',
      tracks: [],
    },
  ],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

test('should keep an edited event on its row so other rows act on their own events', async () => {
  const history = useDocumentHistory({initialDocument: createDocument()})
  render(() => (
    <MotionSettings
      currentTime={0}
      document={history.document()}
      motion={history.document().motions[0]}
      selection={null}
      onDocumentChange={history.setDocument}
      onEditEnd={history.endTransaction}
      onEditStart={history.beginTransaction}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '모션 설정'}))
  const time = await screen.findByRole('spinbutton', {name: '이벤트 1 시간'})

  time.focus()
  // Passing the second event must not move the edited row while typing.
  fireEvent.input(time, {target: {value: '1'}})
  fireEvent.input(time, {target: {value: '1.8'}})

  expect(screen.getByRole('spinbutton', {name: '이벤트 1 시간'})).toBe(time)
  expect(time).toHaveFocus()
  expect(screen.getByRole('textbox', {name: '이벤트 1 값'})).toHaveValue('first')

  time.blur()

  expect(history.document().motions[0]?.events).toEqual([
    {time: 1.8, value: 'first'},
    {time: 1.5, value: 'second'},
  ])
  expect(history.undoCount()).toBe(1)
  // The second row still shows and deletes the second event.
  fireEvent.click(screen.getByRole('button', {name: '이벤트 2 삭제'}))
  expect(history.document().motions[0]?.events).toEqual([{time: 1.8, value: 'first'}])
})
