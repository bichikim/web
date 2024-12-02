export interface ReaderWrapper {
  atElement(value: number): Element | undefined
  attr(name: string): string | undefined
  attrAll(name: string): string[]
  readonly attrs: Record<any, any>
  readonly attrsAll: Record<any, any>[]
  /**
   * get the css class exist (first root element)
   * @param name
   */
  class(name: string): boolean
  /**
   * get all css class exist from root elements
   * a component can have two or more root element
   * @param name
   */
  classAll(name: string): boolean
  /**
   * get all classes from the first root element
   */
  readonly classes: string[]
  /**
   * get all classes from root elements
   */
  readonly classesAll: string[][]
  containText(value: string): boolean
  readonly count: number
  data(name: string): string | undefined
  dataAll(name: string): string[]

  /**
   * return one element of the component
   * @param index element list index @default 0
   */
  element: (index?: number) => Element | undefined

  readonly elements: () => Element[]

  readonly id: () => string | undefined

  readonly ids: () => string[]

  matchText(regex: RegExp): boolean

  style(name: string): string | undefined

  readonly styles: Record<string, any>

  readonly stylesAll: Record<string, any>[]

  readonly text: string

  readonly textAll: string[]

  readonly toElementString: string
}

export interface GetterWrapper {
  getById(id: string): Wrapper | undefined

  getByQuery(query: string, at?: number, includeSelf?: boolean): Wrapper | undefined

  getByQueryAll(query: string): Wrapper | undefined

  getByTestId(id: string): Wrapper | undefined

  getByText(value: string | RegExp, at?: number): Wrapper | undefined

  getByTextAll(value: string | RegExp): Wrapper | undefined
}

export interface TriggerWrapper {
  /**
   * trigger one element of the component
   * @param eventName any event type
   * @param index @default 0
   */
  trigger(eventName: string, index?: number): Promise<boolean>

  /**
   * trigger all element fragment of the component
   * @param eventName
   */
  triggerAll(eventName: string): Promise<boolean[]>
}

export interface Wrapper extends ReaderWrapper, GetterWrapper, TriggerWrapper {
  __never__?: never
}
