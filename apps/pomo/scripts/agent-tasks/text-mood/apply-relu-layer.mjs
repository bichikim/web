/**
 * @typedef {object} ReluLayer
 * @property {ArrayLike<number>} bias 호출자가 소유하고 갱신하는 출력 노드별 편향이다. 호출 시 현재 값을 읽는다.
 * @property {number} inputSize 각 출력 노드에 누적할 고정 입력 차원이다. 입력 배열 길이를 다시 읽지 않는다.
 * @property {number} outputSize 생성할 출력 노드 수다. Float64Array 할당과 순회에 그대로 사용한다.
 * @property {ArrayLike<number>} weights 호출자가 소유하고 갱신하는 출력 행 우선 가중치다. 복사하지 않는다.
 */

/**
 * 고정 차원의 affine 합에 ReLU를 적용한 새 벡터를 반환하며 입력과 파라미터는 수정하지 않는다.
 * @param {ArrayLike<number>} embedding 순서대로 읽을 입력 값이다.
 * @param {Readonly<ReluLayer>} layer 고정 차원과 호출자 소유 파라미터다.
 * @returns {Float64Array<ArrayBuffer>} 호출자가 소유할 새 출력 벡터다.
 */
export const applyReluLayer = (embedding, layer) => {
  const {
    bias: hiddenBias,
    inputSize: dimension,
    outputSize: hiddenSize,
    weights: hiddenWeights,
  } = layer
  const hidden = new Float64Array(hiddenSize)

  for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex += 1) {
    let value = hiddenBias[hiddenIndex]
    const offset = hiddenIndex * dimension

    for (let feature = 0; feature < dimension; feature += 1) {
      value += hiddenWeights[offset + feature] * embedding[feature]
    }

    hidden[hiddenIndex] = Math.max(0, value)
  }

  return hidden
}
