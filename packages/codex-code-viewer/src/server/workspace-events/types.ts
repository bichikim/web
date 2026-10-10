import type {ServerResponse} from 'node:http'
import type {NavigationResult, ScanBatch} from '../../shared/contracts'

export interface WorkspaceScan {
  readonly session: string
  readonly channel: string
  readonly controller: AbortController
  readonly source: (signal: AbortSignal) => AsyncIterable<ScanBatch | NavigationResult>
  response?: ServerResponse
}
