/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {PartPresetProperties} from '../PartPresetProperties'

const choose = async (label: RegExp, option: string) => {
  fireEvent.keyDown(screen.getByRole('button', {name: label}), {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: option}))
}

const renderPart = (partId: string) => {
  const [document, setDocument] = createSignal(createDemoDocument())
  render(() => (
    <PartPresetProperties
      document={document()}
      part={document().parts.find((part) => part.id === partId)!}
      onDocumentChange={setDocument}
    />
  ))
  return document
}

describe('PartPresetProperties', () => {
  test('should create, rename and leave a hit area', async () => {
    const document = renderPart('shape-circle')

    await choose(/파트 히트 영역/, '새 영역')
    expect(document().hitAreas).toEqual([{id: '영역 1', partIds: ['shape-circle']}])

    const name = screen.getByRole('textbox', {name: '히트 영역 이름'})
    fireEvent.input(name, {target: {value: '머리'}})
    fireEvent.keyDown(name, {key: 'Enter'})
    expect(document().hitAreas?.[0]?.id).toBe('머리')

    await choose(/파트 히트 영역/, '없음')
    expect(document().hitAreas).toBeUndefined()
  })

  test('should create a pose group and edit its value and fade time', async () => {
    const document = renderPart('shape-circle')

    await choose(/파트 포즈 그룹/, '새 포즈 그룹')
    expect(document().poseGroups?.[0]).toMatchObject({
      entries: [{partIds: ['shape-circle'], value: 0}],
      parameterId: 'angle-x',
    })

    fireEvent.input(screen.getByRole('spinbutton', {name: '이 파트를 표시할 파라미터 값'}), {
      target: {value: '15'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '포즈 전환 시간(초)'}), {
      target: {value: '0.25'},
    })
    expect(document().poseGroups?.[0]).toMatchObject({
      entries: [{partIds: ['shape-circle'], value: 15}],
      fadeTime: 0.25,
    })
    expect(parseDocument(serializeDocument(document())).ok).toBe(true)
  })

  test('should reject a duplicate hit area name and keep the document', async () => {
    const document = renderPart('shape-circle')
    await choose(/파트 히트 영역/, '새 영역')
    const name = screen.getByRole('textbox', {name: '히트 영역 이름'})
    fireEvent.input(name, {target: {value: ' '}})
    fireEvent.keyDown(name, {key: 'Enter'})

    expect(screen.getByRole('alert')).toBeDefined()
    expect(document().hitAreas?.[0]?.id).toBe('영역 1')
  })
})
