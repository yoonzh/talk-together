// Main AI Workflow Orchestrator
// AIDEV-NOTE: 전체 AI 시스템을 조율하는 핵심 컴포넌트 - 캐시부터 폴백까지 모든 워크플로우 관리

import { 
  PredicateCandidate,
  FallbackResult,
  CommunicationStatus,
  FallbackLevel
} from '../utils/types/aiTypes'
import FallbackOrchestrator from './FallbackOrchestrator'
import communicationLogger from '../utils/AICommunicationLogger'

// 임시로 기존 캐시 서비스 import (Phase 4에서 교체 예정)
import { getAIPredicatesWithCache, saveAIResponseToCache } from '../database/cacheService'

export interface OrchestrationResult {
  predicates: PredicateCandidate[]
  source: 'cache' | 'evaluated' | 'fallback'
  fallbackLevel?: FallbackLevel
  processingTime: number
  communicationStatus?: CommunicationStatus
  cacheHit: boolean
  qualityScore?: number
}

export interface OrchestrationConfig {
  enableCache: boolean
  cacheEvaluatedOnly: boolean
  preferOpenAICache: boolean
  enableFallback: boolean
  minResultCount: number
  maxProcessingTime: number
  enableQualityCheck: boolean
}

export class AIOrchestrator {
  private static instance: AIOrchestrator
  private fallbackOrchestrator: typeof FallbackOrchestrator
  private logger: typeof communicationLogger
  
  private config: OrchestrationConfig = {
    enableCache: true,
    cacheEvaluatedOnly: true,
    preferOpenAICache: true,
    enableFallback: true,
    minResultCount: 4,
    maxProcessingTime: 15000,
    enableQualityCheck: true
  }
  
  private constructor() {
    this.fallbackOrchestrator = FallbackOrchestrator
    this.logger = communicationLogger
    
    console.log('🎯 [AIOrchestrator] 메인 워크플로우 시스템 초기화 완료')
  }
  
  public static getInstance(): AIOrchestrator {
    if (!AIOrchestrator.instance) {
      AIOrchestrator.instance = new AIOrchestrator()
    }
    return AIOrchestrator.instance
  }
  
  // 메인 서술어 생성 메서드 (외부 API)
  public async generatePredicates(noun: string): Promise<PredicateCandidate[]> {
    const result = await this.orchestrateRequest(noun)
    return result.predicates
  }
  
  // 상세 정보를 포함한 조율 메서드
  public async orchestrateRequest(noun: string): Promise<OrchestrationResult> {
    const startTime = Date.now()
    console.log(`🎯 [AIOrchestrator] 요청 시작: "${noun}"`)
    
    try {
      // 1. 캐시 확인
      if (this.config.enableCache) {
        const cacheResult = await this.checkCache(noun)
        if (cacheResult) {
          const processingTime = Date.now() - startTime
          this.logger.logCache('hit', noun, 'evaluated')
          
          console.log(`🎯 [AIOrchestrator] 캐시 적중: "${noun}" (${processingTime}ms)`)
          
          return {
            predicates: cacheResult,
            source: 'cache',
            processingTime,
            cacheHit: true
          }
        } else {
          this.logger.logCache('miss', noun)
        }
      }
      
      // 2. 폴백 오케스트레이션 실행
      if (this.config.enableFallback) {
        const fallbackResult = await this.fallbackOrchestrator.executeWithFallback(noun)
        
        // 3. 결과 품질 검사
        if (this.config.enableQualityCheck) {
          const qualityCheck = this.performQualityCheck(fallbackResult.predicates)
          if (!qualityCheck.passed && qualityCheck.issues.length > 0) {
            console.warn(`⚠️ [AIOrchestrator] 품질 검사 경고: ${qualityCheck.issues.join(', ')}`)
          }
        }
        
        // 4. 캐시 저장 (Level 0 성공 시에만)
        if (this.config.enableCache && fallbackResult.cacheEligible) {
          await this.saveToCache(noun, fallbackResult)
        }
        
        const processingTime = Date.now() - startTime
        
        console.log(`🎯 [AIOrchestrator] 요청 완료: "${noun}" (Level ${fallbackResult.level}, ${processingTime}ms)`)
        
        return {
          predicates: fallbackResult.predicates,
          source: fallbackResult.level === FallbackLevel.FULL_SUCCESS ? 'evaluated' : 'fallback',
          fallbackLevel: fallbackResult.level,
          processingTime,
          communicationStatus: fallbackResult.communicationStatus,
          cacheHit: false,
          qualityScore: this.calculateQualityScore(fallbackResult.predicates)
        }
        
      } else {
        throw new Error('폴백 시스템이 비활성화되어 있습니다')
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error(`❌ [AIOrchestrator] 요청 실패: "${noun}" (${processingTime}ms)`, error)
      
      // 최후 수단: 하드코딩된 응급 응답
      const emergencyPredicates = this.getEmergencyPredicates(noun)
      
      return {
        predicates: emergencyPredicates,
        source: 'fallback',
        fallbackLevel: FallbackLevel.EMERGENCY_FALLBACK,
        processingTime,
        cacheHit: false,
        qualityScore: 50 // 응급 응답은 중간 점수
      }
    }
  }
  
  // 시스템 상태 확인
  public async getSystemStatus(): Promise<{
    healthy: boolean
    services: Record<string, boolean>
    cacheStatus: string
    performance: any
  }> {
    const debugInfo = this.fallbackOrchestrator.getDebugInfo()
    const metrics = this.logger.getCurrentMetrics()
    
    const services = {
      parallelAI: debugInfo.serviceAvailability.canParallel,
      openai: debugInfo.serviceAvailability.openai,
      gemini: debugInfo.serviceAvailability.gemini,
      evaluation: true, // EvaluationService는 항상 사용 가능 (로컬 폴백 있음)
      cache: this.config.enableCache
    }
    
    const healthy = Object.values(services).some(status => status) // 하나라도 작동하면 healthy
    
    return {
      healthy,
      services,
      cacheStatus: this.config.enableCache ? 'enabled' : 'disabled',
      performance: {
        averageResponseTime: metrics.averageResponseTime,
        successRate: metrics.successRate,
        totalRequests: metrics.totalRequests
      }
    }
  }
  
  // 성능 보고서 생성
  public getPerformanceReport(): {
    summary: string
    recommendations: string[]
    metrics: any
  } {
    const report = this.logger.generatePerformanceReport()
    const systemStatus = this.getSystemStatus()
    
    return {
      summary: `시스템 상태: ${systemStatus.then(s => s.healthy ? '정상' : '부분 장애')} | ${report.summary}`,
      recommendations: [
        ...report.recommendations,
        ...(this.config.cacheEvaluatedOnly ? ['평가된 응답만 캐시하여 품질 보장'] : [])
      ],
      metrics: report.details
    }
  }
  
  // 설정 업데이트
  public updateConfig(newConfig: Partial<OrchestrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('🔧 [AIOrchestrator] 설정 업데이트:', newConfig)
  }
  
  // 현재 설정 조회
  public getConfig(): OrchestrationConfig {
    return { ...this.config }
  }
  
  // Private helper methods
  private async checkCache(noun: string): Promise<PredicateCandidate[] | null> {
    try {
      const cacheResult = await getAIPredicatesWithCache(noun)
      
      if (cacheResult.fromCache) {
        // 평가된 응답만 사용하는 설정이면 검증
        if (this.config.cacheEvaluatedOnly) {
          // 현재는 기존 캐시 시스템 사용이므로 모든 캐시 허용
          // Phase 4에서 평가 완료 여부 확인 로직 추가 예정
          return cacheResult.response
        }
        
        return cacheResult.response
      }
      
      return null
      
    } catch (error) {
      console.warn('⚠️ [AIOrchestrator] 캐시 확인 실패:', error)
      return null
    }
  }
  
  private async saveToCache(noun: string, fallbackResult: FallbackResult): Promise<void> {
    try {
      if (fallbackResult.level === FallbackLevel.FULL_SUCCESS) {
        // 평가 완료된 응답만 캐시
        await saveAIResponseToCache(
          noun, 
          fallbackResult.predicates, 
          'enhanced-ai-system', 
          true
        )
        
        this.logger.logCache('write', noun, 'evaluated')
        console.log(`💾 [AIOrchestrator] 평가 완료 응답 캐시 저장: "${noun}"`)
        
      } else if (!this.config.cacheEvaluatedOnly) {
        // 평가되지 않은 응답도 캐시하는 설정인 경우
        await saveAIResponseToCache(
          noun, 
          fallbackResult.predicates, 
          'fallback-system', 
          false
        )
        
        this.logger.logCache('write', noun, 'legacy')
        console.log(`💾 [AIOrchestrator] 폴백 응답 캐시 저장: "${noun}"`)
      }
      
    } catch (error) {
      console.warn('⚠️ [AIOrchestrator] 캐시 저장 실패:', error)
    }
  }
  
  private performQualityCheck(predicates: PredicateCandidate[]): {
    passed: boolean
    score: number
    issues: string[]
  } {
    const issues: string[] = []
    let score = 100
    
    // 1. 최소 개수 확인
    if (predicates.length < this.config.minResultCount) {
      issues.push(`결과 개수 부족 (${predicates.length}/${this.config.minResultCount})`)
      score -= 20
    }
    
    // 2. 필수 필드 확인
    predicates.forEach((pred, index) => {
      if (!pred.text || pred.text.trim() === '') {
        issues.push(`항목 ${index + 1}: 텍스트 누락`)
        score -= 10
      }
      if (!pred.emoji || pred.emoji.trim() === '') {
        issues.push(`항목 ${index + 1}: 이모지 누락`)
        score -= 5
      }
    })
    
    // 3. 카테고리 다양성 확인
    const categories = new Set(predicates.map(p => p.category))
    if (categories.size < 2) {
      issues.push('카테고리 다양성 부족')
      score -= 15
    }
    
    // 4. 중복 확인
    const texts = predicates.map(p => p.text.trim().toLowerCase())
    const uniqueTexts = new Set(texts)
    if (uniqueTexts.size < texts.length) {
      issues.push('중복 텍스트 발견')
      score -= 10
    }
    
    return {
      passed: score >= 70,
      score: Math.max(0, score),
      issues
    }
  }
  
  private calculateQualityScore(predicates: PredicateCandidate[]): number {
    const qualityCheck = this.performQualityCheck(predicates)
    return qualityCheck.score
  }
  
  private getEmergencyPredicates(_noun: string): PredicateCandidate[] {
    return [
      { text: '이 좋아요', emoji: '😊', category: '감정' },
      { text: '을 주세요', emoji: '🤲', category: '요청' },
      { text: '이 필요해요', emoji: '🤗', category: '필요' },
      { text: '을 도와주세요', emoji: '🙏', category: '요청' }
    ]
  }
  
  // 통계 및 분석
  public getAnalytics(): {
    cacheHitRate: number
    averageFallbackLevel: number
    qualityDistribution: Record<string, number>
    performanceTrends: any
  } {
    // 실제 구현에서는 더 정교한 분석 로직 필요
    const metrics = this.logger.getCurrentMetrics()
    
    return {
      cacheHitRate: 0, // 실제 구현에서 계산
      averageFallbackLevel: 1.5, // 실제 구현에서 계산
      qualityDistribution: {
        'excellent': 0,
        'good': 0,
        'fair': 0,
        'poor': 0
      },
      performanceTrends: metrics
    }
  }
  
  // 시스템 리셋
  public reset(): void {
    this.logger.resetSession()
    console.log('🔄 [AIOrchestrator] 시스템 리셋 완료')
  }
}

export default AIOrchestrator.getInstance()