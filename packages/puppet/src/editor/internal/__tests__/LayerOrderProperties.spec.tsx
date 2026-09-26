/** @vitest-environment jsdom */

import {fireEvent, render, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {LayerOrderProperties} from '../LayerOrderProperties'

describe('LayerOrderProperties', () => {
  test('should edit and persist an existing combined-parameter rule', () => {
    const source = createDemoDocument()
    const [document, setDocument] = createSignal({
      ...source,
      layerOrderRules: [
        {
          partIds: ['shape-circle'],
          placement: 'before' as const,
          referencePartId: 'mesh-preview',
          when: {
            comparison: 'greater-than' as const,
            parameterIds: ['angle-x', 'angle-y'],
            threshold: 22,
          },
        },
      ],
    })
    const view = render(() => (
      <LayerOrderProperties
        document={document()}
        selectedPartIds={['shape-circle']}
        onDocumentChange={setDocument}
      />
    ))

    fireEvent.click(view.getByText(/레이어 순서 규칙/))
    fireEvent.click(view.getByLabelText(/shape-circle.*mesh-preview/))
    expect(view.getByRole('button', {name: 'angle-x 제거'})).toBeDefined()
    expect(view.getByRole('button', {name: 'angle-y 제거'})).toBeDefined()
    fireEvent.input(view.getByRole('spinbutton', {name: '전환 기준값'}), {
      target: {value: '28'},
    })
    fireEvent.click(view.getByRole('button', {name: '규칙 저장'}))

    expect(document().layerOrderRules?.[0]?.when.threshold).toBe(28)
    expect(parseDocument(serializeDocument(document())).ok).toBe(true)
  })

  test('should create a rule from selected parts without changing the document before saving', () => {
    const [document, setDocument] = createSignal(createDemoDocument())
    const view = render(() => (
      <LayerOrderProperties
        document={document()}
        selectedPartIds={['shape-circle']}
        onDocumentChange={setDocument}
      />
    ))

    fireEvent.click(view.getByText(/레이어 순서 규칙/))
    fireEvent.click(view.getByRole('button', {name: '선택 파츠로 규칙 추가'}))
    expect(document().layerOrderRules).toBeUndefined()
    expect(view.getByRole('button', {name: '규칙 저장'})).toBeDisabled()
    fireEvent.change(view.getByRole('combobox', {name: '기준 파츠'}), {
      target: {value: 'mesh-preview'},
    })
    fireEvent.change(view.getByRole('combobox', {name: '조건 파라미터 추가'}), {
      target: {value: 'angle-x'},
    })
    fireEvent.click(view.getByRole('button', {name: '규칙 저장'}))

    expect(document().layerOrderRules).toMatchObject([
      {partIds: ['shape-circle'], referencePartId: 'mesh-preview'},
    ])
    expect(parseDocument(serializeDocument(document())).ok).toBe(true)
  })

  test('should search the reference part and save both rotation inputs with the chosen direction', () => {
    const [document, setDocument] = createSignal(createDemoDocument())
    const view = render(() => (
      <LayerOrderProperties
        document={document()}
        selectedPartIds={['shape-circle']}
        onDocumentChange={setDocument}
      />
    ))

    fireEvent.click(view.getByText(/레이어 순서 규칙/))
    fireEvent.click(view.getByRole('button', {name: '선택 파츠로 규칙 추가'}))
    fireEvent.input(view.getByRole('searchbox', {name: '기준 파츠 검색'}), {
      target: {value: 'diamond'},
    })
    fireEvent.change(view.getByRole('combobox', {name: '기준 파츠'}), {
      target: {value: 'shape-diamond'},
    })
    fireEvent.change(view.getByRole('combobox', {name: '조건 파라미터 추가'}), {
      target: {value: 'angle-x'},
    })
    fireEvent.change(view.getByRole('combobox', {name: '조건 파라미터 추가'}), {
      target: {value: 'angle-y'},
    })
    fireEvent.change(view.getByRole('combobox', {name: '전환 조건'}), {
      target: {value: 'less-than'},
    })
    fireEvent.change(view.getByRole('combobox', {name: '전환 후 위치'}), {
      target: {value: 'after'},
    })
    fireEvent.input(view.getByRole('spinbutton', {name: '전환 기준값'}), {
      target: {value: '-10'},
    })
    fireEvent.click(view.getByRole('button', {name: '규칙 저장'}))

    expect(document().layerOrderRules).toMatchObject([
      {
        placement: 'after',
        referencePartId: 'shape-diamond',
        when: {
          comparison: 'less-than',
          parameterIds: ['angle-x', 'angle-y'],
          threshold: -10,
        },
      },
    ])
  })

  test('should reorder rules that can affect the same layer', () => {
    const source = createDemoDocument()
    const [document, setDocument] = createSignal({
      ...source,
      layerOrderRules: [
        {
          partIds: ['shape-circle'],
          placement: 'before' as const,
          referencePartId: 'mesh-preview',
          when: {comparison: 'greater-than' as const, parameterIds: ['angle-x'], threshold: 10},
        },
        {
          partIds: ['shape-circle'],
          placement: 'after' as const,
          referencePartId: 'shape-diamond',
          when: {comparison: 'greater-than' as const, parameterIds: ['angle-y'], threshold: 10},
        },
      ],
    })
    const view = render(() => (
      <LayerOrderProperties
        document={document()}
        selectedPartIds={['shape-circle']}
        onDocumentChange={setDocument}
      />
    ))

    fireEvent.click(view.getByText(/레이어 순서 규칙/))
    const firstRule = view.getByLabelText(/shape-circle.*mesh-preview/).closest('details')!
    fireEvent.click(view.getByLabelText(/shape-circle.*mesh-preview/))
    expect(within(firstRule).getByRole('button', {name: '규칙 위로'})).toBeDisabled()
    fireEvent.click(within(firstRule).getByRole('button', {name: '규칙 아래로'}))

    expect(document().layerOrderRules?.[0]?.referencePartId).toBe('shape-diamond')
  })

  test('should support cancelling a draft and deleting a rule', () => {
    const [document, setDocument] = createSignal(createDemoDocument())
    const view = render(() => (
      <LayerOrderProperties
        document={document()}
        selectedPartIds={['shape-circle']}
        onDocumentChange={setDocument}
      />
    ))

    fireEvent.click(view.getByText(/레이어 순서 규칙/))
    fireEvent.click(view.getByRole('button', {name: '선택 파츠로 규칙 추가'}))
    fireEvent.click(view.getByRole('button', {name: '취소'}))
    expect(document().layerOrderRules).toBeUndefined()

    fireEvent.click(view.getByRole('button', {name: '선택 파츠로 규칙 추가'}))
    fireEvent.change(view.getByRole('combobox', {name: '기준 파츠'}), {
      target: {value: 'mesh-preview'},
    })
    fireEvent.change(view.getByRole('combobox', {name: '조건 파라미터 추가'}), {
      target: {value: 'angle-x'},
    })
    fireEvent.click(view.getByRole('button', {name: '규칙 저장'}))
    fireEvent.click(view.getByRole('button', {name: '규칙 삭제'}))
    expect(document().layerOrderRules).toEqual([])
  })

  test('should explain why a rule cannot be added without selected parts', () => {
    const view = render(() => (
      <LayerOrderProperties document={createDemoDocument()} selectedPartIds={[]} />
    ))

    fireEvent.click(view.getByText(/레이어 순서 규칙/))
    expect(view.getByRole('button', {name: '선택 파츠로 규칙 추가'})).toBeDisabled()
    expect(view.getByText('왼쪽 레이어 목록에서 이동할 파츠를 선택하세요.')).toBeDefined()
  })
})
