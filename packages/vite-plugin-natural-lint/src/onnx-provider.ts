import type {Laya} from '@receptron/laya'
import {
  formatDecisionQuestions,
  LAYA_DECISION_VERSION,
  normalizeDecisionAnswers,
} from './laya-decision'
import type {
  DecisionAnswers,
  DecisionProvider,
  DecisionProviderFactory,
  DecisionRequest,
  ResolvedOnnxLayaOptions,
} from './types'

const LAYA_ONNX_VERSION = '0.1.1'

const loadOptions = (options: ResolvedOnnxLayaOptions) =>
  options.modelDir === undefined
    ? {
        cacheDir: options.cacheDir,
        repo: options.repo,
        revision: options.modelRevision,
        subfolder: options.subfolder,
      }
    : {modelDir: options.modelDir}

class OnnxProvider implements DecisionProvider {
  constructor(private readonly laya: Laya) {}

  close(): Promise<void> {
    return this.laya.close()
  }

  async decide(request: DecisionRequest): Promise<DecisionAnswers> {
    const result = await this.laya.systemOne(
      request.state,
      formatDecisionQuestions(request.questions),
    )
    return normalizeDecisionAnswers(request.questions, result.answers)
  }
}

export const createOnnxProviderFactory = (
  options: ResolvedOnnxLayaOptions,
): DecisionProviderFactory => ({
  async create() {
    const {Laya} = await import('@receptron/laya')
    return new OnnxProvider(await Laya.load(loadOptions(options)))
  },
  identifier: [
    `@receptron/laya@${LAYA_ONNX_VERSION}`,
    `decision@${LAYA_DECISION_VERSION}`,
    options.modelDir ?? options.repo,
    options.modelDir === undefined ? options.subfolder : 'local',
  ].join('/'),
  revision: options.modelRevision,
})
