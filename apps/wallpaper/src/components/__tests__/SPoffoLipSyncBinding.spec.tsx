/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {SPoffoLipSyncBinding} from '../SPoffoLipSyncBinding'
import {interfaceLanguage, nativeLanguage} from '../../features/localization'

it('should translate builtin mouth choices without renaming custom parameters or changing their IDs', async () => {
  const save = vi.spyOn(nativeLanguage, 'save').mockResolvedValue(undefined)
  const previous = interfaceLanguage.language()
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()})
  const parameters = [
    {defaultValue: 0, id: 'TouchBagStrap', maximum: 1, minimum: 0, name: '숄더백 끈'},
    {defaultValue: 0, id: 'custom', maximum: 1, minimum: 0, name: '사용자 입모양'},
  ]
  const change = vi.fn()
  try {
    await interfaceLanguage.change('en')
    render(() => (
      <SPoffoLipSyncBinding
        label="A"
        shape="a"
        parameters={parameters}
        value={{parameterId: 'TouchBagStrap'}}
        onChange={change}
      />
    ))
    const field = screen.getByRole('combobox', {name: 'A mouth-shape parameter'})
    expect(field).toHaveTextContent('Shoulder bag strap')
    fireEvent.click(field)
    fireEvent.click(screen.getByRole('option', {name: '사용자 입모양'}))
    expect(change).toHaveBeenCalledExactlyOnceWith({parameterId: 'custom'})
    expect(parameters[0]?.name).toBe('숄더백 끈')
  } finally {
    cleanup()
    await interfaceLanguage.change(previous)
    save.mockRestore()
    if (descriptor === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'showPopover', descriptor)
    }
  }
})
