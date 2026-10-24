/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocumentValue} from '../../../player'
import {DocumentLayoutProperties} from '../DocumentLayoutProperties'
import {setFramesPerSecond} from '../motion-frame-rate'

describe('DocumentLayoutProperties', () => {
  test('should start from the whole canvas, then edit the rectangle and alignment', () => {
    const [document, setDocument] = createSignal(createDemoDocument())
    render(() => <DocumentLayoutProperties document={document()} onDocumentChange={setDocument} />)
    fireEvent.click(screen.getByRole('checkbox', {name: '기본 화면 영역 사용'}))
    const {viewport} = document()
    expect(document().layout).toEqual({height: viewport.height, width: viewport.width, x: 0, y: 0})
    fireEvent.input(screen.getByRole('spinbutton', {name: '기본 화면 너비'}), {
      target: {value: '120'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '기본 화면 세로 맞춤'}), {
      target: {value: '1'},
    })
    expect(document().layout).toMatchObject({align: [0.5, 1], width: 120})
    expect(parseDocumentValue(document()).ok).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', {name: '기본 화면 영역 사용'}))
    expect(document().layout).toBeUndefined()
  })
})

describe('setFramesPerSecond', () => {
  test('should set a motion’s own rate, or the document default without a motion', () => {
    const document = createDemoDocument()
    const motionId = document.motions[0]!.id
    const motion = setFramesPerSecond(document, motionId, 30)
    expect(motion?.motions[0]?.framesPerSecond).toBe(30)
    expect(motion?.framesPerSecond).toBe(document.framesPerSecond)
    expect(setFramesPerSecond(document, undefined, 60)?.framesPerSecond).toBe(60)
    expect(setFramesPerSecond(document, motionId, 0)).toBeUndefined()
    expect(setFramesPerSecond(document, 'missing', 30)).toBeUndefined()
  })
})
