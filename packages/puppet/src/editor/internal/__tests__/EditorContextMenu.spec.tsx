/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {describe, expect, test, vi} from 'vitest'

import {EditorContextMenu, type EditorContextMenuEntry} from '../EditorContextMenu'
import {EditorPortalProvider} from '../EditorPortalProvider'

describe('EditorContextMenu', () => {
  test('should open at a context-menu request and run the selected action', async () => {
    const onDuplicate = vi.fn()
    const onOpenChange = vi.fn()
    const entries: ReadonlyArray<EditorContextMenuEntry> = [
      {
        id: 'duplicate',
        label: '복제',
        onSelect: onDuplicate,
        shortcut: '⌘D',
        type: 'action',
      },
      {id: 'separator', type: 'separator'},
      {
        disabled: true,
        id: 'delete',
        label: '삭제',
        tone: 'danger',
        type: 'action',
      },
    ]
    const view = render(() => (
      <EditorContextMenu entries={entries} label="레이어 작업" onOpenChange={onOpenChange}>
        <button type="button">대상 레이어</button>
      </EditorContextMenu>
    ))

    fireEvent.contextMenu(view.getByRole('button', {name: '대상 레이어'}), {
      clientX: 120,
      clientY: 80,
    })

    const menu = await screen.findByRole('menu', {name: '레이어 작업'})
    expect(menu).toBeVisible()
    expect(screen.getByText('⌘D')).toBeVisible()
    expect(screen.getByRole('menuitem', {name: '삭제'})).toHaveAttribute('data-disabled')
    screen
      .getByRole('menuitem', {name: '복제'})
      .dispatchEvent(new MouseEvent('pointerup', {bubbles: true, button: 0}))

    expect(onDuplicate).toHaveBeenCalledOnce()
    await waitFor(() => expect(menu).toHaveAttribute('data-closed'))
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  test('should mount the menu in the editor portal target', async () => {
    const portalMount = document.createElement('div')
    document.body.append(portalMount)
    const view = render(() => (
      <EditorPortalProvider mount={portalMount}>
        <EditorContextMenu entries={[]} label="레이어 작업">
          <button type="button">대상 레이어</button>
        </EditorContextMenu>
      </EditorPortalProvider>
    ))

    fireEvent.contextMenu(view.getByRole('button', {name: '대상 레이어'}))

    expect(await screen.findByRole('menu', {name: '레이어 작업'})).toBe(
      portalMount.querySelector('[role="menu"]'),
    )
  })
})
