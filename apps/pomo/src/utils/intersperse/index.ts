/** 원소 사이에만 구분자를 넣은 새 배열을 반환한다. 원소와 구분자는 복사하지 않고 같은 참조를 유지한다. */
export const intersperse = <Item, Separator>(
  items: ReadonlyArray<Item>,
  separator: Separator,
): Array<Item | Separator> =>
  items.flatMap(
    (item, index): Array<Item | Separator> => (index === 0 ? [item] : [separator, item]),
  )
