export const mapInBatches = async <Input, Output>(
  inputs: ReadonlyArray<Input>,
  batchSize: number,
  map: (input: Input) => Promise<Output>,
): Promise<ReadonlyArray<Output>> => {
  const outputs: Array<Output> = []
  const loadBatch = async (offset: number): Promise<void> => {
    outputs.push(...(await Promise.all(inputs.slice(offset, offset + batchSize).map(map))))

    if (offset + batchSize < inputs.length) {
      await loadBatch(offset + batchSize)
    }
  }

  await loadBatch(0)
  return outputs
}
