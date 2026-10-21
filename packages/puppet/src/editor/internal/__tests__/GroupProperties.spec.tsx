/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {getKeyformGroupProperties} from '../group-keyforms'
import {getSceneGroup, setGroupRenderProperties} from '../group-properties'
import {GroupProperties} from '../GroupProperties'

const choose = async (label: RegExp, option: string) => {
  fireEvent.keyDown(screen.getByRole('button', {name: label}), {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: option}))
}

/** The demo's `shapes` group, and a part outside it to mask with. */
const createGroupedDocument = () => ({
  document: createDemoDocument(),
  groupId: 'shapes',
  maskId: 'mesh-preview',
})

describe('setGroupRenderProperties', () => {
  test('should drop compositing properties when the group stops being offscreen', () => {
    const {document, groupId, maskId} = createGroupedDocument()
    const offscreen = setGroupRenderProperties(document, groupId, {
      blendMode: 'overlay',
      clippingMaskIds: [maskId],
      offscreen: true,
      opacity: 0.5,
    })!
    const plain = setGroupRenderProperties(offscreen, groupId, {offscreen: false})!

    expect(getSceneGroup(offscreen, groupId)?.properties).toMatchObject({blendMode: 'overlay'})
    expect(getSceneGroup(plain, groupId)?.properties).toEqual({offscreen: false, opacity: 0.5})
    expect(parseDocument(serializeDocument(offscreen)).ok).toBe(true)
    expect(setGroupRenderProperties(document, maskId, {opacity: 0.5})).toBeUndefined()
  })
})

describe('GroupProperties', () => {
  test('should edit plain group effects and offscreen compositing', async () => {
    const grouped = createGroupedDocument()
    const [document, setDocument] = createSignal(grouped.document)
    render(() => (
      <GroupProperties
        document={document()}
        group={getSceneGroup(document(), grouped.groupId)!}
        onDocumentChange={setDocument}
      />
    ))
    const properties = () => getSceneGroup(document(), grouped.groupId)?.properties

    fireEvent.input(screen.getByRole('spinbutton', {name: '그룹 불투명도'}), {
      target: {value: '0.4'},
    })
    expect(properties()).toEqual({opacity: 0.4})
    expect(screen.queryByRole('button', {name: /그룹 블렌드 모드/})).toBeNull()

    fireEvent.click(screen.getByRole('checkbox', {name: '오프스크린 합성'}))
    await choose(/그룹 블렌드 모드/, 'soft-light')
    await choose(/그룹 클리핑 마스크/, grouped.maskId)
    expect(properties()).toEqual({
      blendMode: 'soft-light',
      clippingMaskIds: [grouped.maskId],
      offscreen: true,
      opacity: 0.4,
    })
    expect(parseDocument(serializeDocument(document())).ok).toBe(true)
  })

  test('should key opacity in the selected keyform once connected', () => {
    const grouped = createGroupedDocument()
    const [document, setDocument] = createSignal(grouped.document)
    render(() => (
      <GroupProperties
        document={document()}
        group={getSceneGroup(document(), grouped.groupId)!}
        keyform={{bindingId: 'angle-xy', values: [30, 0]}}
        onDocumentChange={setDocument}
      />
    ))

    fireEvent.click(
      screen.getByRole('checkbox', {name: '그룹 불투명도·색상을 활성 파라미터에 키로 연결'}),
    )
    fireEvent.input(screen.getByRole('spinbutton', {name: '그룹 불투명도'}), {
      target: {value: '0.3'},
    })

    expect(
      getKeyformGroupProperties(document(), 'angle-xy', [30, 0], grouped.groupId)?.opacity,
    ).toBe(0.3)
    expect(getSceneGroup(document(), grouped.groupId)?.properties).toBeUndefined()
    expect(parseDocument(serializeDocument(document())).ok).toBe(true)
  })
})
