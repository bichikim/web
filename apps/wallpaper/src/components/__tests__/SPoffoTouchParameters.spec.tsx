/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createStore, reconcile} from 'solid-js/store'
import {afterEach, expect, it, vi} from 'vitest'
import type {TouchParameterBinding} from '@winter-love/wallpaper/settings/touch'
import {SPoffoTouchParameters} from '../SPoffoTouchParameters'
import {interfaceLanguage, nativeLanguage} from '../../features/localization'

afterEach(cleanup)

it('should show successive additions and removals when library reconciliation retains the same store', () => {
  const [state, setState] = createStore<{
    parameters: Readonly<Record<string, TouchParameterBinding>> | undefined
  }>({parameters: undefined})
  const parameters = ['head', 'arm'].map((id) => ({
    axis: 'x' as const,
    defaultValue: 0,
    dimensions: 1,
    id,
    maximum: 1,
    minimum: -1,
    name: id,
    parts: ['part'],
  }))
  render(() => (
    <SPoffoTouchParameters
      source={{
        error: () => null,
        loading: () => false,
        parameters: () => parameters,
        touchParameters: () => parameters,
      }}
      value={state.parameters}
      onChange={vi.fn()}
    />
  ))
  setState('parameters', {head: {axis: 'auto'}})
  fireEvent.click(screen.getByRole('button', {name: 'head 편집'}))
  expect(screen.getByRole('combobox', {name: 'head 드래그 축'})).toBeTruthy()
  setState('parameters', reconcile({arm: {axis: 'auto'}, head: {axis: 'auto'}}))
  fireEvent.click(screen.getByRole('button', {name: '개별 파라미터 목록으로'}))
  fireEvent.click(screen.getByRole('button', {name: 'arm 편집'}))
  expect(screen.getByRole('combobox', {name: 'arm 드래그 축'})).toBeTruthy()
  expect(screen.queryByRole('combobox', {name: 'head 드래그 축'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '개별 파라미터 목록으로'}))
  fireEvent.click(screen.getByRole('button', {name: 'head 편집'}))
  expect(screen.getByRole('combobox', {name: 'head 드래그 축'})).toBeTruthy()
  setState('parameters', reconcile({arm: {axis: 'auto'}}))
  expect(screen.queryByRole('combobox', {name: 'head 드래그 축'})).toBeNull()
  expect(screen.queryByRole('combobox', {name: 'arm 드래그 축'})).toBeNull()
  expect(screen.getByRole('button', {name: 'arm 편집'})).toBeVisible()
})

it('should localize the list, detail and picker without changing saved IDs or names', async () => {
  const save = vi.spyOn(nativeLanguage, 'save').mockResolvedValue(undefined)
  const previous = interfaceLanguage.language()
  const parameters = [
    {id: 'TouchHairFrontLeft19', name: '왼쪽 앞머리 좌우 1'},
    {id: 'TouchRightKnee', name: '오른다리 무릎'},
    ...Array.from({length: 5}, (_, index) => ({id: `custom-${index}`, name: `Custom ${index}`})),
  ].map((parameter) => ({
    ...parameter,
    axis: 'x' as const,
    defaultValue: 0,
    dimensions: 1,
    maximum: 1,
    minimum: -1,
    parts: ['part'],
  }))
  const change = vi.fn()
  try {
    await interfaceLanguage.change('en')
    render(() => (
      <SPoffoTouchParameters
        source={{
          error: () => null,
          loading: () => false,
          parameters: () => parameters,
          touchParameters: () => parameters,
        }}
        value={Object.fromEntries(
          parameters
            .filter((parameter) => parameter.id !== 'TouchRightKnee')
            .map((parameter) => [parameter.id, {axis: 'auto'}]),
        )}
        onChange={change}
      />
    ))
    expect(
      within(screen.getByRole('group', {name: 'Parameters to add'})).getByRole('button', {
        name: 'Right knee TouchRightKnee',
      }),
    ).toBeInTheDocument()
    fireEvent.input(screen.getByRole('searchbox', {name: 'Search Individual parameters list'}), {
      target: {value: '왼쪽 앞머리'},
    })
    fireEvent.click(screen.getByRole('button', {name: 'Edit Left bangs horizontal 1'}))
    expect(
      screen.getByRole('combobox', {name: 'Left bangs horizontal 1 drag axis'}),
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox', {name: 'Select Individual parameters'})).toHaveTextContent(
      'Left bangs horizontal 1',
    )
    await interfaceLanguage.change('ko')
    expect(screen.getByRole('combobox', {name: '왼쪽 앞머리 좌우 1 드래그 축'})).toBeInTheDocument()
    expect(screen.getByRole('combobox', {name: '개별 파라미터 선택'})).toHaveTextContent(
      '왼쪽 앞머리 좌우 1',
    )
    expect(change).not.toHaveBeenCalled()
    expect(parameters[0]).toMatchObject({id: 'TouchHairFrontLeft19', name: '왼쪽 앞머리 좌우 1'})
  } finally {
    cleanup()
    await interfaceLanguage.change(previous)
    save.mockRestore()
  }
})
