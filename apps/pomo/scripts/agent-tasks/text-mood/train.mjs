// oxlint-disable max-lines-per-function -- The offline entry point keeps one auditable training pipeline.
// oxlint-disable max-statements -- The offline entry point keeps one auditable training pipeline.
// oxlint-disable no-magic-numbers -- Candidate grids and seeds are explicit experiment parameters.
// Trains the text-mood classifier and updates its src artifacts; JSON training data and reports stay here.

import {writeFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'

import {
  ARTIFACT_PATH,
  CLASSIFIER_INFO_PATH,
  DATASET_PATH,
  HARD_EXAMPLES_PATH,
  INSUFFICIENCY_TRAINING_CONFIGURATIONS,
  loadEmbeddings,
  MODEL,
  MODIFIER_LABELS,
  MODIFIER_TRAINING_CONFIGURATIONS,
  PRIMARY_LABELS,
  readJson,
  REPORT_PATH,
  SUFFICIENCY_DATASET_PATH,
  validateDataset,
  validateSufficiencyDataset,
} from './training-data.mjs'
import {
  evaluatePrimary,
  getTopIndexes,
  roundArray,
  roundNumber,
  softmax,
  trainBinaryLinear,
  trainBinaryMlp,
  trainCentroid,
  trainMlp,
  trainMulticlassLinear,
} from './training-models.mjs'

const MINIMUM_INSUFFICIENCY_PRECISION = 0.98

const getBinaryMetrics = (rows, getTarget, predict, threshold) => {
  let falseNegative = 0
  let falsePositive = 0
  let trueNegative = 0
  let truePositive = 0

  for (const row of rows) {
    const actual = getTarget(row)
    const predicted = predict(row.embedding) >= threshold

    if (actual && predicted) {
      truePositive += 1
    } else if (actual) {
      falseNegative += 1
    } else if (predicted) {
      falsePositive += 1
    } else {
      trueNegative += 1
    }
  }

  const precision =
    truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive)
  const recall =
    truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative)
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  const falsePositiveRate =
    falsePositive + trueNegative === 0 ? 0 : falsePositive / (falsePositive + trueNegative)
  return {
    f1,
    falseNegative,
    falsePositive,
    falsePositiveRate,
    precision,
    recall,
    threshold,
    trueNegative,
    truePositive,
  }
}

const getBinaryPredictions = (rows, getTarget, predict, threshold) =>
  rows.map((row) => {
    const probability = predict(row.embedding)

    return {
      actual: getTarget(row),
      id: row.id,
      predicted: probability >= threshold,
      probability: roundNumber(probability),
    }
  })

const findModifierThreshold = (rows, getTarget, predict) => {
  const candidates = Array.from({length: 17}, (_, index) => 0.1 + index * 0.05)
  return candidates
    .map((threshold) => getBinaryMetrics(rows, getTarget, predict, threshold))
    .sort((left, right) => right.f1 - left.f1 || left.threshold - right.threshold)[0]
}

export const findInsufficiencyThreshold = (rows, predict) => {
  const candidates = Array.from({length: 50}, (_, index) => 0.5 + index * 0.01)
  const highestSufficientProbability = Math.max(
    ...rows.filter((row) => row.sufficient).map((row) => predict(row.embedding)),
  )
  const conservativeThreshold = Math.max(0.94, Math.min(0.99, highestSufficientProbability + 0.01))
  const metrics = candidates.map((threshold) =>
    getBinaryMetrics(rows, (row) => !row.sufficient, predict, threshold),
  )
  const highPrecision = metrics.filter(
    ({precision, threshold}) =>
      precision >= MINIMUM_INSUFFICIENCY_PRECISION && threshold >= conservativeThreshold,
  )

  if (highPrecision.length === 0) {
    return null
  }

  return highPrecision.sort(
    (left, right) =>
      right.recall - left.recall ||
      right.f1 - left.f1 ||
      right.precision - left.precision ||
      left.threshold - right.threshold,
  )[0]
}

const findTemperature = (rows, model) => {
  const candidates = [0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3, 0.5, 0.75, 1]

  return candidates
    .map((temperature) => {
      const loss =
        rows.reduce((sum, row) => {
          const probabilities = softmax(
            model.predictScores(row.embedding).map((score) => score / temperature),
          )
          return sum - Math.log(Math.max(probabilities[row.target], 1e-8))
        }, 0) / rows.length
      return {loss, temperature}
    })
    .sort((left, right) => left.loss - right.loss)[0]
}

const findUncertainMargin = (rows, model, temperature) => {
  const candidates = Array.from({length: 21}, (_, index) => index * 0.025)
  const selections = candidates.map((threshold) => {
    let correct = 0
    let retained = 0

    for (const row of rows) {
      const probabilities = softmax(
        model.predictScores(row.embedding).map((score) => score / temperature),
      )
      const topIndexes = getTopIndexes(probabilities)
      const margin = probabilities[topIndexes[0]] - probabilities[topIndexes[1]]

      if (margin >= threshold) {
        retained += 1
        correct += topIndexes[0] === row.target ? 1 : 0
      }
    }

    const coverage = retained / rows.length
    const accuracy = retained === 0 ? 0 : correct / retained
    return {accuracy, coverage, score: accuracy + coverage * 0.15, threshold}
  })

  return selections
    .filter(({coverage}) => coverage >= 0.75)
    .sort((left, right) => right.score - left.score || left.threshold - right.threshold)[0]
}

const run = async () => {
  const baseDataset = await readJson(DATASET_PATH)
  const hardExamples = await readJson(HARD_EXAMPLES_PATH)
  const sufficiencyDataset = await readJson(SUFFICIENCY_DATASET_PATH)

  if (
    hardExamples.schemaVersion !== baseDataset.schemaVersion ||
    !Array.isArray(hardExamples.items)
  ) {
    throw new Error('Unsupported hard example dataset schema.')
  }

  const dataset = {
    items: [...baseDataset.items, ...hardExamples.items],
    schemaVersion: baseDataset.schemaVersion,
  }
  validateDataset(dataset)
  validateSufficiencyDataset(sufficiencyDataset)
  const embeddingItems = [
    ...dataset.items.map((item) => ({...item, source: 'mood', sufficient: true})),
    ...sufficiencyDataset.items.map((item) => ({...item, source: 'sufficiency'})),
  ]
  const embeddedRows = await loadEmbeddings(embeddingItems)
  const rows = embeddedRows
    .filter((row) => row.source === 'mood')
    .map((row) => ({
      ...row,
      target: PRIMARY_LABELS.indexOf(row.primary),
    }))
  const sufficiencyRows = embeddedRows
  const modifierTrainRows = rows.filter((row) => row.split === 'train')
  const primaryTrainRows = modifierTrainRows.filter((row) => row.primaryTraining !== false)
  const validationRows = rows.filter((row) => row.split === 'validation')
  const testRows = rows.filter((row) => row.split === 'test')
  const centroid = trainCentroid(primaryTrainRows)
  const logistic = trainMulticlassLinear(primaryTrainRows)
  const mlp = trainMlp(primaryTrainRows)
  const validationMetrics = {
    centroid: evaluatePrimary(centroid, validationRows),
    logistic: evaluatePrimary(logistic, validationRows),
    mlp: evaluatePrimary(mlp, validationRows),
  }
  const selected =
    validationMetrics.logistic.macroF1 >= validationMetrics.centroid.macroF1
      ? {model: logistic, name: 'logistic'}
      : {model: centroid, name: 'centroid'}
  const modifierHeads = {}
  const modifierMetrics = {}

  for (const modifier of MODIFIER_LABELS) {
    const getTarget = (row) => row.modifiers.includes(modifier)
    const candidates = MODIFIER_TRAINING_CONFIGURATIONS.map((configuration) => {
      const head = trainBinaryLinear(modifierTrainRows, getTarget, {
        ...configuration,
        seed: modifier === 'playful' ? 31 : 47,
      })
      const validation = findModifierThreshold(validationRows, getTarget, head.predict)
      return {configuration, head, validation}
    })
    const [selectedModifier] = candidates.sort(
      (left, right) =>
        right.validation.f1 - left.validation.f1 ||
        right.validation.precision - left.validation.precision ||
        right.validation.recall - left.validation.recall,
    )
    const {configuration, head, validation: selectedThreshold} = selectedModifier
    modifierHeads[modifier] = {
      bias: roundNumber(head.bias),
      threshold: roundNumber(selectedThreshold.threshold),
      weights: roundArray(head.weights),
    }
    modifierMetrics[modifier] = {
      configuration,
      test: getBinaryMetrics(testRows, getTarget, head.predict, selectedThreshold.threshold),
      testPredictions: getBinaryPredictions(
        testRows,
        getTarget,
        head.predict,
        selectedThreshold.threshold,
      ),
      validation: selectedThreshold,
      validationPredictions: getBinaryPredictions(
        validationRows,
        getTarget,
        head.predict,
        selectedThreshold.threshold,
      ),
    }
  }

  const sufficiencyTrainRows = sufficiencyRows.filter((row) => row.split === 'train')
  const sufficiencyValidationRows = sufficiencyRows.filter((row) => row.split === 'validation')
  const sufficiencyTestRows = sufficiencyRows.filter((row) => row.split === 'test')
  const insufficiencyPositiveWeight =
    sufficiencyTrainRows.filter((row) => row.sufficient).length /
    sufficiencyTrainRows.filter((row) => !row.sufficient).length
  const insufficiencyCandidates = INSUFFICIENCY_TRAINING_CONFIGURATIONS.map(
    (configuration, index) => {
      const trainingOptions = {
        ...configuration,
        positiveWeight: insufficiencyPositiveWeight,
        seed: 71 + index,
      }
      const head =
        configuration.kind === 'mlp'
          ? trainBinaryMlp(sufficiencyTrainRows, (row) => !row.sufficient, trainingOptions)
          : trainBinaryLinear(sufficiencyTrainRows, (row) => !row.sufficient, trainingOptions)
      const validation = findInsufficiencyThreshold(sufficiencyValidationRows, head.predict)
      return validation === null ? null : {configuration, head, validation}
    },
  ).filter(Boolean)

  if (insufficiencyCandidates.length === 0) {
    throw new Error(
      `No insufficiency model reached ${MINIMUM_INSUFFICIENCY_PRECISION} validation precision.`,
    )
  }

  const [selectedInsufficiency] = insufficiencyCandidates.sort(
    (left, right) =>
      right.validation.precision - left.validation.precision ||
      right.validation.recall - left.validation.recall ||
      right.validation.f1 - left.validation.f1 ||
      right.validation.threshold - left.validation.threshold,
  )
  const insufficiencyThreshold = selectedInsufficiency.validation.threshold
  const insufficiencyTestMetrics = getBinaryMetrics(
    sufficiencyTestRows,
    (row) => !row.sufficient,
    selectedInsufficiency.head.predict,
    insufficiencyThreshold,
  )

  if (insufficiencyTestMetrics.precision < MINIMUM_INSUFFICIENCY_PRECISION) {
    const testPrecision = insufficiencyTestMetrics.precision.toFixed(3)
    throw new Error(
      `Insufficiency test precision ${testPrecision} is below ${MINIMUM_INSUFFICIENCY_PRECISION}.`,
    )
  }

  const calibration = findTemperature(validationRows, selected.model)
  const uncertain = findUncertainMargin(validationRows, selected.model, calibration.temperature)
  const testPrimaryMetrics = evaluatePrimary(selected.model, testRows)
  const artifact = {
    embedding: MODEL,
    evaluation: {
      accuracy: testPrimaryMetrics.accuracy,
      insufficiency: {
        f1: insufficiencyTestMetrics.f1,
        falsePositiveRate: insufficiencyTestMetrics.falsePositiveRate,
        precision: insufficiencyTestMetrics.precision,
        recall: insufficiencyTestMetrics.recall,
        totalSamples: sufficiencyTestRows.length,
      },
      macroF1: testPrimaryMetrics.macroF1,
      modifierF1: Object.fromEntries(
        MODIFIER_LABELS.map((modifier) => [modifier, modifierMetrics[modifier].test.f1]),
      ),
      topTwoAccuracy: testPrimaryMetrics.topTwoAccuracy,
      totalSamples: rows.length,
    },
    insufficiencyHead:
      selectedInsufficiency.configuration.kind === 'mlp'
        ? {
            hiddenBias: roundArray(selectedInsufficiency.head.hiddenBias),
            hiddenWeights: roundArray(selectedInsufficiency.head.hiddenWeights),
            kind: 'mlp',
            outputBias: roundNumber(selectedInsufficiency.head.outputBias),
            outputWeights: roundArray(selectedInsufficiency.head.outputWeights),
            threshold: roundNumber(insufficiencyThreshold),
          }
        : {
            bias: roundNumber(selectedInsufficiency.head.bias),
            kind: 'linear',
            threshold: roundNumber(insufficiencyThreshold),
            weights: roundArray(selectedInsufficiency.head.weights),
          },
    labels: PRIMARY_LABELS,
    modelKind: selected.name,
    modifierHeads,
    primaryHead: {
      bias: roundArray(selected.model.bias),
      weights: roundArray(selected.model.weights),
    },
    schemaVersion: 2,
    temperature: calibration.temperature,
    uncertainMargin: roundNumber(uncertain.threshold),
  }
  const classifierInfo = {
    evaluation: artifact.evaluation,
    modelKind: artifact.modelKind,
    schemaVersion: artifact.schemaVersion,
    temperature: artifact.temperature,
    uncertainMargin: artifact.uncertainMargin,
  }
  const report = {
    dataset: {
      base: baseDataset.items.length,
      hardExamples: hardExamples.items.length,
      modifierTrain: modifierTrainRows.length,
      primaryTrain: primaryTrainRows.length,
      sufficiency: {
        test: sufficiencyTestRows.length,
        total: sufficiencyRows.length,
        train: sufficiencyTrainRows.length,
        validation: sufficiencyValidationRows.length,
      },
      test: testRows.length,
      total: rows.length,
      train: modifierTrainRows.length,
      validation: validationRows.length,
    },
    insufficiencyMetrics: {
      configuration: selectedInsufficiency.configuration,
      positiveWeight: insufficiencyPositiveWeight,
      test: insufficiencyTestMetrics,
      testPredictions: getBinaryPredictions(
        sufficiencyTestRows,
        (row) => !row.sufficient,
        selectedInsufficiency.head.predict,
        insufficiencyThreshold,
      ),
      validation: selectedInsufficiency.validation,
      validationPredictions: getBinaryPredictions(
        sufficiencyValidationRows,
        (row) => !row.sufficient,
        selectedInsufficiency.head.predict,
        insufficiencyThreshold,
      ),
    },
    modifierMetrics,
    selectedPrimaryModel: selected.name,
    temperature: calibration,
    testMetrics: testPrimaryMetrics,
    uncertain,
    validationMetrics,
  }

  await writeFile(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
  await writeFile(CLASSIFIER_INFO_PATH, `${JSON.stringify(classifierInfo, null, 2)}\n`, 'utf8')
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  process.stdout.write(
    `${[
      `Selected: ${selected.name}`,
      `Test accuracy: ${testPrimaryMetrics.accuracy.toFixed(3)}`,
      `Test macro F1: ${testPrimaryMetrics.macroF1.toFixed(3)}`,
      `Test top-2 accuracy: ${testPrimaryMetrics.topTwoAccuracy.toFixed(3)}`,
      `Insufficiency precision: ${insufficiencyTestMetrics.precision.toFixed(3)}`,
      `Insufficiency recall: ${insufficiencyTestMetrics.recall.toFixed(3)}`,
      `Report: ${REPORT_PATH}`,
    ].join('\n')}\n`,
  )
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run()
}
