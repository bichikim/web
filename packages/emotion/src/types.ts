import {ComponentObjectPropsOptions, defineComponent, FunctionalComponent} from 'vue'
import {Tags} from './tags'

export interface StylePortalInfo {
  /**
   * @deprecated
   */
  __stylePortal?: string
}

export interface StyledOptions<StylePortal extends string | undefined> {
  label?: string | boolean
  name?: string
  passAs?: boolean
  /**
   * @default true
   */
  stylePortal?: StylePortal
  target?: string
}

export interface StyledOptionWIthObject<
  PropsOptions extends Readonly<ComponentObjectPropsOptions>,
  StylePortal extends string | undefined,
> extends StyledOptions<StylePortal> {
  props?: PropsOptions
}

export interface StyledOptionWithArray<
  PropsOptions extends Readonly<any[]>,
  StylePortal extends string | undefined,
> extends StyledOptions<StylePortal> {
  props?: PropsOptions
}

export type EmptyObject = {
  // empty
}

export type AnyComponent = Tags | FunctionalComponent<any> | ReturnType<typeof defineComponent>

export type StyledFunctionalComponent = FunctionalComponent & {
  stylePortal?: string
}

export type SFC = StyledFunctionalComponent
export type FC = FunctionalComponent
