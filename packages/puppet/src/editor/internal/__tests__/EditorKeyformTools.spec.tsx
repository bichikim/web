import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player'
import {EditorKeyformTools} from '../EditorKeyformTools'

test('should keep the error visible and submit exactly one overwrite toggle', async () => {
  const document = createDemoDocument()
  const onMirror = vi.fn(() => '이미 키폼이 있습니다.')
  render(() => (
    <EditorKeyformTools
      binding={document.parameterBindings![0]}
      values={[30, 0]}
      parameters={document.parameters}
      centers={[{label: '캔버스 중심', point: {x: 320, y: 240}}]}
      onMirror={onMirror}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '키폼 도구'}))
  await Promise.resolve()
  fireEvent.click(screen.getByRole('button', {name: '동작 반전 적용'}))
  expect(screen.getByRole('alert')).toHaveTextContent('이미 키폼이 있습니다.')
  fireEvent.click(screen.getByRole('checkbox', {name: '기존 키폼 덮어쓰기'}))
  expect(screen.getByRole('checkbox', {name: '기존 키폼 덮어쓰기'})).toBeChecked()
  fireEvent.click(screen.getByRole('button', {name: '동작 반전 적용'}))
  expect(onMirror).toHaveBeenLastCalledWith({
    axis: 'x',
    center: 320,
    overwrite: true,
    parameterIndex: 0,
  })
})

test('should submit corner settings and close the dialog on success', async () => {
  const document = createDemoDocument()
  const onGenerate = vi.fn(() => null)
  render(() => (
    <EditorKeyformTools
      binding={document.parameterBindings![0]}
      values={null}
      parameters={document.parameters}
      onGenerate={onGenerate}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '키폼 도구'}))
  await Promise.resolve()
  expect(screen.getByRole('button', {name: '동작 반전'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: '범위 중앙'}))
  fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
  expect(onGenerate).toHaveBeenCalledWith({
    overwrite: false,
    planes: 'current',
    reference: 'middle',
  })
  expect(screen.getByRole('button', {name: '키폼 도구'})).toHaveAttribute('aria-expanded', 'false')
})

test('should mirror meshes across a chosen rotation deformer’s center', async () => {
  const document = createDemoDocument()
  const onMirror = vi.fn(() => null)
  render(() => (
    <EditorKeyformTools
      binding={document.parameterBindings![0]}
      values={[30, 0]}
      parameters={document.parameters}
      centers={[
        {label: '캔버스 중심', point: {x: 320, y: 240}},
        {label: '어깨 중심', point: {x: 100, y: 60}},
      ]}
      onMirror={onMirror}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '키폼 도구'}))
  await Promise.resolve()
  fireEvent.keyDown(screen.getByRole('button', {name: /메시 반전 기준 위치/}), {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: '어깨 중심'}))
  expect(screen.getByRole('spinbutton', {name: '메시 반전 기준'})).toHaveValue(100)
  // The chosen point follows the mirror direction.
  fireEvent.click(screen.getByRole('button', {name: '상하'}))
  fireEvent.click(screen.getByRole('button', {name: '동작 반전 적용'}))
  expect(onMirror).toHaveBeenLastCalledWith({
    axis: 'y',
    center: 60,
    overwrite: false,
    parameterIndex: 0,
  })
})
