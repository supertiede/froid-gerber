import { openDB, type IDBPDatabase } from 'idb'

export type OutboxAction = {
  id: string          // UUID (cleClient)
  type: string        // 'arriver' | 'demarrerPause' | 'reprendreTravail' | 'terminerJournee' | 'demarrerIntervention' | 'terminerIntervention'
  payload: Record<string, unknown>
  createdAt: number   // Date.now()
  retries: number
}

let db: IDBPDatabase | null = null

async function getDb() {
  if (!db) {
    db = await openDB('froid-gerber-outbox', 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('actions')) {
          database.createObjectStore('actions', { keyPath: 'id' })
        }
      },
    })
  }
  return db
}

export async function enqueueAction(action: Omit<OutboxAction, 'retries'>): Promise<void> {
  const database = await getDb()
  await database.put('actions', { ...action, retries: 0 })
}

export async function getPendingActions(): Promise<OutboxAction[]> {
  const database = await getDb()
  const all = await database.getAll('actions')
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function removeAction(id: string): Promise<void> {
  const database = await getDb()
  await database.delete('actions', id)
}

export async function incrementRetry(id: string): Promise<void> {
  const database = await getDb()
  const action = await database.get('actions', id)
  if (action) {
    await database.put('actions', { ...action, retries: action.retries + 1 })
  }
}

export async function countPending(): Promise<number> {
  const database = await getDb()
  return database.count('actions')
}
