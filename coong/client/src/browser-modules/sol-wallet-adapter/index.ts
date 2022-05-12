
// eslint-disable-next-line @typescript-eslint/no-var-requires
export default process.env.SERVER ? undefined : require('@project-serum/sol-wallet-adapter').default
