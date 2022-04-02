
// eslint-disable-next-line @typescript-eslint/no-var-requires
export default process.env.Server ? undefined : require('@project-serum/sol-wallet-adapter').default
