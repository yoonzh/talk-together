// Enhanced Cache Service for Evaluated Responses Only
// AIDEV-NOTE: 평가 완료된 응답만 캐시하는 향상된 캐시 시스템

import { 
  PredicateCandidate, 
  EvaluatedPredicates
} from '../utils/types/aiTypes'
import { 
  CacheQueryResult,
  CacheSourceResponses,
  CachePerformanceReport,
  CacheConfig,
  CacheCleanupResult
} from '../utils/types/cacheTypes'

// 임시로 기존 DB 클라이언트 import (실제 구현에서는 enhanced DB 스키마 사용)
import { getTursoClient } from '../database/tursoClient'

export class EvaluatedCacheService {
  private static instance: EvaluatedCacheService
  
  private config: CacheConfig = {
    maxEntries: 1000,
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    defaultExpiryMonths: 3,
    cleanupIntervalHours: 24,
    enableCompression: true,
    enableMigration: true,
    migrationBatchSize: 50,
    validateOnRead: true,
    enableMetrics: true
  }
  
  private metrics = {
    hits: 0,
    misses: 0,
    writes: 0,
    errors: 0,
    totalSize: 0
  }
  
  private constructor() {
    console.log('💾 [EvaluatedCache] 향상된 캐시 시스템 초기화 완료')
    
    // 주기적 정리 작업 시작
    if (this.config.cleanupIntervalHours > 0) {
      this.startPeriodicCleanup()
    }
  }
  
  public static getInstance(): EvaluatedCacheService {
    if (!EvaluatedCacheService.instance) {
      EvaluatedCacheService.instance = new EvaluatedCacheService()
    }
    return EvaluatedCacheService.instance
  }
  
  // 평가 완료된 결과 캐시 저장
  public async cacheEvaluatedResult(
    inputWord: string,
    originalResponses: CacheSourceResponses,
    evaluatedResult: EvaluatedPredicates
  ): Promise<void> {
    try {
      const client = await getTursoClient()
      
      // 응답 해시 생성 (중복 방지)
      const responseHash = this.generateResponseHash(inputWord, evaluatedResult.predicates)
      
      // 만료일 계산
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + this.config.defaultExpiryMonths)
      
      const cacheEntry = {
        input_word: inputWord,
        evaluation_result: JSON.stringify(evaluatedResult.predicates),
        source_responses: JSON.stringify(originalResponses),
        evaluation_metadata: JSON.stringify(evaluatedResult.evaluationMeta),
        openai_model: 'gpt-3.5-turbo',
        gemini_model: 'gemini-2.5-flash-lite',
        evaluator_model: 'gpt-4o',
        response_hash: responseHash,
        expires_at: expiresAt.toISOString(),
        access_count: 1,
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
      }
      
      // 임시: 기존 테이블에 저장 (실제로는 새로운 enhanced 테이블 사용)
      const responseJson = JSON.stringify(evaluatedResult.predicates)
      
      await client.execute(`
        INSERT OR REPLACE INTO ai_predicate_cache 
        (input_word, ai_response, model_name, response_source, response_hash, created_at, expires_at, access_count, last_accessed_at)
        VALUES (
          '${cacheEntry.input_word}', 
          '${responseJson}', 
          'enhanced-evaluation-system', 
          'evaluated', 
          '${cacheEntry.response_hash}', 
          '${cacheEntry.created_at}', 
          '${cacheEntry.expires_at}', 
          ${cacheEntry.access_count}, 
          '${cacheEntry.last_accessed_at}'
        )
      `)
      
      this.metrics.writes++
      console.log(`💾 [EvaluatedCache] 평가 완료 결과 캐시 저장: "${inputWord}"`)
      
    } catch (error) {
      this.metrics.errors++
      console.error('❌ [EvaluatedCache] 캐시 저장 실패:', error)
      throw error
    }
  }
  
  // 평가 완료된 캐시 조회
  public async getEvaluatedFromCache(inputWord: string): Promise<CacheQueryResult> {
    try {
      const client = await getTursoClient()
      
      const result = await client.execute(`
        SELECT * FROM ai_predicate_cache 
        WHERE input_word = '${inputWord}' 
        AND response_source = 'evaluated'
        AND (expires_at IS NULL OR expires_at > datetime('now'))
        ORDER BY created_at DESC
        LIMIT 1
      `)
      
      if (result.rows.length === 0) {
        this.metrics.misses++
        console.log(`🔍 [EvaluatedCache] 캐시 미스: "${inputWord}"`)
        return { found: false }
      }
      
      const row = result.rows[0]
      
      // 검증 활성화 시 데이터 유효성 확인
      if (this.config.validateOnRead) {
        const validation = this.validateCacheEntry(row)
        if (!validation.isValid) {
          console.warn(`⚠️ [EvaluatedCache] 유효하지 않은 캐시 항목: ${validation.errors.join(', ')}`)
          this.metrics.errors++
          return { found: false }
        }
      }
      
      // 접근 횟수 업데이트
      await this.updateAccessCount(row.id as number)
      
      const predicates = JSON.parse(row.ai_response as string) as PredicateCandidate[]
      
      this.metrics.hits++
      console.log(`🎯 [EvaluatedCache] 평가 완료 캐시 적중: "${inputWord}"`)
      
      return {
        found: true,
        entry: row as any,
        predicates
      }
      
    } catch (error) {
      this.metrics.errors++
      console.error('❌ [EvaluatedCache] 캐시 조회 실패:', error)
      return { found: false }
    }
  }
  
  // 캐시 성능 분석
  public getCachePerformance(): CachePerformanceReport {
    const total = this.metrics.hits + this.metrics.misses
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0
    
    let recommendation = '시스템이 정상 작동 중입니다.'
    
    if (hitRate < 50) {
      recommendation = '캐시 적중률이 낮습니다. 사용 패턴을 확인하세요.'
    } else if (hitRate > 80) {
      recommendation = '우수한 캐시 성능을 보이고 있습니다.'
    }
    
    return {
      totalRequests: total,
      hitRate: Math.round(hitRate * 100) / 100,
      evaluatedCacheUsage: this.metrics.hits,
      legacyCacheUsage: 0, // 평가 완료 캐시만 사용
      averageResponseTime: 0, // 실제 구현에서 측정
      recommendation
    }
  }
  
  // 캐시 정리
  public async cleanupCache(): Promise<CacheCleanupResult> {
    try {
      const client = await getTursoClient()
      
      // 1. 만료된 항목 삭제
      const expiredResult = await client.execute(`
        DELETE FROM ai_predicate_cache 
        WHERE expires_at IS NOT NULL 
        AND expires_at < datetime('now')
      `)
      
      // 2. 접근 빈도가 낮은 항목 삭제 (1000개 초과 시)
      const countResult = await client.execute(`
        SELECT COUNT(*) as count FROM ai_predicate_cache
      `)
      
      const totalCount = countResult.rows[0].count as number
      let lowAccessRemoved = 0
      
      if (totalCount > this.config.maxEntries) {
        const excessCount = totalCount - Math.floor(this.config.maxEntries * 0.8) // 80%로 줄임
        
        const lowAccessResult = await client.execute(`
          DELETE FROM ai_predicate_cache 
          WHERE id IN (
            SELECT id FROM ai_predicate_cache 
            ORDER BY access_count ASC, last_accessed_at ASC 
            LIMIT ${excessCount}
          )
        `)
        
        lowAccessRemoved = lowAccessResult.rowsAffected
      }
      
      // 3. 남은 항목 수 계산
      const remainingResult = await client.execute(`
        SELECT COUNT(*) as count FROM ai_predicate_cache
      `)
      
      const result: CacheCleanupResult = {
        expiredRemoved: expiredResult.rowsAffected,
        lowAccessRemoved,
        totalFreedBytes: 0, // 실제 구현에서 계산
        remainingEntries: remainingResult.rows[0].count as number
      }
      
      console.log(`🧹 [EvaluatedCache] 정리 완료: 만료 ${result.expiredRemoved}개, 저빈도 ${result.lowAccessRemoved}개 삭제`)
      
      return result
      
    } catch (error) {
      console.error('❌ [EvaluatedCache] 캐시 정리 실패:', error)
      throw error
    }
  }
  
  // 설정 업데이트
  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('🔧 [EvaluatedCache] 설정 업데이트:', newConfig)
  }
  
  // 현재 설정 조회
  public getConfig(): CacheConfig {
    return { ...this.config }
  }
  
  // 캐시 통계 조회
  public getMetrics(): typeof this.metrics {
    return { ...this.metrics }
  }
  
  // Private helper methods
  private generateResponseHash(inputWord: string, predicates: PredicateCandidate[]): string {
    const content = inputWord + JSON.stringify(predicates)
    // 간단한 해시 (실제 구현에서는 crypto 사용)
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }
  
  private async updateAccessCount(id: number): Promise<void> {
    try {
      const client = await getTursoClient()
      await client.execute(`
        UPDATE ai_predicate_cache 
        SET access_count = access_count + 1, 
            last_accessed_at = datetime('now')
        WHERE id = ${id}
      `)
    } catch (error) {
      console.warn('⚠️ [EvaluatedCache] 접근 횟수 업데이트 실패:', error)
    }
  }
  
  private validateCacheEntry(entry: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!entry.input_word || typeof entry.input_word !== 'string') {
      errors.push('입력 단어가 유효하지 않음')
    }
    
    if (!entry.ai_response || typeof entry.ai_response !== 'string') {
      errors.push('AI 응답이 유효하지 않음')
    } else {
      try {
        const parsed = JSON.parse(entry.ai_response)
        if (!Array.isArray(parsed)) {
          errors.push('AI 응답이 배열이 아님')
        }
      } catch (parseError) {
        errors.push('AI 응답 JSON 파싱 실패')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  private startPeriodicCleanup(): void {
    const intervalMs = this.config.cleanupIntervalHours * 60 * 60 * 1000
    
    setInterval(async () => {
      try {
        console.log('🧹 [EvaluatedCache] 주기적 정리 작업 시작')
        await this.cleanupCache()
      } catch (error) {
        console.error('❌ [EvaluatedCache] 주기적 정리 작업 실패:', error)
      }
    }, intervalMs)
    
    console.log(`🕐 [EvaluatedCache] 주기적 정리 작업 등록: ${this.config.cleanupIntervalHours}시간마다`)
  }
  
  // 캐시 무효화
  public async invalidateCache(inputWord?: string): Promise<void> {
    try {
      const client = await getTursoClient()
      
      if (inputWord) {
        await client.execute(`
          DELETE FROM ai_predicate_cache WHERE input_word = '${inputWord}'
        `)
        console.log(`🗑️ [EvaluatedCache] 특정 캐시 무효화: "${inputWord}"`)
      } else {
        await client.execute(`
          DELETE FROM ai_predicate_cache WHERE response_source = 'evaluated'
        `)
        console.log('🗑️ [EvaluatedCache] 모든 평가 완료 캐시 무효화')
      }
      
    } catch (error) {
      console.error('❌ [EvaluatedCache] 캐시 무효화 실패:', error)
      throw error
    }
  }
  
  // 디버깅 정보 제공
  public getDebugInfo(): {
    config: CacheConfig
    metrics: {
      hits: number
      misses: number
      writes: number
      errors: number
      totalSize: number
    }
    performance: CachePerformanceReport
  } {
    return {
      config: this.getConfig(),
      metrics: this.getMetrics(),
      performance: this.getCachePerformance()
    }
  }
}

export default EvaluatedCacheService.getInstance()