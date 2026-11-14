import {For} from 'solid-js'
import {EditorColorField} from '@winter-love/puppet/editor'
import {COLOR_THEME_FIELDS} from './fields'
import type {useColorTheme} from './use-color-theme'

interface ColorThemeFieldsProps {
  /** Shows detailed roles; omitted to show the primary palette. */
  readonly advanced?: boolean
  /** Supplies the current root colors and preview operations. */
  readonly theme: ReturnType<typeof useColorTheme>
}

export const ColorThemeFields = (props: ColorThemeFieldsProps) => (
  <div class="color-theme-fields">
    <For
      each={COLOR_THEME_FIELDS.filter(
        (field) => (field.advanced ?? false) === (props.advanced ?? false),
      )}
    >
      {(field) => (
        <div>
          <span>{field.label}</span>
          <EditorColorField
            label={field.label}
            value={props.theme.color(field.key)}
            onValueChange={(value) => props.theme.change(field.key, value)}
          />
        </div>
      )}
    </For>
  </div>
)
