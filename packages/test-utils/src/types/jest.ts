export type Mock<Func extends (...args: any[]) => any> = jest.Mock<
  ReturnType<Func>,
  Parameters<Func>
>
