/* eslint-disable no-magic-numbers,no-bitwise,id-length,import/no-named-as-default,import/no-named-as-default-member */
import {arrayify, concat, hexlify} from '@ethersproject/bytes'
import {
  getPassword,
  looseArrayify,
  uuidV4,
} from '@ethersproject/json-wallets/src.ts/utils'
import {keccak256} from '@ethersproject/keccak256'
import {randomBytes} from '@ethersproject/random'
import {Keypair} from '@solana/web3.js'
import aes from 'aes-js'
import {utils} from 'ethers'
import scrypt from 'scrypt-js'

export const encryptKeypair = async (
  keypair: Keypair,
  password,
  progressCallback?: (value: number) => any,
): Promise<JsonKeyPairData> => {
  // eslint-disable-next-line no-magic-numbers
  const salt = utils.randomBytes(32)
  const iv = utils.randomBytes(16)
  const n = 1 << 17
  const r = 8
  const p = 1
  const dklen = 32
  const passwordBytes = getPassword(password)
  // eslint-disable-next-line import/no-named-as-default-member
  const _key = await scrypt.scrypt(passwordBytes, salt, n, r, p, dklen, progressCallback)
  const key = arrayify(_key)
  const derivedKey = key.slice(0, 16)
  const macPrefix = key.slice(16, 32)
  const counter = new aes.Counter(iv)
  const aesCtr = new aes.ModeOfOperation.ctr(derivedKey, counter)
  const ciphertext = arrayify(aesCtr.encrypt(keypair.secretKey))
  const mac = keccak256(concat([macPrefix, ciphertext]))
  const uuidRandom = randomBytes(16)
  return {
    Crypto: {
      cipher: 'aes-128-ctr',
      cipherparams: {
        iv: hexlify(iv).slice(2),
      },
      ciphertext: hexlify(ciphertext).slice(2),
      kdf: 'scrypt',
      kdfparams: {
        dklen,
        n: n,
        p: p,
        r: r,
        salt: hexlify(salt).slice(2),
      },
      mac: mac.slice(2),
    },
    address: hexlify(keypair.publicKey.toBytes()).slice(2).toLowerCase(),
    id: uuidV4(uuidRandom),
    version: 3,
  }
}

export interface JsonKeyPairData {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Crypto: {
    cipher: string
    cipherparams: {
      iv: string
    }
    ciphertext: string
    kdf: 'scrypt'
    kdfparams: {
      dklen: number
      n: number
      p: number
      r: number
      salt: string
    }
    mac: string
  }
  address: string
  id: string
  version: number
}

// eslint-disable-next-line max-statements
export const decryptKeypair = async (
  data: JsonKeyPairData,
  password: string,
  progressCallback?: (value: number) => any,
): Promise<Keypair | undefined> => {
  const passwordBytes = getPassword(password)
  const {Crypto, address} = data
  const {kdf, kdfparams, mac, cipher, cipherparams} = Crypto
  if (kdf !== 'scrypt') {
    return
  }
  const ciphertext = looseArrayify(Crypto.ciphertext)
  const salt = looseArrayify(kdfparams.salt)
  const iv = looseArrayify(cipherparams.iv)
  const {n, r, p, dklen} = kdfparams
  const key = await scrypt.scrypt(passwordBytes, salt, n, r, p, dklen, progressCallback)
  const derivedKey = key.slice(0, 16)
  const macPrefix = key.slice(16, 32)
  const computedMAC = hexlify(keccak256(concat([macPrefix, ciphertext]))).slice(2)
  if (computedMAC !== mac) {
    return
  }
  if (cipher !== 'aes-128-ctr') {
    return
  }
  const counter = new aes.Counter(iv)
  const aesCtr = new aes.ModeOfOperation.ctr(derivedKey, counter)
  const secretKey = arrayify(aesCtr.decrypt(ciphertext))
  const publicKey = utils.toUtf8Bytes(`0x${address}`)
  return new Keypair({
    publicKey,
    secretKey,
  })
}
