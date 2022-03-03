/* eslint-disable @typescript-eslint/ban-types */
import {defineComponent, FunctionalComponent, h, reactive, RenderFunction, SetupContext} from 'vue-demi'

export type States = Record<string, any>;

export interface WithStateOptions<Props, RawBindings,
  > {
  setup?: (props: Readonly<Props>, ctx: SetupContext) => RawBindings | RenderFunction
}

export const withState = <Props = {},
  RawBindings extends object = {},
  >(
    component: FunctionalComponent<Props>,
    setup: (props: Readonly<Props>, ctx: SetupContext) => RawBindings,
  ) => {
  return defineComponent<Props, RawBindings>((props: Props, ctx: SetupContext) => {
    const stats = setup(props, ctx)
    return () => h(component as any, {...reactive(stats)}, ctx.slots)
  })
}
