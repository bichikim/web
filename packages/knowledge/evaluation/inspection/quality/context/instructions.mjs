const boundedScope =
  'Evaluate only the subjects and conditions stated in the original pair. ' +
  'When cited rules determine those conditions, close the question without requiring universal ' +
  'guarantees or proof that unmentioned hypothetical exceptions do not exist. ' +
  'For applicability questions, require cited coverage, exclusion or precedence connecting the ' +
  'rule to the compared action; repeating two policies or sharing a storage name does not ' +
  'establish that connection. Keep remaining non-empty when that connection is missing. '

export const instructions = {
  'bounded-scope': boundedScope,
  'close-answered':
    'Once cited text answers a question for this pair, set its remaining to an empty string; ' +
    'do not copy the answered question. Apply stated definitions to the stated values; ' +
    'no source needs to explicitly compare the pair. ',
  'consistent-scope':
    `${
      boundedScope
    }If a comparison prerequisite is still missing, put it in remaining; otherwise apply the ` +
    `cited rules to choose duplicate, conflict or unrelated. Do not use uncertain for an ` +
    `established incompatibility. `,
  original: '',
}
