import {createMemo, createSignal} from 'solid-js'
import * as m from '@paraglide/message'
import {countText} from 'src/features/tools'
import {PTextarea} from '../PTextarea'
import {PButton} from '../PButton'
import {Result} from './Result'
export const Text = () => {
  const [text, setText] = createSignal('')
  const counts = createMemo(() => countText(text()))
  const result = () =>
    [
      `${m.tools_characters()}: ${counts().characters}`,
      `${m.tools_no_spaces()}: ${counts().withoutSpaces}`,
      `${m.tools_bytes()}: ${counts().bytes}`,
    ].join('\n')
  return (
    <div class="grid gap-4">
      <label class="grid gap-2 text-sm text-muted-foreground">
        {m.tools_text_input()}
        <PTextarea
          rows={7}
          value={text()}
          onInput={(event) => setText(event.currentTarget.value)}
        />
      </label>
      <p class="m-0 text-sm leading-6 text-muted-foreground">{m.tools_text_hint()}</p>
      <PButton transparent onPress={() => setText('')}>
        {m.tools_reset()}
      </PButton>
      <Result value={result()} />
    </div>
  )
}
