import type {ComponentProps, JSX, ValidComponent} from 'solid-js'

type TargetChildren<T extends ValidComponent> =
  ComponentProps<T> extends {children?: infer Children} ? Children : JSX.Element

interface ComponentTarget<T extends ValidComponent> {
  readonly children?: TargetChildren<T>
  readonly component: T | undefined
}

interface OptionalTargetProps<T extends ValidComponent> {
  readonly componentProps?: ComponentProps<T>
}

interface RequiredTargetProps<T extends ValidComponent> {
  readonly componentProps: ComponentProps<T>
}

export type ComponentTargetProps<T extends ValidComponent> = ComponentTarget<T> &
  ({} extends ComponentProps<T> ? OptionalTargetProps<T> : RequiredTargetProps<T>)
