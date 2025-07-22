// Multi-level Fallback Strategy Orchestrator
// AIDEV-NOTE: 다단계 폴백 전략을 관리하여 최적의 사용자 경험을 보장하는 시스템

import { 
  PredicateCandidate,
  FallbackLevel,
  FallbackResult,
  CommunicationStatus
} from '../utils/types/aiTypes'
import ParallelAIService from './ParallelAIService'
import EvaluationService from './EvaluationService'
import ResponseMerger from './ResponseMerger'
import communicationLogger from '../utils/AICommunicationLogger'

export interface FallbackConfig {
  enableLevel1: boolean    // Single AI + Evaluation
  enableLevel2: boolean    // AI responses + local merge
  enableLevel3: boolean    // Emergency local fallback
  maxAttempts: number
  timeoutPerLevel: number
}

export interface FallbackAnalysis {
  recommendedLevel: FallbackLevel
  reason: string
  confidence: number
  alternatives: FallbackLevel[]
}

export class FallbackOrchestrator {
  private static instance: FallbackOrchestrator
  private parallelAIService: typeof ParallelAIService
  private evaluationService: typeof EvaluationService
  private responseMerger: typeof ResponseMerger
  private logger: typeof communicationLogger
  
  private config: FallbackConfig = {
    enableLevel1: true,
    enableLevel2: true,
    enableLevel3: true,
    maxAttempts: 3,
    timeoutPerLevel: 8000
  }
  
  private constructor() {
    this.parallelAIService = ParallelAIService
    this.evaluationService = EvaluationService
    this.responseMerger = ResponseMerger
    this.logger = communicationLogger
    
    console.log('🔄 [FallbackOrchestrator] 다단계 폴백 시스템 초기화 완료')
  }
  
  public static getInstance(): FallbackOrchestrator {
    if (!FallbackOrchestrator.instance) {
      FallbackOrchestrator.instance = new FallbackOrchestrator()
    }
    return FallbackOrchestrator.instance
  }
  
  // 메인 폴백 실행 메서드
  public async executeWithFallback(noun: string): Promise<FallbackResult> {
    const startTime = Date.now()
    const communicationStatus: CommunicationStatus = {
      openai: 'failed',
      gemini: 'failed',
      evaluator: 'failed'
    }
    
    console.log(`🔄 [FallbackOrchestrator] 폴백 실행 시작: "${noun}"`)
    
    // Level 0: Full Success Attempt (Parallel AI + Evaluation)
    try {
      const level0Result = await this.attemptLevel0(noun, communicationStatus)
      if (level0Result) {
        return this.createFallbackResult(
          FallbackLevel.FULL_SUCCESS,
          level0Result,
          communicationStatus,
          startTime,
          true,
          '병렬 AI + ChatGPT-4o 평가 성공'
        )
      }
    } catch (error) {
      console.log('🔄 [FallbackOrchestrator] Level 0 실패, Level 1 시도')
    }
    
    // Level 1: Single AI + Evaluation
    if (this.config.enableLevel1) {
      try {
        const level1Result = await this.attemptLevel1(noun, communicationStatus)
        if (level1Result) {
          return this.createFallbackResult(
            FallbackLevel.PARTIAL_AI_SUCCESS,
            level1Result,
            communicationStatus,
            startTime,
            true,
            '단일 AI + ChatGPT-4o 평가 성공'
          )
        }
      } catch (error) {
        console.log('🔄 [FallbackOrchestrator] Level 1 실패, Level 2 시도')
      }
    }
    
    // Level 2: AI responses + local merge
    if (this.config.enableLevel2) {
      try {
        const level2Result = await this.attemptLevel2(noun, communicationStatus)
        if (level2Result && level2Result.length > 0) {
          return this.createFallbackResult(
            FallbackLevel.NO_EVALUATION,
            level2Result,
            communicationStatus,
            startTime,
            false,
            'AI 응답 + 로컬 병합 적용'
          )
        }
      } catch (error) {
        console.log('🔄 [FallbackOrchestrator] Level 2 실패, Level 3 시도')
      }
    }
    
    // Level 3: Emergency local fallback
    if (this.config.enableLevel3) {
      const level3Result = this.attemptLevel3(noun, communicationStatus)
      return this.createFallbackResult(
        FallbackLevel.EMERGENCY_FALLBACK,
        level3Result,
        communicationStatus,
        startTime,
        false,
        '로컬 응급 폴백 적용'
      )
    }
    
    // 모든 폴백 실패 (이론적으로 도달하지 않음)
    throw new Error('모든 폴백 전략이 실패했습니다')
  }
  
  // 폴백 전략 분석
  public analyzeFallbackNeed(
    currentStatus: CommunicationStatus,
    hasResults: boolean,
    resultCount: number
  ): FallbackAnalysis {
    let recommendedLevel = FallbackLevel.FULL_SUCCESS
    let reason = '정상 상황'
    let confidence = 95
    const alternatives: FallbackLevel[] = []
    
    // 통신 상태 분석
    const failedServices = Object.values(currentStatus).filter(status => status === 'failed').length
    const timeoutServices = Object.values(currentStatus).filter(status => status === 'timeout').length
    
    if (failedServices === 0 && timeoutServices === 0) {
      // 모든 서비스 정상
      recommendedLevel = FallbackLevel.FULL_SUCCESS
      reason = '모든 AI 서비스 정상 작동'
      
    } else if (failedServices <= 1 && currentStatus.evaluator === 'success') {
      // 일부 AI 실패하지만 평가는 성공
      recommendedLevel = FallbackLevel.PARTIAL_AI_SUCCESS
      reason = '일부 AI 서비스 실패, 평가 시스템 정상'
      confidence = 80
      alternatives.push(FallbackLevel.FULL_SUCCESS)
      
    } else if (hasResults && resultCount > 5) {
      // AI 응답은 있지만 평가 실패
      recommendedLevel = FallbackLevel.NO_EVALUATION
      reason = 'AI 응답 확보됨, 평가 시스템 실패'
      confidence = 70
      alternatives.push(FallbackLevel.PARTIAL_AI_SUCCESS)
      
    } else {
      // 심각한 실패 상황
      recommendedLevel = FallbackLevel.EMERGENCY_FALLBACK
      reason = '대부분의 AI 서비스 실패'
      confidence = 60
      alternatives.push(FallbackLevel.NO_EVALUATION)
    }
    
    return {
      recommendedLevel,
      reason,
      confidence,
      alternatives
    }
  }
  
  // 설정 업데이트
  public updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('🔧 [FallbackOrchestrator] 설정 업데이트:', newConfig)
  }
  
  // 현재 설정 조회
  public getConfig(): FallbackConfig {
    return { ...this.config }
  }
  
  // Private methods for each fallback level
  private async attemptLevel0(noun: string, status: CommunicationStatus): Promise<PredicateCandidate[] | null> {
    console.log('🎯 [FallbackOrchestrator] Level 0 시도: 병렬 AI + 평가')
    
    // 병렬 AI 요청
    const parallelResult = await this.parallelAIService.requestBoth(noun)
    status.openai = parallelResult.openaiResults ? 'success' : 'failed'
    status.gemini = parallelResult.geminiResults ? 'success' : 'failed'
    
    if (parallelResult.combinedResults.length === 0) {
      throw new Error('병렬 AI 요청 결과 없음')
    }
    
    // ChatGPT-4o 평가
    if (this.evaluationService.canEvaluate()) {
      try {
        const evaluated = await this.evaluationService.evaluatePredicates(
          parallelResult.combinedResults,
          noun
        )
        status.evaluator = 'success'
        
        this.logger.logFallback(0, 'Level 0 성공', evaluated.predicates.length)
        return evaluated.predicates
        
      } catch (evalError) {
        console.log('⚠️ [FallbackOrchestrator] Level 0 평가 실패:', (evalError as Error).message)
        status.evaluator = 'failed'
        throw evalError
      }
    } else {
      throw new Error('평가 서비스 사용 불가')
    }
  }
  
  private async attemptLevel1(noun: string, status: CommunicationStatus): Promise<PredicateCandidate[] | null> {
    console.log('🎯 [FallbackOrchestrator] Level 1 시도: 단일 AI + 평가')
    
    let singleAIResult: PredicateCandidate[] = []
    
    // OpenAI 우선 시도
    const availability = this.parallelAIService.getServiceAvailability()
    
    if (availability.openai) {
      try {
        singleAIResult = await this.parallelAIService.requestOpenAI(noun)
        status.openai = singleAIResult.length > 0 ? 'success' : 'failed'
      } catch (error) {
        status.openai = 'failed'
      }
    }
    
    // OpenAI 실패 시 Gemini 시도
    if (singleAIResult.length === 0 && availability.gemini) {
      try {
        singleAIResult = await this.parallelAIService.requestGemini(noun)
        status.gemini = singleAIResult.length > 0 ? 'success' : 'failed'
      } catch (error) {
        status.gemini = 'failed'
      }
    }
    
    if (singleAIResult.length === 0) {
      throw new Error('모든 단일 AI 요청 실패')
    }
    
    // ChatGPT-4o 평가
    if (this.evaluationService.canEvaluate()) {
      try {
        const evaluated = await this.evaluationService.evaluatePredicates(singleAIResult, noun)
        status.evaluator = 'success'
        
        this.logger.logFallback(1, 'Level 1 성공', evaluated.predicates.length)
        return evaluated.predicates
        
      } catch (evalError) {
        status.evaluator = 'failed'
        throw evalError
      }
    } else {
      throw new Error('평가 서비스 사용 불가')
    }
  }
  
  private async attemptLevel2(noun: string, status: CommunicationStatus): Promise<PredicateCandidate[] | null> {
    console.log('🎯 [FallbackOrchestrator] Level 2 시도: AI 응답 + 로컬 병합')
    
    // 병렬 AI 요청 (평가 없이)
    const parallelResult = await this.parallelAIService.requestBoth(noun)
    status.openai = parallelResult.openaiResults ? 'success' : 'failed'
    status.gemini = parallelResult.geminiResults ? 'success' : 'failed'
    status.evaluator = 'failed' // 평가 안함
    
    if (parallelResult.combinedResults.length === 0) {
      return null
    }
    
    // 로컬 병합 및 정렬
    const mergeResult = this.responseMerger.mergeWithPriority(
      parallelResult.openaiResults,
      parallelResult.geminiResults,
      {
        prioritizeOpenAI: true,
        removeDuplicates: true,
        sortByCategory: true,
        maxResults: 15
      }
    )
    
    this.logger.logFallback(2, 'Level 2 성공 (로컬 병합)', mergeResult.mergedResults.length)
    return mergeResult.mergedResults
  }
  
  private attemptLevel3(noun: string, status: CommunicationStatus): PredicateCandidate[] {
    console.log('🎯 [FallbackOrchestrator] Level 3 시도: 로컬 응급 폴백')
    
    status.openai = 'failed'
    status.gemini = 'failed'
    status.evaluator = 'failed'
    
    // 기본 로컬 서술어 생성 (기존 로직 재사용)
    const localPredicates = this.generateLocalPredicates(noun)
    
    // 가능하다면 ChatGPT-4o로 평가 시도
    if (this.evaluationService.canEvaluate()) {
      try {
        const basicEvaluated = this.evaluationService.applyBasicEvaluation(localPredicates, noun)
        this.logger.logFallback(3, 'Level 3 성공 (로컬 + 기본평가)', basicEvaluated.predicates.length)
        return basicEvaluated.predicates
      } catch (error) {
        console.log('⚠️ [FallbackOrchestrator] Level 3 기본평가 실패, 순수 로컬 사용')
      }
    }
    
    this.logger.logFallback(3, 'Level 3 성공 (순수 로컬)', localPredicates.length)
    return localPredicates
  }
  
  private generateLocalPredicates(noun: string): PredicateCandidate[] {
    const category = this.analyzeNounCategory(noun)
    
    const predicateMap: Record<string, PredicateCandidate[]> = {
      place: [
        { text: '에 가고 싶어요', emoji: '🚶', category: '요청' },
        { text: '에 데려다 주세요', emoji: '🚗', category: '요청' },
        { text: '이 좋아요', emoji: '😊', category: '감정' },
        { text: '에서 쉬고 싶어요', emoji: '😴', category: '휴식' }
      ],
      food: [
        { text: '을 주세요', emoji: '🤲', category: '요청' },
        { text: '을 먹고 싶어요', emoji: '🍽️', category: '요청' },
        { text: '이 맛있어요', emoji: '😋', category: '맛' },
        { text: '이 필요해요', emoji: '🤗', category: '필요' }
      ],
      activity: [
        { text: '을 하고 싶어요', emoji: '🙌', category: '요청' },
        { text: '을 배우고 싶어요', emoji: '📚', category: '요청' },
        { text: '이 좋아요', emoji: '😊', category: '감정' },
        { text: '이 재미있어요', emoji: '😄', category: '기분' }
      ],
      person: [
        { text: '을 만나고 싶어요', emoji: '🤗', category: '요청' },
        { text: '을 도와주세요', emoji: '🙏', category: '요청' },
        { text: '이 좋아요', emoji: '😊', category: '감정' },
        { text: '이 보고 싶어요', emoji: '💕', category: '그리움' }
      ],
      general: [
        { text: '을 주세요', emoji: '🤲', category: '요청' },
        { text: '을 도와주세요', emoji: '🙏', category: '요청' },
        { text: '이 좋아요', emoji: '😊', category: '감정' },
        { text: '이 필요해요', emoji: '🤗', category: '필요' }
      ]
    }
    
    return predicateMap[category] || predicateMap.general
  }
  
  private analyzeNounCategory(noun: string): string {
    const places = ['화장실', '학교', '집', '병원', '공원', '놀이터']
    const foods = ['밥', '물', '빵', '우유', '과자', '사과']
    const activities = ['수영', '공부', '놀이', '운동', '게임']
    const people = ['엄마', '아빠', '선생님', '친구']
    
    if (places.some(place => noun.includes(place))) return 'place'
    if (foods.some(food => noun.includes(food))) return 'food'
    if (activities.some(activity => noun.includes(activity))) return 'activity'
    if (people.some(person => noun.includes(person))) return 'person'
    
    return 'general'
  }
  
  private createFallbackResult(
    level: FallbackLevel,
    predicates: PredicateCandidate[],
    communicationStatus: CommunicationStatus,
    startTime: number,
    cacheEligible: boolean,
    fallbackReason: string
  ): FallbackResult {
    const processingTime = Date.now() - startTime
    
    return {
      level,
      predicates,
      communicationStatus,
      processingTime,
      cacheEligible,
      fallbackReason
    }
  }
  
  // 디버깅 정보 제공
  public getDebugInfo(): {
    config: FallbackConfig
    serviceAvailability: any
    recentMetrics: any
  } {
    return {
      config: this.getConfig(),
      serviceAvailability: this.parallelAIService.getServiceAvailability(),
      recentMetrics: this.logger.getCurrentMetrics()
    }
  }
}

export default FallbackOrchestrator.getInstance()