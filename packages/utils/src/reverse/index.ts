const {reverse: _reverse} = Array.prototype

export const reverse = <T>(list: T[]) => _reverse.call([...list])
