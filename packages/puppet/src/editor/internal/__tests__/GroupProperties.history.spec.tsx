/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {createHistory as useDocumentHistory} from '../../__tests__/fixtures/history'
import {getSceneGroup} from '../group-properties'
import {GroupProperties} from '../GroupProperties'

test('should record a multi-keystroke group draw order edit as one history entry', () => {
  const history = useDocumentHistory({initialDocument: createDemoDocument()})
  render(() => (
    <GroupProperties
      document={history.document()}
      group={getSceneGroup(history.document(), 'shapes')!}
      onDocumentChange={history.setDocument}
      onEditEnd={history.endTransaction}
      onEditStart={history.beginTransaction}
    />
  ))
  fireEvent.click(screen.getByRole('checkbox', {name: '그리기 순서 그룹'}))
  const drawOrder = screen.getByRole('spinbutton', {name: '그룹 그리기 순서'})

  drawOrder.focus()
  fireEvent.input(drawOrder, {target: {value: '1'}})
  fireEvent.input(drawOrder, {target: {value: '12'}})
  drawOrder.blur()

  expect(getSceneGroup(history.document(), 'shapes')?.properties?.drawOrder).toBe(12)
  // The draw order group toggle and the numeric edit.
  expect(history.undoCount()).toBe(2)
})
