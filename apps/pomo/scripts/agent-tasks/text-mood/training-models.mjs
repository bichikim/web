// oxlint-disable max-depth -- Dense tensor loops mirror the model equations directly.
// oxlint-disable max-params -- Optimizer arrays are kept explicit to avoid per-batch allocations.
// oxlint-disable max-statements -- Training passes keep gradients and updates in one hot path.
// oxlint-disable no-bitwise -- The seeded Mulberry32 generator intentionally uses bitwise math.
// oxlint-disable no-continue -- Skipping inactive ReLU nodes avoids unnecessary gradient work.
// oxlint-disable no-magic-numbers -- Numeric constants are fixed optimizer and model parameters.
// oxlint-disable prefer-destructuring -- Tensor hot loops use explicit indexed access.
// oxlint-disable unicorn/no-new-array -- Single arguments are intentional dynamic array dimensions.

import {PRIMARY_LABELS} from './training-data.mjs'

const createRandom = (seed) => {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

const shuffleIndexes = (length, random) => {
  const indexes = Array.from({length}, (_, index) => index)

  for (let index = length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    const value = indexes[index]
    indexes[index] = indexes[target]
    indexes[target] = value
  }

  return indexes
}

export const softmax = (logits) => {
  const maximum = Math.max(...logits)
  const values = logits.map((value) => Math.exp(value - maximum))
  const total = values.reduce((sum, value) => sum + value, 0)
  return values.map((value) => value / total)
}

const sigmoid = (value) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))))

const createLinearScores = (embedding, weights, bias, outputSize) => {
  const dimension = embedding.length
  const scores = new Array(outputSize).fill(0)

  for (let output = 0; output < outputSize; output += 1) {
    let score = bias[output]
    const weightOffset = output * dimension

    for (let feature = 0; feature < dimension; feature += 1) {
      score += weights[weightOffset + feature] * embedding[feature]
    }

    scores[output] = score
  }

  return scores
}

const updateAdam = (values, gradients, firstMoments, secondMoments, step, learningRate) => {
  const firstDecay = 0.9
  const secondDecay = 0.999
  const firstCorrection = 1 - firstDecay ** step
  const secondCorrection = 1 - secondDecay ** step

  for (let index = 0; index < values.length; index += 1) {
    firstMoments[index] = firstDecay * firstMoments[index] + (1 - firstDecay) * gradients[index]
    secondMoments[index] =
      secondDecay * secondMoments[index] + (1 - secondDecay) * gradients[index] ** 2
    const adjustedFirst = firstMoments[index] / firstCorrection
    const adjustedSecond = secondMoments[index] / secondCorrection
    values[index] -= (learningRate * adjustedFirst) / (Math.sqrt(adjustedSecond) + 1e-8)
  }
}

export const trainMulticlassLinear = (rows, options = {}) => {
  const outputSize = options.outputSize ?? PRIMARY_LABELS.length
  const dimension = rows[0].embedding.length
  const weights = new Float64Array(outputSize * dimension)
  const bias = new Float64Array(outputSize)
  const weightFirst = new Float64Array(weights.length)
  const weightSecond = new Float64Array(weights.length)
  const biasFirst = new Float64Array(bias.length)
  const biasSecond = new Float64Array(bias.length)
  const random = createRandom(options.seed ?? 7)
  const epochs = options.epochs ?? 180
  const batchSize = options.batchSize ?? 24
  const learningRate = options.learningRate ?? 0.025
  const regularization = options.regularization ?? 0.003
  let step = 0

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const indexes = shuffleIndexes(rows.length, random)

    for (let offset = 0; offset < indexes.length; offset += batchSize) {
      const batch = indexes.slice(offset, offset + batchSize)
      const weightGradients = new Float64Array(weights.length)
      const biasGradients = new Float64Array(bias.length)

      for (const rowIndex of batch) {
        const row = rows[rowIndex]
        const probabilities = softmax(createLinearScores(row.embedding, weights, bias, outputSize))

        for (let output = 0; output < outputSize; output += 1) {
          const difference = probabilities[output] - (row.target === output ? 1 : 0)
          biasGradients[output] += difference
          const weightOffset = output * dimension

          for (let feature = 0; feature < dimension; feature += 1) {
            weightGradients[weightOffset + feature] += difference * row.embedding[feature]
          }
        }
      }

      for (let index = 0; index < weightGradients.length; index += 1) {
        weightGradients[index] =
          weightGradients[index] / batch.length + regularization * weights[index]
      }

      for (let index = 0; index < biasGradients.length; index += 1) {
        biasGradients[index] /= batch.length
      }

      step += 1
      updateAdam(weights, weightGradients, weightFirst, weightSecond, step, learningRate)
      updateAdam(bias, biasGradients, biasFirst, biasSecond, step, learningRate)
    }
  }

  return {
    bias: Array.from(bias),
    predictScores: (embedding) => createLinearScores(embedding, weights, bias, outputSize),
    weights: Array.from(weights),
  }
}

const normalizeVector = (values) => {
  const length = Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0)) || 1
  return values.map((value) => value / length)
}

export const trainCentroid = (rows) => {
  const dimension = rows[0].embedding.length
  const centroids = PRIMARY_LABELS.map(() => new Array(dimension).fill(0))
  const counts = new Array(PRIMARY_LABELS.length).fill(0)

  for (const row of rows) {
    counts[row.target] += 1

    for (let feature = 0; feature < dimension; feature += 1) {
      centroids[row.target][feature] += row.embedding[feature]
    }
  }

  const weights = centroids.flatMap((centroid, index) =>
    normalizeVector(centroid.map((value) => value / counts[index])),
  )
  const bias = new Array(PRIMARY_LABELS.length).fill(0)

  return {
    bias,
    predictScores: (embedding) =>
      createLinearScores(embedding, weights, bias, PRIMARY_LABELS.length),
    weights,
  }
}

export const trainMlp = (rows) => {
  const dimension = rows[0].embedding.length
  const hiddenSize = 24
  const outputSize = PRIMARY_LABELS.length
  const random = createRandom(19)
  const hiddenWeights = Float64Array.from(
    {length: hiddenSize * dimension},
    () => (random() * 2 - 1) * Math.sqrt(6 / (dimension + hiddenSize)),
  )
  const hiddenBias = new Float64Array(hiddenSize)
  const outputWeights = Float64Array.from(
    {length: outputSize * hiddenSize},
    () => (random() * 2 - 1) * Math.sqrt(6 / (hiddenSize + outputSize)),
  )
  const outputBias = new Float64Array(outputSize)
  const parameters = [hiddenWeights, hiddenBias, outputWeights, outputBias]
  const firstMoments = parameters.map((values) => new Float64Array(values.length))
  const secondMoments = parameters.map((values) => new Float64Array(values.length))
  const batchSize = 24
  let step = 0

  const forward = (embedding) => {
    const hidden = new Float64Array(hiddenSize)

    for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex += 1) {
      let value = hiddenBias[hiddenIndex]
      const offset = hiddenIndex * dimension

      for (let feature = 0; feature < dimension; feature += 1) {
        value += hiddenWeights[offset + feature] * embedding[feature]
      }

      hidden[hiddenIndex] = Math.max(0, value)
    }

    return {
      hidden,
      scores: createLinearScores(hidden, outputWeights, outputBias, outputSize),
    }
  }

  for (let epoch = 0; epoch < 120; epoch += 1) {
    const indexes = shuffleIndexes(rows.length, random)

    for (let offset = 0; offset < indexes.length; offset += batchSize) {
      const batch = indexes.slice(offset, offset + batchSize)
      const gradients = parameters.map((values) => new Float64Array(values.length))

      for (const rowIndex of batch) {
        const row = rows[rowIndex]
        const {hidden, scores} = forward(row.embedding)
        const probabilities = softmax(scores)
        const hiddenGradient = new Float64Array(hiddenSize)

        for (let output = 0; output < outputSize; output += 1) {
          const difference = probabilities[output] - (row.target === output ? 1 : 0)
          gradients[3][output] += difference
          const outputOffset = output * hiddenSize

          for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex += 1) {
            gradients[2][outputOffset + hiddenIndex] += difference * hidden[hiddenIndex]
            hiddenGradient[hiddenIndex] += difference * outputWeights[outputOffset + hiddenIndex]
          }
        }

        for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex += 1) {
          if (hidden[hiddenIndex] > 0) {
            const difference = hiddenGradient[hiddenIndex]
            gradients[1][hiddenIndex] += difference
            const hiddenOffset = hiddenIndex * dimension

            for (let feature = 0; feature < dimension; feature += 1) {
              gradients[0][hiddenOffset + feature] += difference * row.embedding[feature]
            }
          }
        }
      }

      for (let parameterIndex = 0; parameterIndex < parameters.length; parameterIndex += 1) {
        const gradient = gradients[parameterIndex]

        for (let index = 0; index < gradient.length; index += 1) {
          gradient[index] /= batch.length
        }

        step += 1
        updateAdam(
          parameters[parameterIndex],
          gradient,
          firstMoments[parameterIndex],
          secondMoments[parameterIndex],
          step,
          0.01,
        )
      }
    }
  }

  return {predictScores: (embedding) => forward(embedding).scores}
}

export const getTopIndexes = (scores) =>
  scores
    .map((score, index) => ({index, score}))
    .sort((left, right) => right.score - left.score)
    .map(({index}) => index)

export const evaluatePrimary = (model, rows) => {
  const confusionMatrix = PRIMARY_LABELS.map(() => new Array(PRIMARY_LABELS.length).fill(0))
  let correct = 0
  let topTwoCorrect = 0

  for (const row of rows) {
    const topIndexes = getTopIndexes(model.predictScores(row.embedding))
    const predicted = topIndexes[0]
    confusionMatrix[row.target][predicted] += 1
    correct += predicted === row.target ? 1 : 0
    topTwoCorrect += topIndexes.slice(0, 2).includes(row.target) ? 1 : 0
  }

  const labelMetrics = PRIMARY_LABELS.map((label, index) => {
    const truePositive = confusionMatrix[index][index]
    const predicted = confusionMatrix.reduce((sum, row) => sum + row[index], 0)
    const actual = confusionMatrix[index].reduce((sum, value) => sum + value, 0)
    const precision = predicted === 0 ? 0 : truePositive / predicted
    const recall = actual === 0 ? 0 : truePositive / actual
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
    return {f1, label, precision, recall, support: actual}
  })

  return {
    accuracy: correct / rows.length,
    confusionMatrix,
    labels: labelMetrics,
    macroF1: labelMetrics.reduce((sum, metric) => sum + metric.f1, 0) / labelMetrics.length,
    topTwoAccuracy: topTwoCorrect / rows.length,
  }
}

export const trainBinaryLinear = (rows, getTarget, options) => {
  const dimension = rows[0].embedding.length
  const weights = new Float64Array(dimension)
  const bias = new Float64Array(1)
  const weightFirst = new Float64Array(dimension)
  const weightSecond = new Float64Array(dimension)
  const biasFirst = new Float64Array(1)
  const biasSecond = new Float64Array(1)
  const random = createRandom(options.seed)
  const positiveWeight = options.positiveWeight ?? 1
  let step = 0

  for (let epoch = 0; epoch < options.epochs; epoch += 1) {
    const indexes = shuffleIndexes(rows.length, random)

    for (let offset = 0; offset < indexes.length; offset += 24) {
      const batch = indexes.slice(offset, offset + 24)
      const weightGradient = new Float64Array(dimension)
      const biasGradient = new Float64Array(1)

      for (const rowIndex of batch) {
        const row = rows[rowIndex]
        let score = bias[0]

        for (let feature = 0; feature < dimension; feature += 1) {
          score += weights[feature] * row.embedding[feature]
        }

        const target = getTarget(row) ? 1 : 0
        const sampleWeight = target === 1 ? positiveWeight : 1
        const difference = (sigmoid(score) - target) * sampleWeight
        biasGradient[0] += difference

        for (let feature = 0; feature < dimension; feature += 1) {
          weightGradient[feature] += difference * row.embedding[feature]
        }
      }

      for (let feature = 0; feature < dimension; feature += 1) {
        weightGradient[feature] =
          weightGradient[feature] / batch.length + options.regularization * weights[feature]
      }

      biasGradient[0] /= batch.length
      step += 1
      updateAdam(weights, weightGradient, weightFirst, weightSecond, step, options.learningRate)
      updateAdam(bias, biasGradient, biasFirst, biasSecond, step, options.learningRate)
    }
  }

  const predict = (embedding) => {
    let score = bias[0]

    for (let feature = 0; feature < dimension; feature += 1) {
      score += weights[feature] * embedding[feature]
    }

    return sigmoid(score)
  }

  return {bias: bias[0], predict, weights: Array.from(weights)}
}

export const trainBinaryMlp = (rows, getTarget, options) => {
  const dimension = rows[0].embedding.length
  const hiddenSize = options.hiddenSize
  const random = createRandom(options.seed)
  const hiddenWeights = Float64Array.from(
    {length: hiddenSize * dimension},
    () => (random() * 2 - 1) * Math.sqrt(6 / (dimension + hiddenSize)),
  )
  const hiddenBias = new Float64Array(hiddenSize)
  const outputWeights = Float64Array.from(
    {length: hiddenSize},
    () => (random() * 2 - 1) * Math.sqrt(6 / (hiddenSize + 1)),
  )
  const outputBias = new Float64Array(1)
  const parameters = [hiddenWeights, hiddenBias, outputWeights, outputBias]
  const firstMoments = parameters.map((values) => new Float64Array(values.length))
  const secondMoments = parameters.map((values) => new Float64Array(values.length))
  const positiveWeight = options.positiveWeight ?? 1
  let step = 0

  const forward = (embedding) => {
    const hidden = new Float64Array(hiddenSize)

    for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex += 1) {
      let value = hiddenBias[hiddenIndex]
      const offset = hiddenIndex * dimension

      for (let feature = 0; feature < dimension; feature += 1) {
        value += hiddenWeights[offset + feature] * embedding[feature]
      }

      hidden[hiddenIndex] = Math.max(0, value)
    }

    let score = outputBias[0]

    for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex += 1) {
      score += outputWeights[hiddenIndex] * hidden[hiddenIndex]
    }

    return {hidden, probability: sigmoid(score)}
  }

  for (let epoch = 0; epoch < options.epochs; epoch += 1) {
    const indexes = shuffleIndexes(rows.length, random)

    for (let offset = 0; offset < indexes.length; offset += 24) {
      const batch = indexes.slice(offset, offset + 24)
      const gradients = parameters.map((values) => new Float64Array(values.length))

      for (const rowIndex of batch) {
        const row = rows[rowIndex]
        const {hidden, probability} = forward(row.embedding)
        const target = getTarget(row) ? 1 : 0
        const sampleWeight = target === 1 ? positiveWeight : 1
        const difference = (probability - target) * sampleWeight
        gradients[3][0] += difference

        for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex += 1) {
          gradients[2][hiddenIndex] += difference * hidden[hiddenIndex]

          if (hidden[hiddenIndex] <= 0) {
            continue
          }

          const hiddenDifference = difference * outputWeights[hiddenIndex]
          gradients[1][hiddenIndex] += hiddenDifference
          const hiddenOffset = hiddenIndex * dimension

          for (let feature = 0; feature < dimension; feature += 1) {
            gradients[0][hiddenOffset + feature] += hiddenDifference * row.embedding[feature]
          }
        }
      }

      for (let parameterIndex = 0; parameterIndex < parameters.length; parameterIndex += 1) {
        const gradient = gradients[parameterIndex]
        const regularize = parameterIndex === 0 || parameterIndex === 2

        for (let index = 0; index < gradient.length; index += 1) {
          gradient[index] =
            gradient[index] / batch.length +
            (regularize ? options.regularization * parameters[parameterIndex][index] : 0)
        }

        step += 1
        updateAdam(
          parameters[parameterIndex],
          gradient,
          firstMoments[parameterIndex],
          secondMoments[parameterIndex],
          step,
          options.learningRate,
        )
      }
    }
  }

  return {
    hiddenBias: Array.from(hiddenBias),
    hiddenWeights: Array.from(hiddenWeights),
    outputBias: outputBias[0],
    outputWeights: Array.from(outputWeights),
    predict: (embedding) => forward(embedding).probability,
  }
}

export const roundNumber = (value) => Number(value.toFixed(8))
export const roundArray = (values) => values.map(roundNumber)
