import { useState, useEffect, useCallback, useRef } from 'react'
import type { DomainStats, LatencyStats } from '../lib/types'

const API_BASE = ''

export interface DashboardPayload {
  ready: boolean
  timeRange: { start: string; end: string } | null
  lastUpdated: string | null
  lastError: string | null
  adguardUrl: string | null
  domainCount: number
  aggregate: {
    totalCount: number
    totalCached: number
    overallCacheRate: number
    overallUncached: LatencyStats | null
    overallAll: LatencyStats | null
  }
  queryTypeDistribution: Array<{ name: string; value: number }>
  domains: DomainStats[]
}

interface UseAnalysisResult {
  loading: boolean
  error: string | null
  data: DashboardPayload | null
  refresh: () => Promise<void>
  refreshing: boolean
}

function autoRefresh(): Promise<void> {
  const url = localStorage.getItem('adgh_url')
  const user = localStorage.getItem('adgh_user')
  const pass = localStorage.getItem('adgh_pass')
  const timeHours = localStorage.getItem('adgh_time_hours')
  if (!url || !user || !pass) return Promise.resolve()

  const cfg: Record<string, unknown> = {
    baseUrl: url.replace(/\/$/, ''),
    username: user,
    password: pass,
    rejectUnauthorized: false,
  }
  if (timeHours) cfg.timeRangeHours = parseInt(timeHours, 10)

  return fetch(`${API_BASE}/api/config`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ adguardConfig: cfg }),
  })
    .then(() => fetch(`${API_BASE}/api/analysis/refresh`, { method: 'POST' }))
    .then(() => {/* done */})
    .catch(() => {/* ignore */})
}

export function useAnalysis(): UseAnalysisResult {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardPayload | null>(null)
  const autoRefreshed = useRef(false)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analysis/dashboard`)
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const d = await res.json() as DashboardPayload

      // 报告后端记录的错误
      if (d.lastError) {
        setError(d.lastError)
      } else {
        setError(null)
      }

      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : '连接后端失败')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const doRefresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/analysis/refresh`, { method: 'POST' })
      if (!res.ok) throw new Error(`刷新失败: ${res.status}`)

      // 指数退避轮询：1s → 2s → 2s → 2s, 最多 15 次
      for (let i = 0, wait = 1000; i < 15; i++) {
        await new Promise(r => setTimeout(r, wait))
        wait = i === 0 ? 2000 : wait
        const sRes = await fetch(`${API_BASE}/api/analysis/summary`)
        const s = await sRes.json() as { ready: boolean; lastError: string | null }
        if (s.lastError) {
          setError(s.lastError)
          setRefreshing(false)
          return
        }
        if (s.ready) break
      }

      await fetchDashboard()
    } catch (e) {
      setError(e instanceof Error ? e.message : '刷新失败')
      setRefreshing(false)
    }
  }, [fetchDashboard])

  // Initial load: fetch dashboard, then auto-restore + refresh if configured
  useEffect(() => {
    const init = async () => {
      await fetchDashboard()
      if (!autoRefreshed.current && localStorage.getItem('adgh_url')) {
        autoRefreshed.current = true
        setLoading(true)
        await autoRefresh()
        // 轮询等待刷新完成
        for (let i = 0, wait = 1000; i < 15; i++) {
          await new Promise(r => setTimeout(r, wait))
          wait = i === 0 ? 2000 : wait
          const sRes = await fetch(`${API_BASE}/api/analysis/summary`)
          const s = await sRes.json() as { ready: boolean; lastError: string | null }
          if (s.ready || s.lastError) break
        }
        await fetchDashboard()
      }
    }
    init()
  }, [fetchDashboard])

  return { loading, error, data, refresh: doRefresh, refreshing }
}
