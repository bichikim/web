/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument} from '../../../player'
import {EditorKeyformPanel} from '../EditorKeyformPanel'
import {addParameter, insertParameterKeyform} from '../parameter-keyforms'

const createOneDimensionalDocument = () => {
  const added = addParameter({document: createDemoDocument(), partIds: ['mesh-preview']})
  if (added === undefined) {
    throw new Error('Expected a one-dimensional parameter')
  }

  const withMinimum = insertParameterKeyform({
    bindingId: added.binding.id,
    document: added.document,
    values: [-30],
  })
  const withMaximum =
    withMinimum === undefined
      ? undefined
      : insertParameterKeyform({bindingId: added.binding.id, document: withMinimum, values: [30]})
  if (withMaximum === undefined) {
    throw new Error('Expected one-dimensional keyforms')
  }

  return {bindingId: added.binding.id, document: withMaximum}
}

const dispatchPointerEvent = (
  target: EventTarget,
  type: string,
  pointerId: number,
  clientX: number,
  clientY = 0,
) => {
  const event = new MouseEvent(type, {bubbles: true, button: 0, clientX, clientY})
  Object.defineProperty(event, 'pointerId', {value: pointerId})
  target.dispatchEvent(event)
}

describe('EditorKeyformPanel', () => {
  test('should render and select a complete two-dimensional keyform grid', () => {
    const document = createDemoDocument()
    const onKeyformSelect = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        activeKeyformValues={[0, 0]}
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        values={[0, 0]}
        onKeyformSelect={onKeyformSelect}
      />
    ))
    const markers = view.container.querySelectorAll('.parameter-grid-keyform')

    expect(view.getAllByText('Angle X').length).toBeGreaterThan(0)
    expect(view.getAllByText('Angle Y').length).toBeGreaterThan(0)
    expect(view.getByLabelText('Angle X와 Angle Y 2차원 키폼 grid')).toBeVisible()
    expect(view.getByRole('button', {name: 'Angle X'}).closest('.keyform-track-label')).toHaveClass(
      'parameter-grid-label',
    )
    expect(markers).toHaveLength(9)
    expect(view.container.querySelectorAll('.parameter-grid-keyform.selected')).toHaveLength(1)

    fireEvent.click(markers[8]!)
    expect(onKeyformSelect).toHaveBeenCalledWith('angle-xy', [30, 30])
  })

  test('should expose independent numeric inputs for both axes', () => {
    const document = createDemoDocument()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        values={[0, 0]}
        onValueChange={onValueChange}
      />
    ))

    fireEvent.input(view.getByRole('spinbutton', {name: 'Angle X 값'}), {target: {value: '15'}})
    fireEvent.input(view.getByRole('spinbutton', {name: 'Angle Y 값'}), {target: {value: '-10'}})

    expect(view.container.querySelector('.keyform-current-values')).toBeNull()
    expect(
      view.getByRole('spinbutton', {name: 'Angle X 값'}).closest('.keyform-track-label'),
    ).toHaveClass('parameter-grid-label')
    expect(view.queryByText('-30 · 0 · 30 · 9 keyforms')).not.toBeInTheDocument()
    expect(onValueChange).toHaveBeenNthCalledWith(1, [15, 0])
    expect(onValueChange).toHaveBeenNthCalledWith(2, [0, -10])
  })

  test('should enable add and delete actions for two-dimensional keyforms', () => {
    const document = createDemoDocument()
    const onKeyformAdd = vi.fn()
    const onKeyformDelete = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        activeKeyformValues={[0, 0]}
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        values={[0, 0]}
        onKeyformAdd={onKeyformAdd}
        onKeyformDelete={onKeyformDelete}
      />
    ))

    const addButton = view.getByRole('button', {name: '+ 현재 값에 키폼'})
    const deleteButton = view.getByRole('button', {name: '선택 키폼 삭제'})
    expect(addButton).toBeEnabled()
    expect(deleteButton).toBeEnabled()

    fireEvent.click(addButton)
    fireEvent.click(deleteButton)
    expect(onKeyformAdd).toHaveBeenCalledOnce()
    expect(onKeyformDelete).toHaveBeenCalledOnce()
  })

  test('should keep each binding current values visible when another binding is active', () => {
    const document = createDemoDocument()
    const added = addParameter({document, partIds: ['mesh-preview']})
    const onBindingSelect = vi.fn()
    const onValueChange = vi.fn()

    expect(added).toBeDefined()

    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={added!.binding.id}
        bindings={added!.document.parameterBindings ?? []}
        parameters={added!.document.parameters ?? []}
        parameterValueMap={{
          'angle-x': -15,
          'angle-y': 15,
          [added!.binding.parameterIds[0]]: 15,
        }}
        values={[15]}
        onBindingSelect={onBindingSelect}
        onValueChange={onValueChange}
      />
    ))
    const grid = view.getByLabelText('Angle X와 Angle Y 2차원 키폼 grid')

    expect(grid.querySelector('.parameter-grid-current-x')).toHaveStyle({left: '25%'})
    expect(grid.querySelector('.parameter-grid-current-y')).toHaveStyle({bottom: '75%'})
    expect(view.getByRole('spinbutton', {name: 'Angle X 값'})).toHaveValue(-15)
    expect(view.getByRole('spinbutton', {name: 'Angle Y 값'})).toHaveValue(15)
    expect(
      view.getByRole('spinbutton', {name: 'Parameter 3 값'}).closest('.keyform-track-label'),
    ).not.toHaveClass('parameter-grid-label')
    expect(view.getByRole('slider', {name: 'Parameter 3 현재 값'})).toHaveStyle({left: '75%'})

    fireEvent.input(view.getByRole('spinbutton', {name: 'Angle X 값'}), {
      target: {value: '-10'},
    })
    expect(onBindingSelect).toHaveBeenCalledWith('angle-xy')
    expect(onValueChange).toHaveBeenCalledWith([-10, 15])
  })

  test('should select an inactive one-dimensional track and apply its clicked value', () => {
    const document = createDemoDocument()
    const added = addParameter({document, partIds: ['mesh-preview']})
    const onBindingSelect = vi.fn()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        bindings={added!.document.parameterBindings ?? []}
        parameters={added!.document.parameters ?? []}
        values={[0, 0]}
        onBindingSelect={onBindingSelect}
        onValueChange={onValueChange}
      />
    ))
    const track = view.getByLabelText('Parameter 3 키폼 트랙')

    expect(
      view.getByRole('button', {name: 'Parameter 3'}).closest('.keyform-track-label'),
    ).not.toHaveClass('parameter-grid-label')

    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      bottom: 176,
      height: 76,
      left: 100,
      right: 300,
      toJSON: () => ({}),
      top: 100,
      width: 200,
      x: 100,
      y: 100,
    })
    fireEvent(
      track,
      new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 150, clientY: 138}),
    )

    expect(onBindingSelect).toHaveBeenCalledWith(added!.binding.id)
    expect(onValueChange).toHaveBeenCalledWith([-15])
  })

  test('should select an inactive two-dimensional track and apply its clicked values', () => {
    const document = createDemoDocument()
    const added = addParameter({document, partIds: ['mesh-preview']})
    const onBindingSelect = vi.fn()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={added!.binding.id}
        bindings={added!.document.parameterBindings ?? []}
        parameters={added!.document.parameters ?? []}
        values={[0]}
        onBindingSelect={onBindingSelect}
        onValueChange={onValueChange}
      />
    ))
    const grid = view.container.querySelector('.parameter-grid') as HTMLDivElement

    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      bottom: 232,
      height: 132,
      left: 100,
      right: 232,
      toJSON: () => ({}),
      top: 100,
      width: 132,
      x: 100,
      y: 100,
    })
    fireEvent(
      grid,
      new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 232, clientY: 100}),
    )

    expect(onBindingSelect).toHaveBeenCalledWith('angle-xy')
    expect(onValueChange).toHaveBeenCalledWith([30, 30])
  })

  test('should update both values while dragging the visual grid', () => {
    const document = createDemoDocument()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        values={[0, 0]}
        onValueChange={onValueChange}
      />
    ))
    const grid = view.container.querySelector('.parameter-grid') as HTMLDivElement

    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      bottom: 232,
      height: 132,
      left: 100,
      right: 232,
      toJSON: () => ({}),
      top: 100,
      width: 132,
      x: 100,
      y: 100,
    })
    fireEvent(
      grid,
      new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 166, clientY: 166}),
    )
    fireEvent(window, new MouseEvent('pointermove', {clientX: 232, clientY: 100}))
    fireEvent(window, new MouseEvent('pointerup'))

    expect(onValueChange).toHaveBeenNthCalledWith(1, [0, 0])
    expect(onValueChange).toHaveBeenLastCalledWith([30, 30])
  })

  test('should ignore another pointer during a two-dimensional value drag', () => {
    const document = createDemoDocument()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        values={[0, 0]}
        onValueChange={onValueChange}
      />
    ))
    const grid = view.container.querySelector('.parameter-grid') as HTMLDivElement

    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      bottom: 232,
      height: 132,
      left: 100,
      right: 232,
      toJSON: () => ({}),
      top: 100,
      width: 132,
      x: 100,
      y: 100,
    })
    dispatchPointerEvent(grid, 'pointerdown', 1, 166, 166)
    dispatchPointerEvent(window, 'pointermove', 2, 232, 100)
    dispatchPointerEvent(window, 'pointerup', 2, 232, 100)

    expect(onValueChange).toHaveBeenCalledOnce()
    dispatchPointerEvent(window, 'pointermove', 1, 232, 100)
    expect(onValueChange).toHaveBeenLastCalledWith([30, 30])
    dispatchPointerEvent(window, 'pointerup', 1, 232, 100)
  })

  test('should ignore another pointer during a one-dimensional value drag', () => {
    const fixture = createOneDimensionalDocument()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={fixture.bindingId}
        bindings={fixture.document.parameterBindings ?? []}
        parameters={fixture.document.parameters ?? []}
        values={[0]}
        onValueChange={onValueChange}
      />
    ))
    const track = view.getByLabelText('Parameter 3 키폼 트랙')

    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      bottom: 76,
      height: 76,
      left: 100,
      right: 700,
      toJSON: () => ({}),
      top: 0,
      width: 600,
      x: 100,
      y: 0,
    })
    const scrubber = view.getByRole('slider', {name: 'Parameter 3 현재 값'})
    dispatchPointerEvent(scrubber, 'pointerdown', 1, 400)
    dispatchPointerEvent(window, 'pointermove', 2, 550)
    dispatchPointerEvent(window, 'pointerup', 2, 550)

    expect(onValueChange).toHaveBeenCalledOnce()
    dispatchPointerEvent(window, 'pointermove', 1, 550)
    expect(onValueChange).toHaveBeenLastCalledWith([15])
    dispatchPointerEvent(window, 'pointerup', 1, 550)
  })

  test('should offer separate one-dimensional and two-dimensional creation actions', () => {
    const onParameterAdd = vi.fn()
    const onTwoDimensionalParameterAdd = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        bindings={[]}
        parameters={[]}
        onParameterAdd={onParameterAdd}
        onTwoDimensionalParameterAdd={onTwoDimensionalParameterAdd}
      />
    ))

    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    fireEvent.click(view.getByRole('button', {name: '2차원 Parameter 추가'}))

    expect(onParameterAdd).toHaveBeenCalledOnce()
    expect(onTwoDimensionalParameterAdd).toHaveBeenCalledOnce()
  })

  test('should preview a keyform drag and commit its value only after release', () => {
    const onKeyformMove = vi.fn()
    const onKeyformSelect = vi.fn()
    const fixture = createOneDimensionalDocument()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={fixture.bindingId}
        bindings={fixture.document.parameterBindings ?? []}
        parameters={fixture.document.parameters ?? []}
        values={[0]}
        onKeyformMove={onKeyformMove}
        onKeyformSelect={onKeyformSelect}
      />
    ))
    const track = view.getByLabelText('Parameter 3 키폼 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      bottom: 76,
      height: 76,
      left: 100,
      right: 700,
      toJSON: () => ({}),
      top: 0,
      width: 600,
      x: 100,
      y: 0,
    })
    const marker = view.getByRole('button', {name: 'Parameter 3 0 키폼'})

    marker.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 400}))
    window.dispatchEvent(new MouseEvent('pointermove', {clientX: 550}))
    expect(view.getByRole('button', {name: 'Parameter 3 15 키폼'})).toHaveClass('dragging')
    expect(onKeyformMove).not.toHaveBeenCalled()
    window.dispatchEvent(new MouseEvent('pointerup'))

    expect(onKeyformSelect).toHaveBeenCalledWith(fixture.bindingId, [0])
    expect(onKeyformMove).toHaveBeenCalledOnce()
    expect(onKeyformMove).toHaveBeenCalledWith(fixture.bindingId, [0], [15])
    window.dispatchEvent(new MouseEvent('pointermove', {clientX: 650}))
    expect(onKeyformMove).toHaveBeenCalledOnce()

    const cancelMarker = view.getByRole('button', {name: 'Parameter 3 -30 키폼'})
    cancelMarker.dispatchEvent(
      new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}),
    )
    window.dispatchEvent(new MouseEvent('pointermove', {clientX: 250}))
    expect(view.getByRole('button', {name: 'Parameter 3 -15 키폼'})).toHaveClass('dragging')
    window.dispatchEvent(new MouseEvent('pointercancel'))
    expect(view.getByRole('button', {name: 'Parameter 3 -30 키폼'})).not.toHaveClass('dragging')
    expect(onKeyformMove).toHaveBeenCalledOnce()
  })

  test('should move a focused keyform with the keyboard', () => {
    const onKeyformMove = vi.fn()
    const fixture = createOneDimensionalDocument()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={fixture.bindingId}
        bindings={fixture.document.parameterBindings ?? []}
        parameters={fixture.document.parameters ?? []}
        values={[0]}
        onKeyformMove={onKeyformMove}
      />
    ))

    fireEvent.keyDown(view.getByRole('button', {name: 'Parameter 3 0 키폼'}), {
      key: 'ArrowRight',
    })

    expect(onKeyformMove).toHaveBeenCalledWith(fixture.bindingId, [0], [0.5])
  })

  test('should ignore pointer events from another pointer during a keyform drag', () => {
    const onKeyformMove = vi.fn()
    const fixture = createOneDimensionalDocument()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={fixture.bindingId}
        bindings={fixture.document.parameterBindings ?? []}
        parameters={fixture.document.parameters ?? []}
        values={[0]}
        onKeyformMove={onKeyformMove}
      />
    ))
    const track = view.getByLabelText('Parameter 3 키폼 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      bottom: 76,
      height: 76,
      left: 100,
      right: 700,
      toJSON: () => ({}),
      top: 0,
      width: 600,
      x: 100,
      y: 0,
    })
    const marker = view.getByRole('button', {name: 'Parameter 3 0 키폼'})
    dispatchPointerEvent(marker, 'pointerdown', 1, 400)
    dispatchPointerEvent(window, 'pointermove', 2, 550)
    dispatchPointerEvent(window, 'pointerup', 2, 550)

    expect(onKeyformMove).not.toHaveBeenCalled()
    expect(marker).not.toHaveClass('dragging')

    dispatchPointerEvent(window, 'pointermove', 1, 550)
    expect(view.getByRole('button', {name: 'Parameter 3 15 키폼'})).toHaveClass('dragging')
    dispatchPointerEvent(window, 'pointerup', 1, 550)
    expect(onKeyformMove).toHaveBeenCalledWith(fixture.bindingId, [0], [15])
  })
})
