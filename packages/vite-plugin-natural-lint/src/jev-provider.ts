import {TypeSafeClient, VERSION} from '@typesafe-ai/sdk'
import {createJevDecisionProvider} from './create-jev-decision-provider'
import {normalizeDecisionAnswers} from './laya-decision'
import {readJevApiKey} from './read-jev-api-key'
import {toJevRequest} from './to-jev-request'
import type {DecisionProviderFactory, ResolvedJevOptions} from './types'

const JEV_DECISION_VERSION = 1

export const createJevProviderFactory = (
  options: ResolvedJevOptions,
  root: string,
): DecisionProviderFactory => ({
  async create() {
    const apiKey = await readJevApiKey(root, process.env.TYPESAFE_API_KEY)
    const client = new TypeSafeClient({
      apiKey,
      baseURL: 'https://api.typesafe.ai',
      logLevel: 'error',
    })
    return createJevDecisionProvider(async (request) => {
      const result = await client.systemOne(toJevRequest(request, options.model))
      return normalizeDecisionAnswers(request.questions, result.answers)
    }, options.concurrency)
  },
  identifier: `@typesafe-ai/sdk@${VERSION}/jev-decision@${JEV_DECISION_VERSION}`,
  revision: options.model,
})
