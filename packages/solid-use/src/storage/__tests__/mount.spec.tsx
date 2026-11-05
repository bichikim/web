import {render} from '@solidjs/testing-library'
import {createRoot, createSignal, Show} from 'solid-js'
import {afterEach, describe, expect, it} from 'vitest'
import {useStorage} from '..'

afterEach(() => localStorage.clear())

describe('useStorage mounted consumer', () => {
  it('does not persist setup edits if the owner is disposed before mount', () => {
    localStorage.setItem('key', JSON.stringify('stored-value'))
    createRoot((dispose) => {
      const [, setValue] = useStorage<string>('local', 'key', {mounted: true})
      setValue('discarded-edit')
      dispose()
    })
    expect(localStorage.getItem('key')).toBe(JSON.stringify('stored-value'))
  })

  it.each(['setup-edit', '', false, 0, null])('persists the setup edit %j on mount', (edit) => {
    localStorage.setItem('key', JSON.stringify('stored-value'))
    const view = render(() => {
      const [value, setValue] = useStorage<unknown>('local', 'key', {mounted: true})
      expect(value()).toBeNull()
      setValue(edit)
      expect(localStorage.getItem('key')).toBe('"stored-value"')
      return <output>{JSON.stringify(value())}</output>
    })
    expect(view.container.textContent).toBe(JSON.stringify(edit))
    expect(localStorage.getItem('key')).toBe(JSON.stringify(edit))
  })

  it('retains setup updater edits until inactive storage is activated', () => {
    localStorage.setItem('key', '"stored-value"')
    const [active, setActive] = createSignal(false)
    const view = render(() => {
      const [value, setValue] = useStorage<string | null>('local', 'key', {active, mounted: true})
      setValue((previous) => `${previous}-edited`)
      return <output>{value()}</output>
    })
    expect(view.container.textContent).toBe('null-edited')
    expect(localStorage.getItem('key')).toBe('"stored-value"')
    setActive(true)
    expect(view.container.textContent).toBe('null-edited')
    expect(localStorage.getItem('key')).toBe('"null-edited"')
    setActive(false)
    localStorage.setItem('key', '"external-edit"')
    setActive(true)
    expect(view.container.textContent).toBe('external-edit')
  })

  it('restores stored data when mounted without an edit', () => {
    localStorage.setItem('key', '"stored-value"')
    const view = render(() => {
      const [value] = useStorage<string>('local', 'key', {mounted: true})
      expect(value()).toBeNull()
      return <output>{value()}</output>
    })
    expect(view.container.textContent).toBe('stored-value')
  })

  it('enforces the configured value over a setup edit', () => {
    const view = render(() => {
      const [value, setValue] = useStorage<boolean>('local', 'key', {
        enforceValue: false,
        mounted: true,
      })
      setValue(true)
      return <output>{JSON.stringify(value())}</output>
    })
    expect(view.container.textContent).toBe('false')
    expect(localStorage.getItem('key')).toBe('false')
  })

  it.each([false, true])(
    'keeps setup edits scoped to their key (edit new key: %j)',
    (editNewKey) => {
      localStorage.setItem('first', '"first-value"')
      localStorage.setItem('second', '"second-value"')
      const view = render(() => {
        const [key, setKey] = createSignal('first')
        const [value, setValue] = useStorage<string>('local', key, {mounted: true})
        setValue('first-edit')
        setKey('second')
        if (editNewKey) {
          setValue('second-edit')
        }
        return <output>{value()}</output>
      })
      expect(view.container.textContent).toBe(editNewKey ? 'second-edit' : 'second-value')
      expect(localStorage.getItem('first')).toBe('"first-value"')
      expect(localStorage.getItem('second')).toBe(
        JSON.stringify(editNewKey ? 'second-edit' : 'second-value'),
      )
    },
  )

  it('restores storage on re-entry without retaining the previous instance edit', () => {
    const [visible, setVisible] = createSignal(true)
    let first = true
    const Consumer = () => {
      const [value, setValue] = useStorage<string>('local', 'key', {mounted: true})
      if (first) {
        setValue('setup-edit')
        first = false
      }
      return <output>{value()}</output>
    }
    const view = render(() => (
      <Show when={visible()}>
        <Consumer />
      </Show>
    ))
    expect(view.container.textContent).toBe('setup-edit')
    setVisible(false)
    localStorage.setItem('key', '"external-edit"')
    setVisible(true)
    expect(view.container.textContent).toBe('external-edit')
  })
})
