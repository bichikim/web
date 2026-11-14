import {type Accessor, createEffect, on} from 'solid-js'
import {
  type CodeDocument,
  type CodeLocation,
  failure,
  type Result,
  success,
  type ViewerConnection,
} from '../shared/contracts'
import type {NavigationOptions} from './types'
import type {useLatestRequest} from './use-latest-request'
import type {useFileHistory} from './use-file-history'
import {isMissingDocument} from './is-missing-document'

interface LocatedDocument {
  readonly document: CodeDocument
  readonly deleted: boolean
}
interface UseFileNavigationProps {
  readonly connection: Accessor<ViewerConnection | null>
  readonly revision: Accessor<number>
  readonly history: ReturnType<typeof useFileHistory>
  readonly navigation: ReturnType<typeof useLatestRequest>
  readonly read: (location: CodeLocation) => Promise<{document: CodeDocument}>
  readonly retained: (workspace: string, path: string) => CodeDocument | undefined
  readonly report: (error: unknown) => void
  readonly clear: (connection: ViewerConnection) => void
  readonly show: (
    connection: ViewerConnection,
    document: CodeDocument,
    location: CodeLocation,
    options?: NavigationOptions,
  ) => void
}
interface HistoryTarget {
  readonly index: number
  readonly location: CodeLocation
}

/** Navigates live files or retained drafts and skips confirmed missing history entries. */
export const useFileNavigation = (props: UseFileNavigationProps) => {
  createEffect(on(props.revision, () => props.history.retryMissing()))
  const read = async (
    connection: ViewerConnection,
    location: CodeLocation,
  ): Promise<Result<LocatedDocument>> => {
    try {
      const result = await props.read(location)
      return success({deleted: false, document: result.document})
    } catch (error) {
      if (!isMissingDocument(error)) {
        throw error
      }
      const document = props.retained(connection.workspace, location.path)
      return document === undefined ? failure('not-found') : success({deleted: true, document})
    }
  }
  const show = (
    connection: ViewerConnection,
    value: LocatedDocument,
    location: CodeLocation,
    navigation?: NavigationOptions,
  ): void => {
    if (!value.deleted) {
      props.history.markPresent(location.path)
    }
    props.show(connection, value.document, location, {...navigation, deleted: value.deleted})
  }
  const go = async (location: CodeLocation, navigation?: NavigationOptions): Promise<void> => {
    const connection = props.connection()
    if (connection === null) {
      return
    }
    await props.navigation.run(async (current) => {
      const result = await read(connection, location)
      if (current()) {
        if (result.ok) {
          show(connection, result.value, location, navigation)
        } else {
          props.report(result.error)
        }
      }
    })
  }
  const traverse = async (targets: readonly HistoryTarget[], recover = false): Promise<void> => {
    const connection = props.connection()
    if (connection === null) {
      return
    }
    const generation = props.history.generation()
    if (recover) {
      props.clear(connection)
    }
    await props.navigation.run(async (current) => {
      const active = (): boolean => current() && generation === props.history.generation()
      const visited = new Set<string>()
      await targets.reduce(async (previous, target) => {
        if ((await previous) || !active()) {
          return true
        }
        const {path} = target.location
        if (!visited.has(path) && props.history.available(path)) {
          visited.add(path)
          const revision = props.revision()
          const result = await read(connection, target.location)
          if (!active()) {
            return true
          }
          if (result.ok) {
            show(connection, result.value, target.location, {
              historyIndex: target.index,
              restoreView: true,
            })
            return true
          }
          if (revision === props.revision()) {
            props.history.markMissing(path)
          }
        }
        return false
      }, Promise.resolve(false))
    })
  }
  const recover = () =>
    traverse(
      [
        props.history.current(),
        ...props.history.candidates(-1),
        ...props.history.candidates(1),
      ].filter((target) => target !== undefined),
      true,
    )
  return {
    forget: (path: string) => {
      props.history.applyMutation({action: 'delete', entry: {kind: 'file', path}, source: path})
      return recover()
    },
    go,
    move: (direction: -1 | 1) => traverse(props.history.candidates(direction)),
    recover,
  }
}
