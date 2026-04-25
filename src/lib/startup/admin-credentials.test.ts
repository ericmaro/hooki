import { beforeEach, describe, expect, it, vi } from 'vitest'

import { syncSelfHostedAdminFromEnv } from './admin-credentials'
import type {
  AdminCredentialStore,
  SyncSelfHostedAdminFromEnvOptions,
} from './admin-credentials'

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn(),
  },
}))

vi.mock('@/lib/env', () => ({
  env: {
    HOOKI_MODE: 'self-hosted',
  },
}))

type StoredUser = {
  id: string
  email: string
  name: string
  emailVerified?: boolean
  role?: string
  updatedAt?: Date
}

type StoredAccount = {
  id: string
  userId: string
  accountId: string
  providerId: string
  password: string | null
  updatedAt?: Date
}

type StoredSession = {
  id: string
  userId: string
}

type MockStoreInput = {
  users?: Array<StoredUser>
  accounts?: Array<StoredAccount>
  sessions?: Array<StoredSession>
}

const fixedDate = new Date('2026-01-01T00:00:00.000Z')

function createMockContext(input: MockStoreInput = {}) {
  const users = [...(input.users ?? [])]
  const accounts = [...(input.accounts ?? [])]
  const sessions = [...(input.sessions ?? [])]
  const operations: Array<string> = []
  let nextId = 1
  let transactionCalls = 0

  const store: AdminCredentialStore = {
    listUsers(limit) {
      operations.push('listUsers')
      return Promise.resolve(
        users.slice(0, limit).map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
        })),
      )
    },
    createUser(user) {
      operations.push(`createUser:${user.id}`)
      users.push({ ...user })
      return Promise.resolve()
    },
    updateUser(userId, values) {
      operations.push(`updateUser:${userId}`)
      const user = users.find((candidate) => candidate.id === userId)

      if (!user) {
        throw new Error(`Missing test user ${userId}`)
      }

      Object.assign(user, values)
      return Promise.resolve()
    },
    findCredentialAccount(userId) {
      operations.push(`findCredentialAccount:${userId}`)
      const account = accounts.find(
        (candidate) =>
          candidate.userId === userId && candidate.providerId === 'credential',
      )

      return Promise.resolve(
        account ? { id: account.id, password: account.password } : null,
      )
    },
    createCredentialAccount(account) {
      operations.push(`createCredentialAccount:${account.userId}`)
      accounts.push({ ...account })
      return Promise.resolve()
    },
    updateCredentialAccount(accountId, values) {
      operations.push(`updateCredentialAccount:${accountId}`)
      const account = accounts.find((candidate) => candidate.id === accountId)

      if (!account) {
        throw new Error(`Missing test account ${accountId}`)
      }

      Object.assign(account, values)
      return Promise.resolve()
    },
    deleteUserSessions(userId) {
      operations.push(`deleteUserSessions:${userId}`)

      for (let index = sessions.length - 1; index >= 0; index -= 1) {
        if (sessions[index].userId === userId) {
          sessions.splice(index, 1)
        }
      }

      return Promise.resolve()
    },
  }

  const withTransaction: NonNullable<
    SyncSelfHostedAdminFromEnvOptions['withTransaction']
  > = (callback) => {
    transactionCalls += 1
    return callback(store)
  }
  const hashPassword = vi.fn((password: string) =>
    Promise.resolve(`hashed:${password}`),
  )
  const verifyPassword = vi.fn(
    ({ hash, password }: { hash: string; password: string }) =>
      Promise.resolve(hash === `hashed:${password}`),
  )
  const generateId = vi.fn(() => `id-${nextId++}`)
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
  }

  const options: Omit<SyncSelfHostedAdminFromEnvOptions, 'env'> = {
    logger,
    hashPassword,
    verifyPassword,
    generateId,
    now: () => fixedDate,
    withTransaction,
  }

  return {
    users,
    accounts,
    sessions,
    operations,
    hashPassword,
    verifyPassword,
    generateId,
    logger,
    withTransaction,
    get transactionCalls() {
      return transactionCalls
    },
    options,
  }
}

describe('syncSelfHostedAdminFromEnv', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a no-op when admin email and password are not configured', async () => {
    const context = createMockContext()

    const result = await syncSelfHostedAdminFromEnv({
      ...context.options,
      env: { HOOKI_MODE: 'self-hosted' },
    })

    expect(result).toEqual({ status: 'skipped', reason: 'not-configured' })
    expect(context.transactionCalls).toBe(0)
    expect(context.operations).toEqual([])
  })

  it('ignores admin env vars in cloud mode', async () => {
    const context = createMockContext()

    const result = await syncSelfHostedAdminFromEnv({
      ...context.options,
      env: {
        HOOKI_MODE: 'cloud',
        HOOKI_ADMIN_EMAIL: 'admin@example.com',
        HOOKI_ADMIN_PASSWORD: 'password123',
      },
    })

    expect(result).toEqual({ status: 'ignored', reason: 'cloud-mode' })
    expect(context.logger.warn).toHaveBeenCalledTimes(1)
    expect(context.transactionCalls).toBe(0)
  })

  it('creates the bootstrap user and credential account when no users exist', async () => {
    const context = createMockContext()

    const result = await syncSelfHostedAdminFromEnv({
      ...context.options,
      env: {
        HOOKI_MODE: 'self-hosted',
        HOOKI_ADMIN_EMAIL: ' Admin@Example.COM ',
        HOOKI_ADMIN_PASSWORD: 'password123',
        HOOKI_ADMIN_NAME: 'Root Admin',
      },
    })

    expect(result).toEqual({ status: 'created', userId: 'id-1' })
    expect(context.users).toEqual([
      {
        id: 'id-1',
        email: 'admin@example.com',
        name: 'Root Admin',
        emailVerified: false,
        role: 'user',
      },
    ])
    expect(context.accounts).toEqual([
      {
        id: 'id-2',
        userId: 'id-1',
        accountId: 'id-1',
        providerId: 'credential',
        password: 'hashed:password123',
      },
    ])
    expect(context.operations).toEqual([
      'listUsers',
      'createUser:id-1',
      'createCredentialAccount:id-1',
    ])
  })

  it('throws when bootstrapping the first user without both email and password', async () => {
    const context = createMockContext()

    await expect(
      syncSelfHostedAdminFromEnv({
        ...context.options,
        env: {
          HOOKI_MODE: 'self-hosted',
          HOOKI_ADMIN_EMAIL: 'admin@example.com',
        },
      }),
    ).rejects.toThrow('both required')

    expect(context.operations).toEqual(['listUsers'])
    expect(context.users).toEqual([])
    expect(context.accounts).toEqual([])
  })

  it("updates an existing user's email and revokes sessions", async () => {
    const context = createMockContext({
      users: [{ id: 'user-1', email: 'old@example.com', name: 'Admin' }],
      sessions: [{ id: 'session-1', userId: 'user-1' }],
    })

    const result = await syncSelfHostedAdminFromEnv({
      ...context.options,
      env: {
        HOOKI_MODE: 'self-hosted',
        HOOKI_ADMIN_EMAIL: 'new@example.com',
      },
    })

    expect(result).toEqual({
      status: 'updated',
      userId: 'user-1',
      emailChanged: true,
      nameChanged: false,
      passwordChanged: false,
    })
    expect(context.users[0]).toMatchObject({
      email: 'new@example.com',
      updatedAt: fixedDate,
    })
    expect(context.sessions).toEqual([])
    expect(context.hashPassword).not.toHaveBeenCalled()
    expect(context.operations).toEqual([
      'listUsers',
      'updateUser:user-1',
      'deleteUserSessions:user-1',
    ])
  })

  it('leaves a matching password hash unchanged', async () => {
    const context = createMockContext({
      users: [{ id: 'user-1', email: 'admin@example.com', name: 'Admin' }],
      accounts: [
        {
          id: 'account-1',
          userId: 'user-1',
          accountId: 'user-1',
          providerId: 'credential',
          password: 'hashed:password123',
        },
      ],
      sessions: [{ id: 'session-1', userId: 'user-1' }],
    })

    const result = await syncSelfHostedAdminFromEnv({
      ...context.options,
      env: {
        HOOKI_MODE: 'self-hosted',
        HOOKI_ADMIN_PASSWORD: 'password123',
      },
    })

    expect(result).toEqual({ status: 'unchanged', userId: 'user-1' })
    expect(context.verifyPassword).toHaveBeenCalledTimes(1)
    expect(context.hashPassword).not.toHaveBeenCalled()
    expect(context.sessions).toEqual([{ id: 'session-1', userId: 'user-1' }])
    expect(context.operations).toEqual([
      'listUsers',
      'findCredentialAccount:user-1',
    ])
  })

  it('updates a changed password hash and revokes sessions', async () => {
    const context = createMockContext({
      users: [{ id: 'user-1', email: 'admin@example.com', name: 'Admin' }],
      accounts: [
        {
          id: 'account-1',
          userId: 'user-1',
          accountId: 'user-1',
          providerId: 'credential',
          password: 'hashed:oldpass123',
        },
      ],
      sessions: [{ id: 'session-1', userId: 'user-1' }],
    })

    const result = await syncSelfHostedAdminFromEnv({
      ...context.options,
      env: {
        HOOKI_MODE: 'self-hosted',
        HOOKI_ADMIN_PASSWORD: 'newpass123',
      },
    })

    expect(result).toEqual({
      status: 'updated',
      userId: 'user-1',
      emailChanged: false,
      nameChanged: false,
      passwordChanged: true,
    })
    expect(context.accounts[0]).toMatchObject({
      password: 'hashed:newpass123',
      updatedAt: fixedDate,
    })
    expect(context.sessions).toEqual([])
    expect(context.operations).toEqual([
      'listUsers',
      'findCredentialAccount:user-1',
      'updateCredentialAccount:account-1',
      'deleteUserSessions:user-1',
    ])
  })

  it('creates a missing credential account for an existing user', async () => {
    const context = createMockContext({
      users: [{ id: 'user-1', email: 'admin@example.com', name: 'Admin' }],
      sessions: [{ id: 'session-1', userId: 'user-1' }],
    })

    const result = await syncSelfHostedAdminFromEnv({
      ...context.options,
      env: {
        HOOKI_MODE: 'self-hosted',
        HOOKI_ADMIN_PASSWORD: 'password123',
      },
    })

    expect(result).toEqual({
      status: 'updated',
      userId: 'user-1',
      emailChanged: false,
      nameChanged: false,
      passwordChanged: true,
    })
    expect(context.accounts).toEqual([
      {
        id: 'id-1',
        userId: 'user-1',
        accountId: 'user-1',
        providerId: 'credential',
        password: 'hashed:password123',
      },
    ])
    expect(context.sessions).toEqual([])
    expect(context.operations).toEqual([
      'listUsers',
      'findCredentialAccount:user-1',
      'createCredentialAccount:user-1',
      'deleteUserSessions:user-1',
    ])
  })

  it('throws when multiple self-hosted users exist', async () => {
    const context = createMockContext({
      users: [
        { id: 'user-1', email: 'one@example.com', name: 'One' },
        { id: 'user-2', email: 'two@example.com', name: 'Two' },
      ],
    })

    await expect(
      syncSelfHostedAdminFromEnv({
        ...context.options,
        env: {
          HOOKI_MODE: 'self-hosted',
          HOOKI_ADMIN_EMAIL: 'admin@example.com',
        },
      }),
    ).rejects.toThrow('multiple users')

    expect(context.operations).toEqual(['listUsers'])
    expect(context.users.map((user) => user.email)).toEqual([
      'one@example.com',
      'two@example.com',
    ])
  })
})
