import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'
import {createDemoDocument, parseDocumentValue} from '../../src/player'
import {GroupProperties} from '../../src/editor/internal/GroupProperties'
import {getSceneGroup, setGroupRenderProperties} from '../../src/editor/internal/group-properties'

test('should keep isolated group order editable when its explicit rest order is cleared', () => {
  const initial = setGroupRenderProperties(createDemoDocument(), 'shapes', {isolateOrder: true})!
  const [document, setDocument] = createSignal(initial)
  const view = render(() => (
    <GroupProperties
      document={document()}
      group={getSceneGroup(document(), 'shapes')!}
      onDocumentChange={setDocument}
    />
  ))
  try {
    const input = () => screen.getByRole('spinbutton', {name: '그룹 그리기 순서'})
    fireEvent.input(input(), {target: {value: '612'}})
    expect(getSceneGroup(document(), 'shapes')?.properties).toMatchObject({
      drawOrder: 612,
      isolateOrder: true,
    })
    fireEvent.click(screen.getByRole('checkbox', {name: '그리기 순서 그룹'}))
    expect(getSceneGroup(document(), 'shapes')?.properties?.drawOrder).toBeUndefined()
    expect(input()).toBeVisible()
    expect(parseDocumentValue(document()).ok).toBe(true)
    expect(getSceneGroup(document(), 'shapes')?.properties?.offscreen).not.toBe(true)
  } finally {
    view.unmount()
  }
})
