/** @vitest-environment jsdom */
import {EditorState, StateEffect} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createEditorLanguage} from '../create-editor-language'
import {createEditorNavigation} from '../create-editor-navigation'

const source = "import {answer} from './helper'\nanswer()\nconst label = 'hello'"
describe('createEditorNavigation', () => {
  let view: EditorView
  const mount = (path = 'main.ts', doc = source) => {
    const onFollow = vi.fn()
    const parent = document.createElement('div')
    document.body.append(parent)
    view = new EditorView({
      parent,
      state: EditorState.create({
        doc,
        extensions: [createEditorLanguage(path), createEditorNavigation({onFollow, path})],
      }),
    })
    return onFollow
  }
  afterEach(() => {
    view.destroy()
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })
  it('should expose import and symbol links without marking ordinary strings', () => {
    mount()
    const links = [...view.contentDOM.querySelectorAll('[data-navigation]')]
    expect(links.map((link) => link.textContent)).toEqual([
      'answer',
      "'./helper'",
      'answer',
      'label',
    ])
  })
  it.each(['metaKey', 'ctrlKey'] as const)(
    'should follow an import with %s without changing the draft',
    (modifier) => {
      const onFollow = mount()
      // jsdom has no text layout for pointer-to-source coordinates.
      vi.spyOn(view, 'posAtCoords').mockReturnValue(source.indexOf('./helper') + 2)
      const event = new MouseEvent('mousedown', {bubbles: true, cancelable: true, [modifier]: true})
      view.contentDOM.dispatchEvent(event)
      expect(onFollow).toHaveBeenCalledWith(expect.objectContaining({navigation: 'path'}))
      expect(event.defaultPrevented).toBe(true)
      expect(view.state.sliceDoc()).toBe(source)
    },
  )
  it('should follow the current symbol with F12', () => {
    const onFollow = mount()
    view.dispatch({selection: {anchor: source.indexOf('answer()') + 2}})
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'F12'}),
    )
    expect(onFollow).toHaveBeenCalledWith(expect.objectContaining({navigation: 'definition'}))
  })
  it('should expose and follow JSON file references', () => {
    const doc = '{"extends":"./base.json","label":"hello"}'
    const onFollow = mount('settings.json', doc)
    expect(view.contentDOM.querySelector('[data-navigation]')?.textContent).toBe('"./base.json"')
    view.dispatch({selection: {anchor: doc.indexOf('./base') + 1}})
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'F12'}),
    )
    expect(onFollow).toHaveBeenCalledWith(expect.objectContaining({navigation: 'path'}))
  })
  it('should reset modifier styling when a cached editor is reconfigured', () => {
    const onFollow = mount()
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'Meta', metaKey: true}),
    )
    expect(view.contentDOM.dataset.navigationModifier).toBe('true')
    view.dispatch({
      effects: StateEffect.reconfigure.of([
        createEditorLanguage('main.ts'),
        createEditorNavigation({onFollow, path: 'main.ts'}),
      ]),
    })
    expect(view.contentDOM.dataset.navigationModifier).toBe('false')
  })
  it('should refresh links when a JSON path is edited without saving', () => {
    const doc = '{"extends":"./base.json"}'
    const onFollow = mount('settings.json', doc)
    view.dispatch({
      changes: {from: doc.indexOf('base'), insert: 'other', to: doc.indexOf('base') + 4},
    })
    expect(view.contentDOM.querySelector('[data-navigation]')?.textContent).toBe('"./other.json"')
    view.dispatch({selection: {anchor: doc.indexOf('./base') + 1}})
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'F12'}),
    )
    expect(onFollow).toHaveBeenCalledWith(
      expect.objectContaining({navigation: 'path', text: '"./other.json"'}),
    )
  })
})
