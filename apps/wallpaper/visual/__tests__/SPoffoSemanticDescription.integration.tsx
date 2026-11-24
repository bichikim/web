import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {createBuiltinLibrary} from '../../src/features/builtin-assets/create-builtin-library'
import {SPoffoSemanticDescription} from '../../src/components/SPoffoSemanticDescription'
import {interfaceLanguage} from '../../src/features/localization'
import {parseConnectionProfile} from '@winter-love/wallpaper/settings/connections'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import 'virtual:uno.css'

afterEach(async () => {
  cleanup()
  await interfaceLanguage.change('ko')
})
const choose = async (label: string, name: string) => {
  await userEvent.click(screen.getByRole('combobox', {name: label}))
  await userEvent.click(screen.getByRole('option', {exact: true, name}))
}
it.each([400, 720])('should save, reopen and remove language examples at %spx', async (width) => {
  await page.viewport(width, 800)
  await interfaceLanguage.change('en')
  const repository = createBuiltinLibrary(`language-examples-${crypto.randomUUID()}`)
  let widget = (await repository.read()).widgets[0]!
  const [value, setValue] = createSignal(widget.speech!.semanticBindings![0]!)
  const save = async (binding: SemanticBinding) => {
    await repository.configureSpeech(widget.id, {...widget.speech!, semanticBindings: [binding]})
    widget = (await repository.read()).widgets[0]!
    setValue(widget.speech!.semanticBindings![0]!)
  }
  const mount = () =>
    render(() => (
      <section aria-label="Example editor" class="box-border w-full p-4">
        <SPoffoSemanticDescription label="Joy" value={value()} onChange={save} />
      </section>
    ))
  let view = mount()
  try {
    const text = screen.getByRole('textbox', {name: 'Joy emotion, action, or content'})
    const english = (text as HTMLTextAreaElement).value
    await choose('Joy example language', 'Korean')
    expect(text).toHaveValue(expect.stringContaining('기쁘고 행복해서'))
    await choose('Add a language to Joy', 'Japanese')
    expect(text).toHaveValue('')
    await userEvent.fill(text, 'うれしいです')
    await userEvent.click(screen.getByText('Exclusion examples', {exact: true}))
    await userEvent.fill(
      screen.getByRole('textbox', {name: 'Joy exclusion examples'}),
      'うれしくありません',
    )
    await expect
      .poll(() => value().examples?.find((item) => item.language === 'ja')?.excludeText)
      .toBe('うれしくありません')
    await choose('Joy example language', 'English')
    expect(text).toHaveValue(english)
    await choose('Joy example language', 'Japanese')
    expect(text).toHaveValue('うれしいです')
    const exported = {
      assetId: 'builtin:ash',
      connections: {semanticBindings: [value()]},
      format: 'poffo-connections',
      version: 1,
    }
    const parsed = parseConnectionProfile(JSON.stringify(exported), {
      assetId: 'builtin:ash',
      parameters: [],
    })
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.profile.connections.semanticBindings?.[0]?.examples).toEqual(value().examples)
    }
    view.unmount()
    widget = (await repository.read()).widgets[0]!
    setValue(widget.speech!.semanticBindings![0]!)
    view = mount()
    await choose('Joy example language', 'Japanese')
    expect(screen.getByRole('textbox', {name: 'Joy emotion, action, or content'})).toHaveValue(
      'うれしいです',
    )
    await userEvent.click(screen.getByRole('button', {name: 'Remove Japanese examples'}))
    await expect.poll(() => value().examples?.some((item) => item.language === 'ja')).toBe(false)
    expect(
      (await repository.read()).widgets[0]?.speech?.semanticBindings?.[0]?.examples?.some(
        (item) => item.language === 'ja',
      ),
    ).toBe(false)
    await choose('Joy example language', 'Korean')
    expect(screen.getByRole('textbox', {name: 'Joy emotion, action, or content'})).toHaveValue(
      expect.stringContaining('기쁘고 행복해서'),
    )
    expect(view.container.scrollWidth).toBeLessThanOrEqual(width)
    await page
      .getByRole('region', {name: 'Example editor'})
      .screenshot({path: `__screenshots__/language-examples-${width}.png`})
  } finally {
    view.unmount()
    repository.close()
  }
})

it('should add custom language tags and clear the last language without restoring legacy text', async () => {
  await interfaceLanguage.change('en')
  const [value, setValue] = createSignal<SemanticBinding>({
    enabled: true,
    examples: [{language: 'en', text: 'Happy'}],
    id: 'custom',
    mode: 'toggle',
    parameterId: null,
    text: 'Happy',
    threshold: 0.8,
  })
  render(() => <SPoffoSemanticDescription label="Joy" value={value()} onChange={setValue} />)
  await choose('Add a language to Joy', 'Other language…')
  const code = screen.getByRole('textbox', {name: 'Language code'})
  await userEvent.fill(code, 'not a language')
  expect(screen.getByRole('button', {exact: true, name: 'Add'})).toBeDisabled()
  await userEvent.fill(code, 'EN')
  expect(screen.getByRole('button', {exact: true, name: 'Add'})).toBeDisabled()
  await userEvent.fill(code, 'fr-ca')
  await userEvent.click(screen.getByRole('button', {exact: true, name: 'Add'}))
  expect(value().examples?.map((example) => example.language)).toEqual(['en', 'fr-CA'])
  const french = new Intl.DisplayNames(['en'], {type: 'language'}).of('fr-CA')!
  await userEvent.click(screen.getByRole('button', {name: `Remove ${french} examples`}))
  await userEvent.click(screen.getByRole('button', {name: 'Remove English examples'}))
  expect(value().examples).toEqual([])
  expect(screen.queryByRole('textbox', {name: 'Joy emotion, action, or content'})).toBeNull()
  expect(screen.getByText('Add a language.')).toBeVisible()
})
