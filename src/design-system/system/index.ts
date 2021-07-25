import {commonProps, commonSystems} from './commons'
import {ExtractPropTypes} from 'vue'
import {compose, CssProperties} from '@winter-love/style-system-next'

export * from './commons'

export const functionSystemProps = {
  ...commonProps,
}

export const systems = compose(commonSystems)

export type FunctionSystemProps = ExtractPropTypes<typeof functionSystemProps>

export interface SystemProps extends
  FunctionSystemProps,
  Omit<CssProperties<string | number>, keyof FunctionSystemProps> {
  // empty
}
