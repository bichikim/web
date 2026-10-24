/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument} from '../../../player'
import {EditorLayerToolbar} from '../EditorLayerToolbar'

describe('EditorLayerToolbar', () => {
  test('should render the default group action as a normal group icon button', () => {
    const onGroupCreate = vi.fn()
    const view = render(() => (
      <EditorLayerToolbar
        activeLocked={false}
        document={createDemoDocument()}
        onDocumentChange={vi.fn()}
        onGroupCreate={onGroupCreate}
        selection={{activeNodeId: null, nodeIds: []}}
        selectionLocked={false}
      />
    ))
    const button = view.getByRole('button', {name: '그룹'})

    expect(button).toHaveAttribute('title', '일반 그룹 만들기')
    expect(button.textContent?.trim()).toBe('')
    expect(button.querySelector('.puppet-icon[aria-hidden="true"]')).not.toBeNull()
    expect(button.querySelector('.puppet-icon')).toHaveClass('puppet-icon-squares')

    fireEvent.click(button)
    expect(onGroupCreate).toHaveBeenCalledOnce()
    expect(view.queryByRole('button', {name: '자유 변형 디포머'})).not.toBeInTheDocument()
  })

  test('should render the parent move action as an accessible icon button', () => {
    const view = render(() => (
      <EditorLayerToolbar
        activeLocked={false}
        document={createDemoDocument()}
        onDocumentChange={vi.fn()}
        onGroupCreate={vi.fn()}
        selection={{activeNodeId: 'shape-circle', nodeIds: ['shape-circle']}}
        selectionLocked={false}
      />
    ))
    const button = view.getByRole('button', {
      name: '선택 레이어를 상위 컨테이너로 이동',
    })

    expect(button).toHaveAttribute('title', '상위 컨테이너로 이동')
    expect(button.textContent?.trim()).toBe('')
    expect(button.querySelector('.puppet-icon[aria-hidden="true"]')).not.toBeNull()
  })
})
