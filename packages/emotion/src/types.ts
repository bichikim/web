import {ComponentObjectPropsOptions, defineComponent, FunctionalComponent} from 'vue-demi'
import {Tags} from './tags'

export interface StylePortalInfo {
  __stylePortal?: string
}

export interface StyledOptions {
  /**
   * @default true
   */
  inheritStyleProps?: boolean
  label?: string | boolean
  name?: string
  nextStylePortal?: string
  passAs?: boolean
  styleDefaults?: Record<string, any>
  stylePortal?: string
  target?: string
}

export interface StyledOptionWIthObject<PropsOptions extends Readonly<ComponentObjectPropsOptions>>
  extends StyledOptions {
  props?: PropsOptions
}

export interface StyledOptionWithArray<PropsOptions extends Readonly<any[]>> extends StyledOptions {
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
