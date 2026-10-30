/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {CommitTextField} from '../CommitTextField'
import {MotionNameEditor} from '../MotionNameEditor'
import {PresetNameField} from '../PresetNameField'
import {EditorParameterNames} from '../EditorParameterNames'
import {EditorLayerPanel} from '../EditorLayerPanel'
import {createDemoDocument} from '../../../player'

test.each(['text', 'motion', 'preset', 'parameter', 'layer'] as const)(
  'should retain %s editing while IME Enter completes composition',
  (kind) => {
    const commit = vi.fn(() => true)
    const view = render(() => {
      if (kind === 'motion') {
        return (
          <MotionNameEditor
            motionId="old"
            motionIds={['old']}
            onCancel={vi.fn()}
            onRename={commit}
          />
        )
      }
      if (kind === 'preset') {
        return <PresetNameField label="name" value="old" onRename={commit} />
      }
      if (kind === 'parameter') {
        return <EditorParameterNames descriptionId="name" name="old" onNameChange={commit} />
      }
      if (kind === 'layer') {
        return <EditorLayerPanel document={createDemoDocument()} onDocumentChange={commit} />
      }
      return <CommitTextField disabled={false} label="name" value="old" onCommit={commit} />
    })
    if (kind === 'parameter') {
      fireEvent.dblClick(view.getByRole('button', {name: 'old'}))
    }
    if (kind === 'layer') {
      fireEvent.dblClick(view.getAllByRole('button', {name: /레이어 선택/})[0]!)
    }
    const input =
      kind === 'layer'
        ? view
            .getAllByRole('textbox')
            .find((element) => element.getAttribute('aria-label')?.endsWith('이름'))!
        : view.getByRole('textbox')
    fireEvent.input(input, {target: {value: '한'}})
    fireEvent.keyDown(input, {isComposing: true, key: 'Enter'})
    expect(commit).not.toHaveBeenCalled()
    expect(input).toBeInTheDocument()
    fireEvent.keyDown(input, {key: 'Enter'})
    expect(commit).toHaveBeenCalledOnce()
  },
)
