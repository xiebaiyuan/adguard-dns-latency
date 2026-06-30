import type { QueryLogEntry } from 'shared'

export interface AdguardConfig {
  baseUrl: string
  username: string
  password: string
  rejectUnauthorized: boolean
}

/** Raw entry from AdGuardHome that includes the time field */
export interface RawFetchedEntry extends QueryLogEntry {
  time: string
}

interface AdguardApiResponse {
  oldest?: string
  data: ApiLogEntry[]
}

interface ApiLogEntry {
  time: string
  question: { name: string; type: string }
  elapsedMs: string
  cached: boolean
  upstream: string
  status: string
}

const PAGE_SIZE = 500
const MAX_ENTRIES = 100_000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Fetch query log entries from AdGuardHome using cursor-based pagination.
 * Uses the response `oldest` field as the `older_than` parameter for the next page,
 * which is the officially recommended pagination method per the OpenAPI spec.
 */
export async function fetchQueryLog(config: AdguardConfig): Promise<RawFetchedEntry[]> {
  const baseUrl = config.baseUrl.replace(/\/$/, '')
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64')

  const allEntries: RawFetchedEntry[] = []
  let olderThan: string | undefined
  let pages = 0
  const cutoff = new Date(Date.now() - ONE_DAY_MS)

  while (true) {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
    if (olderThan) params.set('older_than', olderThan)

    const url = `${baseUrl}/control/querylog?${params}`
    const res = await fetch(url, {
      headers: {
        authorization: `Basic ${auth}`,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`AdGuardHome API error ${res.status}: ${body.slice(0, 200)}`)
    }

    const json = (await res.json()) as AdguardApiResponse
    const data = json.data ?? []
    const oldest = json.oldest

    pages++

    if (data.length === 0) {
      console.log(`[DEBUG] pagination done: empty page after ${allEntries.length} entries (${pages} pages)`)
      break
    }

    // Debug first page
    if (pages === 1) {
      console.log(`[DEBUG] first page: ${data.length} entries, oldest=${oldest}, cutoff=${cutoff.toISOString()}`)
      if (data.length > 0) {
        console.log('[DEBUG] sample cached field:', JSON.stringify(data.slice(0, 3).map((e: any) => ({
          domain: e.question?.name,
          cached: e.cached,
          cachedType: typeof e.cached,
        }))))
      }
      console.log('[DEBUG] first entry time:', data[0].time, 'last entry time:', data[data.length - 1].time)
    }

    for (const entry of data) {
      allEntries.push({
        elapsedMs: parseFloat(entry.elapsedMs),
        cached: entry.cached,
        upstream: entry.upstream ?? '',
        status: entry.status ?? '',
        question: { name: entry.question.name, type: entry.question.type },
        time: entry.time,
      })
    }

    // Safety cap
    if (allEntries.length >= MAX_ENTRIES) {
      console.log(`[DEBUG] pagination stopped: reached max ${MAX_ENTRIES} entries`)
      break
    }

    // Use the response `oldest` field as the cursor for the next page (official method)
    if (oldest) {
      // Check if oldest is past our 24h cutoff
      if (new Date(oldest) < cutoff) {
        // Still include this page's data - it might span the cutoff
        break
      }
      olderThan = oldest
    } else {
      console.log('[DEBUG] pagination stopped: no oldest field in response')
      break
    }
  }

  console.log(`[DEBUG] fetch complete: ${allEntries.length} entries in ${pages} pages`)
  return allEntries
}
