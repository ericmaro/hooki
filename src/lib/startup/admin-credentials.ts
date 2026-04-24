import { generateId } from 'better-auth'
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { and, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { accounts, sessions, users } from '@/lib/db/schema'
import { env } from '@/lib/env'

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

type AdminCredentialEnv = {
  HOOKI_MODE?: 'cloud' | 'self-hosted'
  HOOKI_ADMIN_EMAIL?: string
  HOOKI_ADMIN_PASSWORD?: string
  HOOKI_ADMIN_NAME?: string
}

type AdminCredentialLogger = Pick<typeof console, 'info' | 'warn'>

type AdminUser = {
  id: string
  email: string
  name: string
}

type AdminCredentialAccount = {
  id: string
  password: string | null
}

type NewAdminUser = AdminUser & {
  emailVerified: boolean
  role: string
}

type AdminUserUpdate = {
  email?: string
  name?: string
  updatedAt: Date
}

type NewCredentialAccount = {
  id: string
  userId: string
  accountId: string
  providerId: 'credential'
  password: string
}

type CredentialAccountUpdate = {
  password: string
  updatedAt: Date
}

export type AdminCredentialStore = {
  listUsers: (limit: number) => Promise<Array<AdminUser>>
  createUser: (user: NewAdminUser) => Promise<void>
  updateUser: (userId: string, values: AdminUserUpdate) => Promise<void>
  findCredentialAccount: (
    userId: string,
  ) => Promise<AdminCredentialAccount | null>
  createCredentialAccount: (account: NewCredentialAccount) => Promise<void>
  updateCredentialAccount: (
    accountId: string,
    values: CredentialAccountUpdate,
  ) => Promise<void>
  deleteUserSessions: (userId: string) => Promise<void>
}

type WithAdminCredentialTransaction = <T>(
  callback: (store: AdminCredentialStore) => Promise<T>,
) => Promise<T>

export type SyncSelfHostedAdminFromEnvOptions = {
  env?: AdminCredentialEnv
  logger?: AdminCredentialLogger
  hashPassword?: (password: string) => Promise<string>
  verifyPassword?: (input: {
    hash: string
    password: string
  }) => Promise<boolean>
  generateId?: (size?: number) => string
  now?: () => Date
  withTransaction?: WithAdminCredentialTransaction
}

export type AdminCredentialSyncResult =
  | { status: 'skipped'; reason: 'not-configured' }
  | { status: 'ignored'; reason: 'cloud-mode' }
  | { status: 'created'; userId: string }
  | {
      status: 'updated'
      userId: string
      emailChanged: boolean
      nameChanged: boolean
      passwordChanged: boolean
    }
  | { status: 'unchanged'; userId: string }

type AdminCredentialConfig = {
  email?: string
  password?: string
  name?: string
}

type DrizzleExecutor = Pick<
  typeof db,
  'delete' | 'insert' | 'select' | 'update'
>

export async function syncSelfHostedAdminFromEnv(
  options: SyncSelfHostedAdminFromEnvOptions = {},
): Promise<AdminCredentialSyncResult> {
  const adminEnv = options.env ?? env
  const logger = options.logger ?? console

  const hasCredentialConfig =
    adminEnv.HOOKI_ADMIN_EMAIL !== undefined ||
    adminEnv.HOOKI_ADMIN_PASSWORD !== undefined

  if (!hasCredentialConfig) {
    return { status: 'skipped', reason: 'not-configured' }
  }

  if ((adminEnv.HOOKI_MODE ?? 'self-hosted') === 'cloud') {
    logger.warn('HOOKI_ADMIN_* is ignored when HOOKI_MODE=cloud.')
    return { status: 'ignored', reason: 'cloud-mode' }
  }

  const config = parseAdminCredentialConfig(adminEnv)
  const runInTransaction =
    options.withTransaction ?? createDefaultTransactionRunner()

  return runInTransaction(async (store) => {
    const existingUsers = await store.listUsers(2)

    if (existingUsers.length > 1) {
      throw new Error(
        'Cannot sync HOOKI_ADMIN_* in self-hosted mode because multiple users exist.',
      )
    }

    if (existingUsers.length === 0) {
      const result = await createBootstrapAdmin(store, config, options)
      logger.info('Created self-hosted admin user from HOOKI_ADMIN_*.')
      return result
    }

    const result = await updateExistingAdmin(
      store,
      existingUsers[0],
      config,
      options,
    )

    if (result.status === 'updated') {
      logger.info('Synchronized self-hosted admin user from HOOKI_ADMIN_*.')
    }

    return result
  })
}

function parseAdminCredentialConfig(
  adminEnv: AdminCredentialEnv,
): AdminCredentialConfig {
  const email = parseAdminEmail(adminEnv.HOOKI_ADMIN_EMAIL)
  const password = parseAdminPassword(adminEnv.HOOKI_ADMIN_PASSWORD)
  const name = parseAdminName(adminEnv.HOOKI_ADMIN_NAME)

  return { email, password, name }
}

function parseAdminEmail(rawEmail: string | undefined) {
  if (rawEmail === undefined) return undefined

  const email = rawEmail.trim().toLowerCase()

  if (!email) {
    throw new Error('HOOKI_ADMIN_EMAIL cannot be empty.')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('HOOKI_ADMIN_EMAIL must be a valid email address.')
  }

  return email
}

function parseAdminPassword(rawPassword: string | undefined) {
  if (rawPassword === undefined) return undefined

  if (
    rawPassword.length < MIN_PASSWORD_LENGTH ||
    rawPassword.length > MAX_PASSWORD_LENGTH
  ) {
    throw new Error(
      `HOOKI_ADMIN_PASSWORD must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`,
    )
  }

  return rawPassword
}

function parseAdminName(rawName: string | undefined) {
  if (rawName === undefined) return undefined

  const name = rawName.trim()

  if (!name) {
    throw new Error('HOOKI_ADMIN_NAME cannot be empty when provided.')
  }

  return name
}

async function createBootstrapAdmin(
  store: AdminCredentialStore,
  config: AdminCredentialConfig,
  options: SyncSelfHostedAdminFromEnvOptions,
): Promise<AdminCredentialSyncResult> {
  if (!config.email || !config.password) {
    throw new Error(
      'HOOKI_ADMIN_EMAIL and HOOKI_ADMIN_PASSWORD are both required when bootstrapping the first self-hosted user.',
    )
  }

  const getId = options.generateId ?? generateId
  const hash = options.hashPassword ?? hashPassword
  const userId = getId()

  await store.createUser({
    id: userId,
    name: config.name ?? 'Admin',
    email: config.email,
    emailVerified: false,
    role: 'user',
  })

  await store.createCredentialAccount({
    id: getId(),
    userId,
    accountId: userId,
    providerId: 'credential',
    password: await hash(config.password),
  })

  return { status: 'created', userId }
}

async function updateExistingAdmin(
  store: AdminCredentialStore,
  user: AdminUser,
  config: AdminCredentialConfig,
  options: SyncSelfHostedAdminFromEnvOptions,
): Promise<AdminCredentialSyncResult> {
  const now = options.now ?? (() => new Date())
  const userUpdates: Omit<AdminUserUpdate, 'updatedAt'> = {}
  let emailChanged = false
  let nameChanged = false
  let passwordChanged = false

  if (config.email && config.email !== user.email) {
    userUpdates.email = config.email
    emailChanged = true
  }

  if (config.name && config.name !== user.name) {
    userUpdates.name = config.name
    nameChanged = true
  }

  if (Object.keys(userUpdates).length > 0) {
    await store.updateUser(user.id, {
      ...userUpdates,
      updatedAt: now(),
    })
  }

  if (config.password) {
    passwordChanged = await syncPassword(
      store,
      user.id,
      config.password,
      options,
    )
  }

  if (emailChanged || passwordChanged) {
    await store.deleteUserSessions(user.id)
  }

  if (!emailChanged && !nameChanged && !passwordChanged) {
    return { status: 'unchanged', userId: user.id }
  }

  return {
    status: 'updated',
    userId: user.id,
    emailChanged,
    nameChanged,
    passwordChanged,
  }
}

async function syncPassword(
  store: AdminCredentialStore,
  userId: string,
  password: string,
  options: SyncSelfHostedAdminFromEnvOptions,
) {
  const account = await store.findCredentialAccount(userId)
  const hash = options.hashPassword ?? hashPassword
  const now = options.now ?? (() => new Date())

  if (account?.password) {
    const verify = options.verifyPassword ?? verifyPassword
    const passwordAlreadyMatches = await verifyCredentialPassword(
      verify,
      account.password,
      password,
    )

    if (passwordAlreadyMatches) {
      return false
    }

    await store.updateCredentialAccount(account.id, {
      password: await hash(password),
      updatedAt: now(),
    })
    return true
  }

  if (account) {
    await store.updateCredentialAccount(account.id, {
      password: await hash(password),
      updatedAt: now(),
    })
    return true
  }

  await store.createCredentialAccount({
    id: (options.generateId ?? generateId)(),
    userId,
    accountId: userId,
    providerId: 'credential',
    password: await hash(password),
  })

  return true
}

async function verifyCredentialPassword(
  verify: (input: { hash: string; password: string }) => Promise<boolean>,
  existingHash: string,
  password: string,
) {
  try {
    return await verify({ hash: existingHash, password })
  } catch {
    return false
  }
}

function createDefaultTransactionRunner(): WithAdminCredentialTransaction {
  return (callback) =>
    db.transaction((tx) =>
      callback(createDrizzleAdminCredentialStore(tx as DrizzleExecutor)),
    )
}

function createDrizzleAdminCredentialStore(
  tx: DrizzleExecutor,
): AdminCredentialStore {
  return {
    async listUsers(limit) {
      return tx
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
        })
        .from(users)
        .limit(limit)
    },
    async createUser(user) {
      await tx.insert(users).values(user)
    },
    async updateUser(userId, values) {
      await tx.update(users).set(values).where(eq(users.id, userId))
    },
    async findCredentialAccount(userId) {
      const matchingAccounts = await tx
        .select({
          id: accounts.id,
          password: accounts.password,
        })
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, userId),
            eq(accounts.providerId, 'credential'),
          ),
        )
        .limit(1)

      if (matchingAccounts.length === 0) {
        return null
      }

      return matchingAccounts[0]
    },
    async createCredentialAccount(account) {
      await tx.insert(accounts).values(account)
    },
    async updateCredentialAccount(accountId, values) {
      await tx.update(accounts).set(values).where(eq(accounts.id, accountId))
    },
    async deleteUserSessions(userId) {
      await tx.delete(sessions).where(eq(sessions.userId, userId))
    },
  }
}
