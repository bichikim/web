export interface FileContent {
  readonly type: string
  readonly path: string
  readonly initialPath?: string
  readonly view: {
    readonly hostId: string
    readonly server: string
    readonly tool: {readonly name: string}
  }
}

export interface FileTab {
  readonly tabType: {readonly kind: string}
  readonly props: {
    readonly content: FileContent
    readonly titleOverride?: string
  }
  readonly durableRoute?: {
    readonly kind: string
    readonly params: {readonly path: string; readonly cwd: string | null}
    readonly payloadVersion: number
  }
}

export interface FileTabUpdate {
  readonly props: FileTab['props']
  readonly durableRoute: FileTab['durableRoute']
  readonly title: string
  readonly tooltip: string
}

export interface LocationRequest {
  readonly path: string
  readonly workspace: string
}

export interface TabLocationInput {
  readonly tab: FileTab
  readonly request: unknown
  readonly hostId: string
  readonly server: string
  readonly workspace: string | null
}
