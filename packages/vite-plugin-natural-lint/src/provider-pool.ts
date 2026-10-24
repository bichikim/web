import type {
  DecisionAnswers,
  DecisionProvider,
  DecisionProviderFactory,
  DecisionRequest,
} from './types'

class ProviderPool implements DecisionProvider {
  private readonly pending: number[]
  private nextIndex = 0

  constructor(private readonly providers: ReadonlyArray<DecisionProvider>) {
    this.pending = providers.map(() => 0)
  }

  async decide(request: DecisionRequest): Promise<DecisionAnswers> {
    let selected = this.nextIndex
    for (let offset = 1; offset < this.providers.length; offset += 1) {
      const candidate = (this.nextIndex + offset) % this.providers.length
      if (this.pending[candidate]! < this.pending[selected]!) {
        selected = candidate
      }
    }
    this.nextIndex = (selected + 1) % this.providers.length
    this.pending[selected]! += 1
    try {
      return await this.providers[selected]!.decide(request)
    } finally {
      this.pending[selected]! -= 1
    }
  }

  async close(): Promise<void> {
    await Promise.all(this.providers.map((provider) => provider.close()))
  }
}

export const createProviderPoolFactory = (
  source: DecisionProviderFactory,
  instances: number,
): DecisionProviderFactory => ({
  async create() {
    const first = await source.create()
    const others = await Promise.allSettled(
      Array.from({length: instances - 1}, () => source.create()),
    )
    const prepared = [
      first,
      ...others.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
    ]
    const failure = others.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )
    if (failure !== undefined) {
      await Promise.allSettled(prepared.map((provider) => provider.close()))
      throw failure.reason
    }
    return new ProviderPool(prepared)
  },
  identifier: source.identifier,
  revision: source.revision,
})
