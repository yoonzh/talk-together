import { TursoClient } from './tursoClient'
import { logError } from '../../utils/logger'
// Node.js crypto 모듈은 브라우저에서 사용할 수 없으므로 간단한 해시 함수 구현
function createSimpleHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32비트 정수로 변환
  }
  return Math.abs(hash).toString(16)
}

export interface AIPredicateCache {
  id: number
  input_word: string
  ai_response: string[]
  model_name: string
  response_source: 'api' | 'local_fallback'
  response_hash: string
  created_at: string
  expires_at: string
  access_count: number
  last_accessed_at: string
}

export interface CacheStats {
  total_entries: number
  cache_hits_today: number
  cache_size_mb: number
  oldest_entry: string
  newest_entry: string
}

export class AIPredicateCacheService {
  private client: TursoClient
  private cacheDurationMonths: number = 3

  constructor(client: TursoClient) {
    this.client = client
  }

  async initialize(): Promise<void> {
    const settings = await this.client.getSettings()
    this.cacheDurationMonths = parseInt(settings.ai_cache_duration_months) || 3
    console.log(`⚙️ [AI Cache] 캐시 유지 기간: ${this.cacheDurationMonths}개월`)
  }

  private generateResponseHash(inputWord: string, response: string[], modelName: string): string {
    const content = `${inputWord}:${JSON.stringify(response)}:${modelName}`
    return createSimpleHash(content)
  }

  async getFromCache(inputWord: string): Promise<AIPredicateCache | null> {
    try {
      const result = await this.client.query(`
        SELECT * FROM ai_predicate_cache 
        WHERE input_word = ? 
          AND expires_at > datetime('now') 
          AND created_at > datetime('now', '-${this.cacheDurationMonths} months')
          AND response_source = 'api'
        ORDER BY created_at DESC 
        LIMIT 1
      `, [inputWord])

      if (result.rows.length === 0) {
        console.log(`🔍 [AI Cache] 캐시 미스: ${inputWord}`)
        return null
      }

      const row = result.rows[0]
      const cache: AIPredicateCache = {
        id: row.id as number,
        input_word: row.input_word as string,
        ai_response: JSON.parse(row.ai_response as string),
        model_name: row.model_name as string,
        response_source: row.response_source as 'api' | 'local_fallback',
        response_hash: row.response_hash as string,
        created_at: row.created_at as string,
        expires_at: row.expires_at as string,
        access_count: row.access_count as number,
        last_accessed_at: row.last_accessed_at as string
      }

      // 접근 횟수 및 시간 업데이트
      await this.updateAccessInfo(cache.id)
      
      console.log(`🎯 [AI Cache] 캐시 히트: ${inputWord} (모델: ${cache.model_name}, 접근: ${cache.access_count + 1}회)`)
      return cache

    } catch (error) {
      logError('AI 서술어 캐시 조회 실패', { inputWord, error })
      return null
    }
  }

  async saveToCache(
    inputWord: string, 
    aiResponse: string[], 
    modelName: string,
    isFromAPI: boolean = true
  ): Promise<void> {
    if (!isFromAPI) {
      console.log(`🚫 [AI Cache] 폴백 응답 캐시 제외: ${inputWord}`)
      return
    }

    try {
      const responseSource = 'api'
      const responseHash = this.generateResponseHash(inputWord, aiResponse, modelName)
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + this.cacheDurationMonths)

      // 중복 체크
      const existingResult = await this.client.query(
        'SELECT id FROM ai_predicate_cache WHERE response_hash = ?',
        [responseHash]
      )

      if (existingResult.rows.length > 0) {
        console.log(`⏭️ [AI Cache] 중복 응답 스킵: ${inputWord}`)
        return
      }

      await this.client.execute(`
        INSERT INTO ai_predicate_cache (
          input_word, ai_response, model_name, response_source, response_hash, 
          expires_at, access_count, last_accessed_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `, [
        inputWord,
        JSON.stringify(aiResponse),
        modelName,
        responseSource,
        responseHash,
        expiresAt.toISOString()
      ])

      console.log(`💾 [AI Cache] 캐시 저장: ${inputWord} (모델: ${modelName}, 응답: ${aiResponse.length}개)`)

      // 캐시 크기 관리
      await this.manageCacheSize()

    } catch (error) {
      logError('AI 서술어 캐시 저장 실패', { inputWord, modelName, error })
    }
  }

  private async updateAccessInfo(cacheId: number): Promise<void> {
    try {
      await this.client.execute(`
        UPDATE ai_predicate_cache 
        SET access_count = access_count + 1, 
            last_accessed_at = datetime('now')
        WHERE id = ?
      `, [cacheId])
    } catch (error) {
      logError('캐시 접근 정보 업데이트 실패', { cacheId, error })
    }
  }

  async cleanExpiredCache(): Promise<number> {
    try {
      const result = await this.client.execute(`
        DELETE FROM ai_predicate_cache 
        WHERE expires_at <= datetime('now') 
           OR created_at <= datetime('now', '-${this.cacheDurationMonths} months')
      `)

      const deletedCount = result.rowsAffected || 0
      if (deletedCount > 0) {
        console.log(`🗑️ [AI Cache] 만료된 캐시 정리: ${deletedCount}개 삭제`)
      }

      return deletedCount
    } catch (error) {
      logError('만료된 AI 캐시 정리 실패', error)
      return 0
    }
  }

  private async manageCacheSize(): Promise<void> {
    try {
      // 캐시 엔트리 수 확인
      const countResult = await this.client.query('SELECT COUNT(*) as count FROM ai_predicate_cache')
      const totalEntries = countResult.rows[0].count as number

      // 1000개 이상이면 오래된 것부터 삭제 (LRU 방식)
      if (totalEntries > 1000) {
        const deleteResult = await this.client.execute(`
          DELETE FROM ai_predicate_cache 
          WHERE id IN (
            SELECT id FROM ai_predicate_cache 
            ORDER BY last_accessed_at ASC, access_count ASC 
            LIMIT ?
          )
        `, [totalEntries - 800]) // 800개까지 유지

        console.log(`📊 [AI Cache] 크기 관리: ${deleteResult.rowsAffected}개 삭제 (전체: ${totalEntries}개)`)
      }
    } catch (error) {
      logError('AI 캐시 크기 관리 실패', error)
    }
  }

  async getCacheStats(): Promise<CacheStats> {
    try {
      const [totalResult, todayHitsResult, sizeResult, datesResult] = await Promise.all([
        this.client.query('SELECT COUNT(*) as count FROM ai_predicate_cache'),
        this.client.query(`
          SELECT COUNT(*) as hits FROM ai_predicate_cache 
          WHERE last_accessed_at >= date('now')
        `),
        this.client.query(`
          SELECT SUM(LENGTH(ai_response)) / 1024.0 / 1024.0 as size_mb 
          FROM ai_predicate_cache
        `),
        this.client.query(`
          SELECT 
            MIN(created_at) as oldest,
            MAX(created_at) as newest
          FROM ai_predicate_cache
        `)
      ])

      return {
        total_entries: totalResult.rows[0].count as number,
        cache_hits_today: todayHitsResult.rows[0].hits as number,
        cache_size_mb: Math.round((sizeResult.rows[0].size_mb as number || 0) * 100) / 100,
        oldest_entry: datesResult.rows[0].oldest as string || '',
        newest_entry: datesResult.rows[0].newest as string || ''
      }
    } catch (error) {
      logError('AI 캐시 통계 조회 실패', error)
      return {
        total_entries: 0,
        cache_hits_today: 0,
        cache_size_mb: 0,
        oldest_entry: '',
        newest_entry: ''
      }
    }
  }

  async logCacheOperation(
    operation: 'hit' | 'miss' | 'save' | 'skip',
    inputWord: string,
    details?: any
  ): Promise<void> {
    try {
      await this.client.execute(`
        INSERT INTO usage_logs (
          action_type, input_data, response_data, cache_hit, 
          cache_eligible, created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [
        'ai_cache_' + operation,
        inputWord,
        JSON.stringify(details || {}),
        operation === 'hit',
        operation !== 'skip'
      ])
    } catch (error) {
      // 로그 실패는 중요하지 않으므로 에러를 던지지 않음
      console.warn('캐시 로그 기록 실패:', error)
    }
  }

  async getPopularWords(limit: number = 10): Promise<Array<{word: string, count: number}>> {
    try {
      const result = await this.client.query(`
        SELECT input_word as word, SUM(access_count) as count
        FROM ai_predicate_cache
        WHERE response_source = 'api'
        GROUP BY input_word
        ORDER BY count DESC
        LIMIT ?
      `, [limit])

      return result.rows.map(row => ({
        word: row.word as string,
        count: row.count as number
      }))
    } catch (error) {
      logError('인기 단어 조회 실패', error)
      return []
    }
  }
}