/* eslint-disable @typescript-eslint/ban-types */
import {
  ComponentPropsOptions,
  ComputedOptions,
  DefineComponent,
  ExtractPropTypes,
  MethodOptions,
} from '@vue/runtime-core'
import {
  defineComponent,
  EmitsOptions,
  FunctionalComponent,
  h,
  ObjectEmitsOptions,
  reactive,
  Ref,
  SetupContext,
} from 'vue-demi'

export type States = Record<string, any>;
type EmitsToProps<T extends EmitsOptions> = T extends string[] ? {
  [K in string & `on${Capitalize<T[number]>}`]?: (...args: any[]) => any;
} : T extends ObjectEmitsOptions ? {
  [K in string & `on${Capitalize<string & keyof T>}`]?:
  K extends `on${infer C}` ? T[Uncapitalize<C>] extends null ?
    (...args: any[]) => any : (...args: T[Uncapitalize<C>] extends (...args: infer P) => any ? P : never) =>
      any : never;
} : {};

export interface WithStateOptions<Props = {},
  ComponentProps extends object = {},
  Emit extends EmitsOptions = [],
  > {
  emits?: Emit
  props?: ComponentPropsOptions<Props>
  setup: (props: Readonly<ExtractPropTypes<Props>>, ctx: SetupContext) => RawBindings<ComponentProps, Emit>
}

export type SimpleComponent<PropsOptions, Emit extends EmitsOptions = [], Expose extends Record<string, any> = {}> =
  DefineComponent<PropsOptions, any, any, ComputedOptions, MethodOptions, any, any, Emit> & Expose

export type RawBindings<Props extends Record<string, any>, Emit extends EmitsOptions> = {
  [P in keyof Props]: Ref<Props[P]> | Props[P]
} & Partial<EmitsToProps<Emit>>

export const withState = <PropsOptions = {},
  ComponentProps extends object = {},
  Emit extends EmitsOptions = [],
  ComponentEmit extends EmitsOptions = [],
  >(
    component: FunctionalComponent<ComponentProps, ComponentEmit>,
    options: WithStateOptions<PropsOptions, ComponentProps, Emit>,
  ): SimpleComponent<PropsOptions, Emit> => {
  const {setup, props = {}, emits} = options
  return defineComponent({
    emits,
    props,
    setup: (props, ctx: SetupContext) => {
      const stats = reactive(setup(props as any, ctx))
      return () => h(component as any, stats as any, ctx.slots)
    },
  }) as any
}
