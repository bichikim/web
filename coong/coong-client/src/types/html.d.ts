import type {AttributifyAttributes} from '@unocss/preset-attributify'

declare module '@vue/runtime-dom' {
  type HTMLAttributes = AttributifyAttributes
}
