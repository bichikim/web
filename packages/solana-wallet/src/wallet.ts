/* eslint-disable id-length,no-magic-numbers */
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
import {utils} from 'ethers'
import {Socket} from 'net'
import {Account, Wallet, WalletItemTypes} from 'src/types'
import nacl from 'tweetnacl'
import {computed, reactive, ref, UnwrapNestedRefs} from 'vue'
import {decryptKeypair, encryptKeypair} from './json-wallet'

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
): Wallet<SolanaWalletItemTypes> => {
  const arraySize = 32
  const {saveKey = 'winter-love--solana-wallet'} = options
  const keypairRef = ref<Keypair | undefined>()
  const mnemonicPhraseRef = ref<string | undefined>()
  const providerRef = ref(provider)

  /**
   * connection by provider
   */
  const connectionRef = computed(() => {
    const provider = providerRef.value
    if (provider) {
      return new Connection(clusterApiUrl(provider), 'confirmed')
    }
    return new Connection(clusterApiUrl('devnet'), 'confirmed')
  })

  const createAccount = () => {
    const randomBytes = utils.randomBytes(arraySize)
    const mnemonic = utils.entropyToMnemonic(randomBytes)
    const seed = utils.mnemonicToSeed(mnemonic, '')
    const keypair = Keypair.fromSeed(utils.toUtf8Bytes(seed).slice(0, arraySize))
    mnemonicPhraseRef.value = mnemonic
    keypairRef.value = keypair
    return getAccounts(keypair)
  }

  const createContract = () => {
    // https://medium.com/@lianxiongdi/solana-development-7-how-to-interact-with-smart-contract-938c46433b43
    const keypair = keypairRef.value
    if (!keypair) {
      return Promise.resolve()
    }
    // todo wip
    // noinspection JSUnusedLocalSymbols
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const transaction = new Transaction()
  }

  const loadAccount = async (password: string, progress?: (value: number) => any) => {
    if (typeof globalThis.localStorage !== 'object') {
      return
    }
    const jsonString = globalThis.localStorage.getItem(saveKey)
    if (typeof jsonString === 'string') {
      const keypair = await decryptKeypair(JSON.parse(jsonString), password, progress)
      if (keypair) {
        keypairRef.value = keypair
        return getAccounts(keypair)
      }
    }
  }

  const saveAccount = async (password: string, progress?: (value: number) => any) => {
    const keypair = keypairRef.value
    if (!keypair) {
      return
    }
    if (typeof globalThis.localStorage === 'object') {
      const data = await encryptKeypair(keypair, password, progress)
      globalThis.localStorage.setItem(saveKey, JSON.stringify(data))
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
    transaction.add(SystemProgram.transfer(transactionParams))
    return sendAndConfirmTransaction(connection, transaction, [keypair])
  }

  const sign = (message: string) => {
    const keypair = keypairRef.value
    if (!keypair) {
      return Promise.resolve()
    }
    const messageBytes = utils.toUtf8Bytes(message)

    // eslint-disable-next-line import/no-named-as-default-member
    return Promise.resolve(
      utils.hexlify(nacl.sign.detached(messageBytes, keypair.secretKey)),
    )
  }

  const restoreAccount = (mnemonic: string) => {
    const seed = utils.mnemonicToSeed(mnemonic, '')
    const keypair = Keypair.fromSeed(utils.toUtf8Bytes(seed).slice(0, arraySize))
    keypairRef.value = keypair
    return getAccounts(keypair)
  }

  const accountAddressRef = computed(() => {
    return keypairRef.value?.publicKey.toString()
  })

  return reactive({
    accountAddress: accountAddressRef as any,
    createAccount,
    createContract,
    loadAccount,
    mnemonicPhrase: mnemonicPhraseRef as any,
    provider: providerRef,
    restoreAccount,
    saveAccount,
    sendTransaction,
    sign,
  })
}
