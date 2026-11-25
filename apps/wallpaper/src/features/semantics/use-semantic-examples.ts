import {type Accessor, createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import {semanticExamples} from '@winter-love/wallpaper/settings/semantic-examples'
import {withSemanticExamples} from '@winter-love/wallpaper/settings/with-semantic-examples'
import {semanticLanguage} from '@winter-love/wallpaper/settings/semantic-language'
import {
  SEMANTIC_LANGUAGE_LIMIT,
  type SemanticBinding,
  type SemanticLanguageExamples,
} from '@winter-love/wallpaper/settings/semantics'

interface UseSemanticExamplesProps {
  readonly value: Accessor<SemanticBinding>
  readonly preferred: Accessor<string>
  readonly onChange?: (value: SemanticBinding) => void | Promise<void>
}
interface ExampleDraft {
  readonly id: string
  readonly examples: readonly SemanticLanguageExamples[]
}

const sameExamples = (
  first: readonly SemanticLanguageExamples[],
  second: readonly SemanticLanguageExamples[] | undefined,
) =>
  second !== undefined &&
  first.length === second.length &&
  first.every(
    (example, index) =>
      example.language === second[index]?.language &&
      example.text === second[index]?.text &&
      example.excludeText === second[index]?.excludeText,
  )

/** Keeps language edits responsive while persistent settings acknowledge updates asynchronously. */
export const useSemanticExamples = (props: UseSemanticExamplesProps) => {
  const [draft, setDraft] = createSignal<ExampleDraft | null>(null)
  const [selected, setSelected] = createSignal<string | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  let pending = 0
  let revision = 0
  let active = true
  const source = createMemo(() => {
    const value = props.value()
    return {examples: semanticExamples(value).map((example) => ({...example})), id: value.id}
  })
  const values = createMemo(() => {
    const local = draft()
    const current = source()
    return local?.id === current.id ? local.examples : current.examples
  })
  const current = createMemo(() => {
    const existing = values()
    return (
      existing.find((example) => example.language === (selected() ?? props.preferred())) ??
      existing[0] ??
      null
    )
  })
  createEffect(
    on(source, (next, previous) => {
      if (previous !== undefined && next.id !== previous.id) {
        setDraft(null)
        setSelected(null)
        setError(null)
      } else if (pending === 0 || sameExamples(next.examples, draft()?.examples)) {
        setDraft(null)
      }
    }),
  )
  onCleanup(() => {
    active = false
  })
  const save = async (examples: readonly SemanticLanguageExamples[]) => {
    const binding = props.value()
    revision += 1
    const latest = revision
    pending += 1
    setDraft({examples, id: binding.id})
    setError(null)
    try {
      await props.onChange?.(withSemanticExamples(binding, examples))
    } catch (cause) {
      console.error('Could not save language examples', cause)
      if (active && latest === revision && props.value().id === binding.id) {
        setError('예문을 저장하지 못했어요.')
      }
    } finally {
      pending -= 1
    }
  }
  const select = (language: string) => setSelected(language)
  const add = (value: string) => {
    const language = semanticLanguage(value)
    const existing = values()
    if (
      language === undefined ||
      existing.length >= SEMANTIC_LANGUAGE_LIMIT ||
      existing.some((example) => example.language === language)
    ) {
      return
    }
    const next = [...existing, {language, text: ''}]
    setSelected(language)
    return save(next)
  }
  const remove = () => {
    const language = current()?.language
    const next = values().filter((example) => example.language !== language)
    setSelected(null)
    return save(next)
  }
  const edit = (patch: Partial<Pick<SemanticLanguageExamples, 'text' | 'excludeText'>>) => {
    const language = current()?.language
    return save(
      values().map((example) => (example.language === language ? {...example, ...patch} : example)),
    )
  }
  return {add, current, edit, error, remove, retry: () => save(values()), select, values}
}
