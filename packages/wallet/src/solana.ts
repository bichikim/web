import {entropyToMnemonic, mnemonicToEntropy} from '@ethersproject/hdnode'
import {decryptKeystore, encryptKeystore} from '@ethersproject/json-wallets'
import {
  Cluster,
  clusterApiUrl,
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionSignature,
  TransferParams,
  TransferWithSeedParams,
} from '@solana/web3.js'
import {computed, reactive, ref, UnwrapNestedRefs} from '@vue/reactivity'
import {utils} from 'ethers'
import {Socket} from 'net'
import {Account, Wallet, WalletItemTypes} from 'src/types'
import nacl from 'tweetnacl'
import {createEvents} from './events'

export interface CreateSolanaWalletOptions {
  saveKey?: string
}

export interface SolanaWalletItemTypes extends WalletItemTypes {
  privateKey: Uint8Array
  transaction: TransferWithSeedParams | TransferParams
  transactionResponse: TransactionSignature
}

const getAccounts = (keypair: Keypair): Account<Uint8Array> => {
  return {
    address: keypair.publicKey.toString(),
    privateKey: keypair.secretKey,
  }
}

// eslint-disable-next-line max-lines-per-function
export const createSolanaWallet = (
  provider?: Cluster,
  net?: Socket,
  options: CreateSolanaWalletOptions = {},
): UnwrapNestedRefs<Wallet<SolanaWalletItemTypes>> => {
  const events = createEvents()
  const {saveKey = 'winter-love--solana-wallet'} = options
  const keypairRef = ref<Keypair | undefined>()
  const mnemonicPhraseRef = ref<string | undefined>()
  const providerRef = ref(provider)
  const connectionRef = computed(() => {
    const provider = providerRef.value
    if (provider) {
      return new Connection(clusterApiUrl(provider), 'confirmed')
    }
    return new Connection(clusterApiUrl('devnet'), 'confirmed')
  })

  const createAccount = () => {
    const textDecoder = new TextDecoder()
    const keypair = Keypair.generate()
    mnemonicPhraseRef.value = entropyToMnemonic(textDecoder.decode(keypair.secretKey))
    keypairRef.value = keypair
    return getAccounts(keypair)
  }

  const createContract = () => {
    console.warn('todo I need to code')
    const keypair = keypairRef.value
    if (!keypair) {
      return Promise.resolve()
    }
    const transaction = new Transaction()
  }

  const loadAccount = async (password: string, progress?: (value: number) => any) => {
    if (typeof globalThis.localStorage !== 'object') {
      return
    }
    const jsonString = globalThis.localStorage.getItem(saveKey)
    if (typeof jsonString === 'string') {
      const textEncoder = new TextEncoder()
      const keyStore = await decryptKeystore(jsonString, password, progress)
      const keypair = new Keypair({
        publicKey: textEncoder.encode(keyStore.address),
        secretKey: textEncoder.encode(keyStore.privateKey),
      })
      keypairRef.value = keypair
      return getAccounts(keypair)
    }
  }

  const saveAccount = async (password: string, progress?: (value: number) => any) => {
    const keypair = keypairRef.value
    if (!keypair) {
      return
    }
    if (typeof globalThis.localStorage === 'object') {
      const textDecoder = new TextDecoder()
      const jsonString = await encryptKeystore({
        address: keypair.publicKey.toString(),
        privateKey: textDecoder.decode(keypair.secretKey),
      }, password, undefined, progress)
      globalThis.localStorage.setItem(saveKey, jsonString)
      return getAccounts(keypair)
    }
  }

  const sendTransaction = (transactionParams) => {
    const keypair = keypairRef.value
    if (!keypair) {
      return Promise.resolve()
    }
    const connection = connectionRef.value
    const transaction = new Transaction()
    transaction.add(
      SystemProgram.transfer(transactionParams),
    )
    return sendAndConfirmTransaction(connection, transaction, [keypair])
  }

  const sign = (message: string) => {
    const keypair = keypairRef.value
    if (!keypair) {
      return Promise.resolve()
    }
    const messageBytes = utils.toUtf8Bytes(message)

    const textDecoder = new TextDecoder()

    // eslint-disable-next-line import/no-named-as-default-member
    return Promise.resolve(textDecoder.decode(nacl.sign.detached(messageBytes, keypair.secretKey)))
  }

  const restoreAccount = (mnemonic: string) => {
    const textEncoder = new TextEncoder()
    const secretKey = mnemonicToEntropy(mnemonic)
    const keypair = Keypair.fromSecretKey(textEncoder.encode(secretKey))
    keypairRef.value = keypair
    return getAccounts(keypair)
  }

  const accountAddressRef = computed(() => {
    return keypairRef.value?.publicKey.toString()
  })

  return reactive({
    ...events,
    accountAddress: accountAddressRef,
    createAccount,
    createContract,
    loadAccount,
    mnemonicPhrase: mnemonicPhraseRef,
    provider: providerRef,
    restoreAccount,
    saveAccount,
    sendTransaction,
    sign,
  })
}
