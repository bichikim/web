/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {beforeEach, expect, test} from 'vitest'
import {useEditorWorkspace} from '../use-editor-workspace'

beforeEach(() => localStorage.clear())
const Workspace = () => {
  const {workspace, setWorkspace} = useEditorWorkspace('modeling')
  return <button onClick={() => setWorkspace('animation')}>{workspace()}</button>
}
test('should restore the selected workspace after remounting', () => {
  const first = render(() => <Workspace />)
  fireEvent.click(first.getByRole('button', {name: 'modeling'}))
  first.unmount()
  const restored = render(() => <Workspace />)
  expect(restored.getByRole('button', {name: 'animation'})).toBeInTheDocument()
})
test('should use the initial workspace for an invalid stored preference', () => {
  localStorage.setItem('puppet:editor-workspace:v1', 'invalid')
  const view = render(() => <Workspace />)
  expect(view.getByRole('button', {name: 'modeling'})).toBeInTheDocument()
})
