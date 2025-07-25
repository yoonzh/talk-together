import { TursoClient, getTursoClient } from './tursoClient'
import { AIPredicateCacheService } from './aiPredicateCacheService'
import { TTSAudioCacheService, TTSSource } from './ttsAudioCacheService'
import { logError } from '../../utils/logger'

export interface CacheServiceConfig {
  autoCleanup?: boolean
  cleanupIntervalHours?: number
}

export class CacheService {
  private client: TursoClient | null = null
  public predicates: AIPredicateCacheService | null = null
  public audio: TTSAudioCacheService | null = null
  private cleanupInterval: NodeJS.Timeout | null = null
  private config: CacheServiceConfig

  constructor(config: CacheServiceConfig = {}) {
    this.config = {
      autoCleanup: true,
      cleanupIntervalHours: 24,
      ...config
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 [Cache Service] 초기화 시작...')
      
      // Turso 클라이언트 연결
      this.client = await getTursoClient()
      
      // 캐시 서비스 인스턴스 생성
      this.predicates = new AIPredicateCacheService(this.client)
      this.audio = new TTSAudioCacheService(this.client)
      
      // 각 서비스 초기화
      await this.predicates.initialize()
      await this.audio.initialize()
      
      // 자동 정리 작업 설정
      if (this.config.autoCleanup) {
        this.startAutoCleanup()
      }
      
      console.log('✅ [Cache Service] 초기화 완료')
      
    } catch (error) {
      logError('캐시 서비스 초기화 실패', error)
      throw error
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) return false
      
      const isHealthy = await this.client.healthCheck()
      console.log(`🏥 [Cache Service] 헬스체크: ${isHealthy ? '정상' : '비정상'}`)
      
      return isHealthy
    } catch (error) {
      logError('캐시 서비스 헬스체크 실패', error)
      return false
    }
  }

  async getOverallStats(): Promise<{
    predicates: any
    audio: any
    database: any
  }> {
    try {
      const [predicateStats, audioStats] = await Promise.all([
        this.predicates?.getCacheStats(),
        this.audio?.getCacheStats()
      ])

      const dbStats = this.client ? {
        connected: this.client.isHealthy,
        client_info: this.client.clientInfo
      } : null

      return {
        predicates: predicateStats || null,
        audio: audioStats || null,
        database: dbStats
      }
    } catch (error) {
      logError('캐시 서비스 통계 조회 실패', error)
      return {
        predicates: null,
        audio: null,
        database: null
      }
    }
  }

  private startAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    const intervalMs = (this.config.cleanupIntervalHours || 24) * 60 * 60 * 1000
    
    this.cleanupInterval = setInterval(async () => {
      try {
        console.log('🧹 [Cache Service] 자동 정리 작업 시작...')
        await this.runCleanup()
      } catch (error) {
        logError('자동 캐시 정리 실패', error)
      }
    }, intervalMs)

    console.log(`⏰ [Cache Service] 자동 정리 설정: ${this.config.cleanupIntervalHours}시간 간격`)
  }

  async runCleanup(): Promise<{
    predicatesDeleted: number
    audioDeleted: number
  }> {
    try {
      const [predicatesDeleted, audioDeleted] = await Promise.all([
        this.predicates?.cleanExpiredCache() || 0,
        this.audio?.cleanOldCache(30) || 0
      ])

      console.log(`🧹 [Cache Service] 정리 완료: AI 서술어 ${predicatesDeleted}개, TTS 오디오 ${audioDeleted}개 삭제`)
      
      return { predicatesDeleted, audioDeleted }
    } catch (error) {
      logError('캐시 정리 작업 실패', error)
      return { predicatesDeleted: 0, audioDeleted: 0 }
    }
  }

  async shutdown(): Promise<void> {
    try {
      console.log('🛑 [Cache Service] 종료 시작...')
      
      // 자동 정리 중지
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
        this.cleanupInterval = null
      }
      
      // 데이터베이스 연결 해제는 전역 관리되므로 여기서는 하지 않음
      this.client = null
      this.predicates = null
      this.audio = null
      
      console.log('✅ [Cache Service] 종료 완료')
      
    } catch (error) {
      logError('캐시 서비스 종료 실패', error)
    }
  }

  get isInitialized(): boolean {
    return this.client !== null && this.predicates !== null && this.audio !== null
  }
}

// AIDEV-NOTE: DatabaseManager로 이관됨 - 하위 호환성을 위해 유지
// 새로운 코드에서는 DatabaseManager.getCacheService() 사용 권장
import { getCacheService as getManagerCacheService } from './DatabaseManager'

/**
 * @deprecated DatabaseManager.getCacheService() 사용을 권장합니다
 */
export async function getCacheService(): Promise<CacheService> {
  // DatabaseManager가 초기화되지 않았을 수 있으므로 안전한 처리
  try {
    return getManagerCacheService()
  } catch (error) {
    // 폴백: 기존 방식으로 초기화
    console.warn('⚠️ [CacheService] DatabaseManager 미초기화 - 폴백 초기화 실행')
    
    if (!globalCacheService) {
      globalCacheService = new CacheService()
      await globalCacheService.initialize()
    }
    
    return globalCacheService
  }
}

// 싱글톤 캐시 서비스 인스턴스 (폴백용)
let globalCacheService: CacheService | null = null

export async function shutdownCacheService(): Promise<void> {
  if (globalCacheService) {
    await globalCacheService.shutdown()
    globalCacheService = null
  }
}

// AIDEV-NOTE: AI 서비스 연동을 위한 헬퍼 함수들
export async function getAIPredicatesWithCache(inputWord: string): Promise<{
  response: import('./aiPredicateCacheService').PredicateCandidate[]
  source: 'cache' | 'api' | 'fallback'
  fromCache: boolean
  modelName?: string
  cacheId?: number
}> {
  try {
    const cacheService = await getCacheService()
    
    // 1. 캐시 확인
    const cached = await cacheService.predicates?.getFromCache(inputWord)
    if (cached) {
      await cacheService.predicates?.logCacheOperation('hit', inputWord, { model: cached.model_name })
      return {
        response: cached.ai_response,
        source: 'cache',
        fromCache: true,
        modelName: cached.model_name,
        cacheId: cached.id
      }
    }
    
    // 2. 캐시 미스 로그
    await cacheService.predicates?.logCacheOperation('miss', inputWord)
    
    return {
      response: [],
      source: 'api', // 실제 API 호출은 상위 레이어에서 처리
      fromCache: false
    }
    
  } catch (error) {
    logError('AI 서술어 캐시 조회 실패', { inputWord, error })
    return {
      response: [],
      source: 'fallback',
      fromCache: false
    }
  }
}

// AIDEV-NOTE: 완전한 AI 응답 객체를 캐시에 저장하는 헬퍼 함수
export async function saveAIResponseToCache(
  inputWord: string,
  response: import('./aiPredicateCacheService').PredicateCandidate[],
  modelName: string,
  isFromAPI: boolean = true
): Promise<void> {
  try {
    const cacheService = await getCacheService()
    await cacheService.predicates?.saveToCache(inputWord, response, modelName, isFromAPI)
    
    const operation = isFromAPI ? 'save' : 'skip'
    await cacheService.predicates?.logCacheOperation(operation, inputWord, { 
      model: modelName, 
      predicates_count: response.length
    })
    
  } catch (error) {
    logError('AI 응답 캐시 저장 실패', { inputWord, modelName, error })
  }
}

// AIDEV-NOTE: TTS 서비스 연동을 위한 헬퍼 함수들
export async function getTTSAudioWithCache(
  sentenceText: string,
  voiceConfig: any = {}
): Promise<{
  audioData: string | null
  source: 'cache' | 'api' | 'fallback'
  fromCache: boolean
}> {
  try {
    const cacheService = await getCacheService()
    
    // 1. 캐시 확인
    const cached = await cacheService.audio?.getAudioFromCache(sentenceText, voiceConfig)
    if (cached) {
      await cacheService.audio?.logCacheOperation('hit', sentenceText, cached.tts_provider as TTSSource)
      return {
        audioData: cached.audio_data,
        source: 'cache',
        fromCache: true
      }
    }
    
    // 2. 캐시 미스 로그
    await cacheService.audio?.logCacheOperation('miss', sentenceText)
    
    return {
      audioData: null,
      source: 'api', // 실제 API 호출은 상위 레이어에서 처리
      fromCache: false
    }
    
  } catch (error) {
    logError('TTS 오디오 캐시 조회 실패', { sentenceText, error })
    return {
      audioData: null,
      source: 'fallback',
      fromCache: false
    }
  }
}

export async function saveTTSAudioToCache(
  sentenceText: string,
  audioData: string,
  voiceConfig: any,
  ttsSource: TTSSource,
  durationMs?: number,
  originalSizeBytes?: number
): Promise<void> {
  try {
    const cacheService = await getCacheService()
    await cacheService.audio?.saveAudioToCache(
      sentenceText,
      audioData,
      voiceConfig,
      ttsSource,
      durationMs,
      originalSizeBytes
    )
    
    const operation = ttsSource === TTSSource.WEB_SPEECH_FALLBACK ? 'skip' : 'save'
    await cacheService.audio?.logCacheOperation(operation, sentenceText, ttsSource, {
      duration_ms: durationMs,
      size_bytes: originalSizeBytes
    })
    
  } catch (error) {
    logError('TTS 오디오 캐시 저장 실패', { sentenceText, ttsSource, error })
  }
}