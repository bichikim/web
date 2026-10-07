/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument} from '../../../player'
import {EditorKeyformPanel} from '../EditorKeyformPanel'
import {addParameter} from '../parameter-keyforms'

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
    expect(view.container.querySelector('.keyform-track-labels .keyform-track-label')).toBeVisible()
    expect(
      view.container.querySelector('.keyform-track-scroll .parameter-grid-track'),
    ).toBeVisible()
    expect(view.container.querySelector('.keyform-track-scroll .keyform-track-label')).toBeNull()
    expect(markers).toHaveLength(9)
    expect(view.container.querySelectorAll('.parameter-grid-keyform.selected')).toHaveLength(1)

    fireEvent.click(markers[8]!)
    expect(onKeyformSelect).toHaveBeenCalledWith('angle-xy', [30, 30])
  })

  test('should show the binding purpose separately from its parameter axis names', () => {
    const document = createDemoDocument()
    const bindings = (document.parameterBindings ?? []).map((binding) =>
      binding.id === 'angle-xy' ? {...binding, name: 'Face direction 2D'} : binding,
    )
    const view = render(() => (
      <EditorKeyformPanel bindings={bindings} parameters={document.parameters ?? []} />
    ))

    expect(view.getByText('Face direction 2D')).toBeVisible()
    expect(view.getByRole('button', {name: 'Angle X'})).toBeVisible()
    expect(view.getByRole('button', {name: 'Angle Y'})).toBeVisible()
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

  test('should rename the selected axis of a two-dimensional parameter', () => {
    const document = createDemoDocument()
    const onParameterNameChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        onParameterNameChange={onParameterNameChange}
      />
    ))

    fireEvent.dblClick(view.getByRole('button', {name: 'Angle Y'}))
    const nameInput = view.getByRole('textbox', {name: 'Parameter 이름'})
    fireEvent.input(nameInput, {target: {value: 'Head Y'}})
    fireEvent.keyDown(nameInput, {key: 'Enter'})

    expect(onParameterNameChange).toHaveBeenCalledWith('angle-xy', 'angle-y', 'Head Y')
  })

  test('should keep each binding current values visible when another binding is active', () => {
    const document = createDemoDocument()
    const added = addParameter({document, nodeIds: ['mesh-preview']})
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
})
