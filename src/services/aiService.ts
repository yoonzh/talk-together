import { getAIPredicatesWithCache, saveAIResponseToCache } from './database/cacheService'
import { OpenAIService } from './openaiService'
import { GeminiService } from './geminiService'

// Enhanced AI System Integration
import AIOrchestrator from './ai/AIOrchestrator'
import communicationLogger from './utils/AICommunicationLogger'
import { PredicateCandidate } from './utils/types/aiTypes'

// Feature Flags for Enhanced System
const FEATURE_FLAGS = {
  ENABLE_ENHANCED_AI: import.meta.env.VITE_ENABLE_ENHANCED_AI === 'true' || false,
  ENABLE_PARALLEL_AI: import.meta.env.VITE_ENABLE_PARALLEL_AI === 'true' || false,
  ENABLE_GPT4O_EVALUATION: import.meta.env.VITE_ENABLE_GPT4O_EVALUATION === 'true' || false,
  FALLBACK_TO_LEGACY: import.meta.env.VITE_FALLBACK_TO_LEGACY === 'true' || true
}

export class AIService {
  private static instance: AIService
  private openaiService: OpenAIService | null = null
  private geminiService: GeminiService | null = null
  
  // Enhanced AI System Components
  private aiOrchestrator: typeof AIOrchestrator | null = null
  private logger: typeof communicationLogger | null = null
  
  private constructor() {
    // OpenAI 서비스 초기화
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY
    if (openaiApiKey) {
      this.openaiService = OpenAIService.getInstance()
    }
    
    // Gemini 서비스 초기화  
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY
    if (geminiApiKey) {
      this.geminiService = new GeminiService(geminiApiKey)
    }
    
    // Enhanced AI System 초기화
    if (FEATURE_FLAGS.ENABLE_ENHANCED_AI) {
      this.aiOrchestrator = AIOrchestrator
      this.logger = communicationLogger
      console.log('🚀 [AI Service] Enhanced AI System 활성화')
    } else {
      console.log('📦 [AI Service] Legacy AI System 사용')
    }
  }
  
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }
  
  async generatePredicates(noun: string): Promise<PredicateCandidate[]> {
    try {
      console.log(`🔍 [AI Service] 서술어 생성 요청: ${noun}`)
      
      // Enhanced AI System 사용 (Feature Flag 확인)
      if (FEATURE_FLAGS.ENABLE_ENHANCED_AI && this.aiOrchestrator) {
        return await this.generateWithEnhancedSystem(noun)
      }
      
      // Legacy System 사용 (기존 로직 유지)
      return await this.generateWithLegacySystem(noun)
      
    } catch (error) {
      console.error('🚨 [AI Service] 서술어 생성 오류:', error)
      
      // Feature Flag에 따른 폴백 전략
      if (FEATURE_FLAGS.FALLBACK_TO_LEGACY && !FEATURE_FLAGS.ENABLE_ENHANCED_AI) {
        console.log('🔄 [AI Service] Legacy 시스템으로 폴백')
        return await this.generateWithLegacySystem(noun)
      }
      
      // 최후 수단: 응급 로컬 폴백
      const emergencyPredicates = this.getLocalBackupPredicates(noun)
      console.log(`📝 [AI Service] 응급 폴백 사용 - 단어: ${noun}, 응답: ${emergencyPredicates.length}개`)
      
      return emergencyPredicates
    }
  }
  
  // Enhanced AI System 실행
  private async generateWithEnhancedSystem(noun: string): Promise<PredicateCandidate[]> {
    try {
      console.log(`🚀 [AI Service] Enhanced AI System 실행: ${noun}`)
      
      const result = await this.aiOrchestrator!.orchestrateRequest(noun)
      
      // 상세 로깅
      if (this.logger) {
        const summary = this.logger.getSessionSummary()
        console.log(`📊 [AI Service] Enhanced 세션 요약: ${summary}`)
      }
      
      console.log(`✅ [AI Service] Enhanced 시스템 성공: ${result.predicates.length}개 (${result.source}, ${result.processingTime}ms)`)
      
      return result.predicates
      
    } catch (error) {
      console.error('❌ [AI Service] Enhanced AI System 실패:', error)
      
      // Legacy로 폴백 시도
      if (FEATURE_FLAGS.FALLBACK_TO_LEGACY) {
        console.log('🔄 [AI Service] Enhanced → Legacy 폴백')
        return await this.generateWithLegacySystem(noun)
      }
      
      throw error
    }
  }
  
  // Legacy System 실행 (기존 로직)
  private async generateWithLegacySystem(noun: string): Promise<PredicateCandidate[]> {
    console.log(`📦 [AI Service] Legacy AI System 실행: ${noun}`)
    
    // 1. 캐시 확인 및 OpenAI 모델 검증
    const cacheResult = await getAIPredicatesWithCache(noun)
    if (cacheResult.fromCache) {
      const isOpenAIModel = this.isOpenAIModel(cacheResult.modelName)
      
      if (isOpenAIModel) {
        // OpenAI 모델로 생성된 캐시는 그대로 사용
        console.log(`🎯 [AI Service] OpenAI 캐시 적중: ${noun} (모델: ${cacheResult.modelName})`)
        return cacheResult.response
      } else {
        // 다른 모델로 생성된 캐시는 OpenAI로 1회 재시도
        console.log(`🔄 [AI Service] 비-OpenAI 캐시 발견: ${noun} (모델: ${cacheResult.modelName}) - OpenAI 재시도`)
        const openAIRetry = await this.retryWithOpenAI(noun)
        if (openAIRetry) {
          return openAIRetry
        }
        
        // OpenAI 재시도 실패 시 기존 캐시 사용
        console.log(`⚠️ [AI Service] OpenAI 재시도 실패, 기존 캐시 사용: ${noun}`)
        return cacheResult.response
      }
    }
    
    // 2. 실제 AI API 호출
    const response = await this.callAIAPI(noun)
    
    if (response && response.predicates.length > 0) {
      console.log(`✅ [AI Service] Legacy API 서술어 생성 성공: ${noun}`)
      
      // 3. API 응답을 캐시에 저장 (메타데이터 포함)
      await saveAIResponseToCache(noun, response.predicates, response.modelName, true)
      
      return response.predicates
    }
    
    // 4. API 실패 시 로컬 폴백 (캐시하지 않음)
    console.log(`⚠️ [AI Service] Legacy API 실패, 로컬 폴백 사용: ${noun}`)
    const localPredicates = this.getLocalBackupPredicates(noun)
    
    // 5. 폴백 사용 로그만 출력 (DB에 저장하지 않음)
    console.log(`📝 [AI Service] Legacy 로컬 폴백 사용 - 단어: ${noun}, 응답: ${localPredicates.length}개 (DB 저장 안함)`)
    
    return localPredicates
  }
  
  private isOpenAIModel(modelName?: string): boolean {
    if (!modelName) return false
    // OpenAI 모델명 패턴 확인
    return modelName.includes('gpt') || modelName.toLowerCase().includes('openai')
  }
  
  private async retryWithOpenAI(noun: string): Promise<PredicateCandidate[] | null> {
    // OpenAI 서비스만 사용하여 재시도
    if (!this.openaiService) {
      console.log(`❌ [AI Service] OpenAI 서비스 없음, 재시도 불가`)
      return null
    }
    
    try {
      console.log(`🤖 [AI Service] OpenAI 단독 재시도: ${noun}`)
      const openaiResult = await this.openaiService.generatePredicates(noun)
      
      if (openaiResult && openaiResult.length > 0) {
        console.log(`✅ [AI Service] OpenAI 재시도 성공: ${openaiResult.length}개 서술어`)
        
        // 재시도 성공 시 응답을 캐시에 저장
        await saveAIResponseToCache(noun, openaiResult, 'gpt-3.5-turbo', true)
        
        return openaiResult
      }
      
      return null
    } catch (error) {
      console.warn(`⚠️ [AI Service] OpenAI 재시도 실패:`, error)
      return null
    }
  }
  
  private async callAIAPI(noun: string): Promise<{ predicates: PredicateCandidate[], modelName: string } | null> {
    // OpenAI → Gemini → Local Fallback 우선순위 적용
    
    // 1. OpenAI 서비스 시도
    if (this.openaiService) {
      try {
        console.log(`🤖 [AI Service] OpenAI 시도 중: ${noun}`)
        const openaiResult = await this.openaiService.generatePredicates(noun)
        if (openaiResult && openaiResult.length > 0) {
          console.log(`✅ [AI Service] OpenAI 성공: ${openaiResult.length}개 서술어`)
          return { predicates: openaiResult, modelName: 'gpt-3.5-turbo' }
        }
      } catch (error) {
        console.warn(`⚠️ [AI Service] OpenAI 실패:`, error)
      }
    }
    
    // 2. Gemini 서비스 시도
    if (this.geminiService) {
      try {
        console.log(`🤖 [AI Service] Gemini 시도 중: ${noun}`)
        const geminiResult = await this.geminiService.generatePredicates(noun)
        if (geminiResult && geminiResult.length > 0) {
          console.log(`✅ [AI Service] Gemini 성공: ${geminiResult.length}개 서술어`)
          return { predicates: geminiResult, modelName: 'gemini-2.5-flash-lite' }
        }
      } catch (error) {
        console.warn(`⚠️ [AI Service] Gemini 실패:`, error)
      }
    }
    
    // 3. 모든 AI 서비스 실패
    console.log(`❌ [AI Service] 모든 AI 서비스 실패: ${noun}`)
    return null
  }
  
  private getLocalBackupPredicates(noun: string): PredicateCandidate[] {
    // 간단한 로컬 분석 로직
    const category = this.analyzeNounCategory(noun)
    
    switch (category) {
      case 'place':
        return [
          { text: '에 가고 싶어요', emoji: '🚶', category: 'place' },
          { text: '에 있어요', emoji: '🏠', category: 'place' },
          { text: '이 좋아요', emoji: '😊', category: 'general' },
          { text: '에서 쉬고 싶어요', emoji: '😴', category: 'place' }
        ]
      
      case 'food':
        return [
          { text: '을 먹고 싶어요', emoji: '🍽️', category: 'food' },
          { text: '이 맛있어요', emoji: '😋', category: 'food' },
          { text: '을 주세요', emoji: '🤲', category: 'general' },
          { text: '이 필요해요', emoji: '🤗', category: 'general' }
        ]
      
      case 'activity':
        return [
          { text: '을 하고 싶어요', emoji: '🙌', category: 'activity' },
          { text: '이 좋아요', emoji: '😊', category: 'general' },
          { text: '이 재미있어요', emoji: '😄', category: 'general' },
          { text: '을 배우고 싶어요', emoji: '📚', category: 'activity' }
        ]
      
      case 'person':
        return [
          { text: '가 좋아요', emoji: '😊', category: 'general' },
          { text: '를 만나고 싶어요', emoji: '🤗', category: 'person' },
          { text: '가 보고 싶어요', emoji: '💕', category: 'person' },
          { text: '를 도와주세요', emoji: '🙏', category: 'general' }
        ]
      
      default:
        return [
          { text: '이 좋아요', emoji: '😊', category: 'general' },
          { text: '이 필요해요', emoji: '🤲', category: 'general' },
          { text: '을 원해요', emoji: '🙌', category: 'general' },
          { text: '을 도와주세요', emoji: '🙏', category: 'general' }
        ]
    }
  }
  
  private analyzeNounCategory(noun: string): string {
    const places = ['화장실', '학교', '집', '병원', '시장', '공원', '도서관', '식당', '카페', '놀이터', '수영장', '체육관']
    const foods = ['밥', '물', '빵', '우유', '과자', '사과', '바나나', '김치', '라면', '피자', '치킨', '햄버거']
    const activities = ['수영', '공부', '놀이', '운동', '독서', '그림', '음악', '게임', '산책', '요리']
    const people = ['엄마', '아빠', '선생님', '친구', '할머니', '할아버지', '언니', '오빠', '동생']
    
    if (places.includes(noun)) return 'place'
    if (foods.includes(noun)) return 'food'
    if (activities.includes(noun)) return 'activity'
    if (people.includes(noun)) return 'person'
    
    // 간단한 휴리스틱 분석
    if (noun.includes('실') || noun.includes('장')) return 'place'
    if (noun.includes('음료') || noun.includes('식')) return 'food'
    if (noun.includes('놀') || noun.includes('게임')) return 'activity'
    
    return 'general'
  }
  
  // Enhanced AI System 관리 메서드들
  
  // 시스템 상태 조회
  public async getSystemStatus(): Promise<{
    mode: 'enhanced' | 'legacy'
    healthy: boolean
    features: typeof FEATURE_FLAGS
    performance?: any
  }> {
    const mode = FEATURE_FLAGS.ENABLE_ENHANCED_AI ? 'enhanced' : 'legacy'
    
    if (mode === 'enhanced' && this.aiOrchestrator) {
      const status = await this.aiOrchestrator.getSystemStatus()
      return {
        mode,
        healthy: status.healthy,
        features: FEATURE_FLAGS,
        performance: status.performance
      }
    }
    
    // Legacy 모드 상태
    const legacyHealthy = !!(this.openaiService || this.geminiService)
    
    return {
      mode,
      healthy: legacyHealthy,
      features: FEATURE_FLAGS
    }
  }
  
  // 성능 보고서 조회 (Enhanced 모드에서만)
  public getPerformanceReport(): any {
    if (FEATURE_FLAGS.ENABLE_ENHANCED_AI && this.aiOrchestrator) {
      return this.aiOrchestrator.getPerformanceReport()
    }
    
    return {
      summary: 'Legacy mode - detailed metrics not available',
      recommendations: ['Enhanced AI 시스템을 활성화하여 상세 메트릭을 확인하세요'],
      metrics: {}
    }
  }
  
  // Feature Flag 상태 조회
  public getFeatureFlags(): typeof FEATURE_FLAGS {
    return { ...FEATURE_FLAGS }
  }
  
  // Enhanced AI System 설정 조회 (Enhanced 모드에서만)
  public getEnhancedConfig(): any {
    if (FEATURE_FLAGS.ENABLE_ENHANCED_AI && this.aiOrchestrator) {
      return this.aiOrchestrator.getConfig()
    }
    
    return null
  }
  
  // 통신 로그 요약 조회 (Enhanced 모드에서만)
  public getCommunicationSummary(): string {
    if (FEATURE_FLAGS.ENABLE_ENHANCED_AI && this.logger) {
      return this.logger.getSessionSummary()
    }
    
    return 'Legacy mode - communication logging not available'
  }
  
  // 시스템 리셋 (Enhanced 모드에서만)
  public resetEnhancedSystem(): void {
    if (FEATURE_FLAGS.ENABLE_ENHANCED_AI && this.aiOrchestrator) {
      this.aiOrchestrator.reset()
      console.log('🔄 [AI Service] Enhanced AI System 리셋 완료')
    } else {
      console.log('⚠️ [AI Service] Enhanced AI System이 비활성화되어 있습니다')
    }
  }
  
  // 디버깅 정보 제공
  public getDebugInfo(): {
    mode: string
    flags: typeof FEATURE_FLAGS
    legacyServices: {
      openai: boolean
      gemini: boolean
    }
    enhancedStatus?: any
  } {
    const debugInfo = {
      mode: FEATURE_FLAGS.ENABLE_ENHANCED_AI ? 'enhanced' : 'legacy',
      flags: FEATURE_FLAGS,
      legacyServices: {
        openai: !!this.openaiService,
        gemini: !!this.geminiService
      }
    }
    
    if (FEATURE_FLAGS.ENABLE_ENHANCED_AI && this.aiOrchestrator) {
      return {
        ...debugInfo,
        enhancedStatus: this.aiOrchestrator.getConfig()
      }
    }
    
    return debugInfo
  }
}

export default AIService.getInstance()