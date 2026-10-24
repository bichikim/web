import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {SPoffoAssetPicker} from '../../src/components/SPoffoAssetPicker'
import 'virtual:uno.css'

afterEach(cleanup)
it.each([true, false])(
  'should isolate character loading in a modal and preserve selection with widget action %s',
  async (widget) => {
    const [selected, setSelected] = createSignal('first')
    const onFiles = vi.fn()
    const onCreate = vi.fn()
    render(() => (
      <div class="h-24 w-100 overflow-hidden">
        <SPoffoAssetPicker
          options={[
            {label: '눈꽃', value: 'first'},
            {label: '햇살', value: 'second'},
          ]}
          value={selected()}
          onChange={setSelected}
          onFiles={onFiles}
        >
          <Show when={widget}>
            <button type="button" onClick={onCreate}>
              위젯으로 띄우기
            </button>
          </Show>
        </SPoffoAssetPicker>
      </div>
    ))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    const trigger = screen.getByRole('button', {name: 'Poffo 불러오기'})
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', {name: 'Poffo 불러오기'})
    expect(dialog.matches(':modal')).toBe(true)
    const select = screen.getByRole('combobox', {name: '캐릭터'})
    fireEvent.click(select)
    const list = screen.getByRole('listbox')
    expect(list.matches(':popover-open')).toBe(true)
    const option = screen.getByRole('option', {name: '햇살'})
    const bounds = option.getBoundingClientRect()
    expect(
      option.contains(
        document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2),
      ),
    ).toBe(true)
    fireEvent.click(option)
    expect(selected()).toBe('second')
    const file = new File(['{}'], 'character.json', {type: 'application/json'})
    fireEvent.change(dialog.querySelector('input[type=file]')!, {target: {files: [file]}})
    expect(onFiles).toHaveBeenCalledExactlyOnceWith([file])
    if (widget) {
      fireEvent.click(screen.getByRole('button', {name: '위젯으로 띄우기'}))
      expect(onCreate).toHaveBeenCalledOnce()
    }
    fireEvent.click(screen.getByRole('button', {name: '닫기'}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
    expect(screen.getByRole('region', {name: 'Poffo 불러오기'})).toHaveTextContent('햇살')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  },
)
