/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {useContext} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {DragList} from '../DragList'
import {DragListGhost} from '../DragListGhost'
import {DragListGhostProvider} from '../DragListGhostProvider'
import {DragListItem} from '../DragListItem'
import {DragListContext, DragListProvider} from '../DragListProvider'

describe('drag list components', () => {
  it('should render every item through the composed list wrapper', () => {
    const Item = () => (
      <DragListItem component="div">{(item: string, index) => `${index()}:${item}`}</DragListItem>
    )
    const view = render(() => (
      <DragList component="section" list={['first', 'second']}>
        <Item />
      </DragList>
    ))

    expect(view.getByText('0:first')).toBeDefined()
    expect(view.getByText('1:second')).toBeDefined()
  })

  it('should reorder the exposed list and notify when dragging ends', async () => {
    const onChangeList = vi.fn()
    const Probe = () => {
      const context = useContext(DragListContext)

      return (
        <>
          <output>{context?.list().join(',')}</output>
          <button onClick={() => context?.onDragStart(0)}>Start</button>
          <button onClick={() => context?.onDragOver(2)}>Over</button>
          <button onClick={() => context?.onDragEnd()}>End</button>
        </>
      )
    }
    const view = render(() => (
      <DragListProvider list={['first', 'second', 'third']} onChangeList={onChangeList}>
        <Probe />
      </DragListProvider>
    ))

    await fireEvent.click(view.getByRole('button', {name: 'Start'}))
    await fireEvent.click(view.getByRole('button', {name: 'Over'}))

    expect(view.getByText('second,third,first')).toBeDefined()

    await fireEvent.click(view.getByRole('button', {name: 'End'}))

    expect(onChangeList).toHaveBeenCalledWith(0, 2, ['second', 'third', 'first'])
  })

  it('should portal a styled ghost only while dragging', () => {
    const view = render(() => (
      <DragListGhostProvider duration={120} easing="linear" isDragging>
        <DragListGhost component="div">Ghost</DragListGhost>
      </DragListGhostProvider>
    ))
    const ghost = screen.getByText('Ghost')

    expect(view.container.contains(ghost)).toBe(false)
    expect(ghost.getAttribute('data-is-drag')).toBe('true')
    expect(ghost.getAttribute('style')).toContain('120')
    expect(ghost.getAttribute('style')).toContain('linear')
  })
})
