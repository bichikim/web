export interface ApiSetting {
  foo?: boolean
}

export interface TimeLineInfo {
  color: any
  label: string
}

export interface CreateDevToolOptions {
  /**
   * @default vare-structure
   */
  id?: string

  /**
   * @default Vare
   */
  label?: string

  timeLines?: Record<string, TimeLineInfo>
}
