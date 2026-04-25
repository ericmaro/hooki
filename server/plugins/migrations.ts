import { definePlugin } from 'nitro'
import { runMigrations } from '../../src/lib/db/migrate'
import { syncSelfHostedAdminFromEnv } from '../../src/lib/startup/admin-credentials'

export default definePlugin(async () => {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return
  }

  try {
    await runMigrations()
    await syncSelfHostedAdminFromEnv()
  } catch (error) {
    console.error('Failed to complete startup database tasks:', error)
    throw error
  }
})
