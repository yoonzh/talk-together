// Parallel AI Request Processing Service
// AIDEV-NOTE: ChatGPT-3.5와 Gemini Flash-lite에 동시 요청을 보내고 응답을 병합하는 서비스

import { OpenAIService } from '../openaiService'
import { GeminiService } from '../geminiService'
import { 
  PredicateCandidate, 
  ParallelAIResponse, 
  CommunicationStatus,
  AIServiceConfig 
} from '../utils/types/aiTypes'
import errorHandler from '../utils/ErrorHandler'
import communicationLogger from '../utils/AICommunicationLogger'

export class ParallelAIService {
  private static instance: ParallelAIService
  private openaiService: OpenAIService | null = null
  private geminiService: GeminiService | null = null
  private errorHandler: typeof errorHandler
  private logger: typeof communicationLogger
  
  private config: AIServiceConfig = {
    openaiApiKey: '',
    geminiApiKey: '',
    parallelRequestTimeout: 8000,
    evaluationTimeout: 10000,
    maxRetryAttempts: 2,
    enableParallelAI: true,
    enableGPT4oEvaluation: true,
    enableEnhancedCache: true,
    fallbackToLegacy: false
  }
  
  private constructor() {
    this.errorHandler = errorHandler
    this.logger = communicationLogger
    this.initializeServices()
  }
  
  public static getInstance(): ParallelAIService {
    if (!ParallelAIService.instance) {
      ParallelAIService.instance = new ParallelAIService()
    }
    return ParallelAIService.instance
  }
  
  private initializeServices(): void {
    // OpenAI 서비스 초기화
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY
    if (openaiApiKey) {
      this.openaiService = OpenAIService.getInstance()
      this.config.openaiApiKey = openaiApiKey
      console.log('🤖 [ParallelAI] OpenAI 서비스 초기화 완료')
    } else {
      console.warn('⚠️ [ParallelAI] OpenAI API 키가 설정되지 않음')
    }
    
    // Gemini 서비스 초기화
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY
    if (geminiApiKey) {
      this.geminiService = new GeminiService(geminiApiKey)
      this.config.geminiApiKey = geminiApiKey
      console.log('🤖 [ParallelAI] Gemini 서비스 초기화 완료')
    } else {
      console.warn('⚠️ [ParallelAI] Gemini API 키가 설정되지 않음')
    }
  }
  
  // 병렬 AI 요청 - 메인 메서드
  public async requestBoth(noun: string): Promise<ParallelAIResponse> {
    const startTime = Date.now()
    console.log(`🔄 [ParallelAI] 병렬 요청 시작: "${noun}"`)
    
    if (!this.config.enableParallelAI) {
      console.log('⚠️ [ParallelAI] 병렬 AI 비활성화됨, 단일 요청 모드')
      return this.requestSingle(noun)
    }
    
    // 병렬 요청 실행
    const [openaiResult, geminiResult] = await this.executeParallelRequests(noun)
    
    // 통신 상태 분석
    const communicationStatus: CommunicationStatus = {
      openai: this.errorHandler.determineServiceStatus(openaiResult),
      gemini: this.errorHandler.determineServiceStatus(geminiResult),
      evaluator: 'failed' // 아직 평가 안함
    }
    
    // 결과 병합
    const combinedResults = this.mergeBasicResults(
      openaiResult.result || null,
      geminiResult.result || null
    )
    
    const processingTime = Date.now() - startTime
    
    // 결과 로깅
    this.logger.logParallelRequest(noun, communicationStatus, processingTime, combinedResults.length)
    
    const response: ParallelAIResponse = {
      openaiResults: openaiResult.result || null,
      geminiResults: geminiResult.result || null,
      openaiError: openaiResult.lastError,
      geminiError: geminiResult.lastError,
      combinedResults,
      processingTimeMs: processingTime
    }
    
    console.log(`✅ [ParallelAI] 병렬 요청 완료: ${combinedResults.length}개 결과 (${processingTime}ms)`)
    return response
  }
  
  // 단일 AI 요청 (OpenAI 우선) - 재시도 없음으로 응답성 개선
  public async requestOpenAI(noun: string): Promise<PredicateCandidate[]> {
    if (!this.openaiService) {
      throw new Error('OpenAI 서비스가 초기화되지 않음')
    }
    
    const startTime = Date.now()
    
    try {
      // 타임아웃과 함께 단일 요청 수행
      const result = await Promise.race([
        this.openaiService.generatePredicates(noun),
        this.createTimeoutPromise(this.config.parallelRequestTimeout)
      ])
      
      const totalTime = Date.now() - startTime
      console.log(`✅ [OpenAI-3.5] 성공 (${totalTime}ms)`)
      
      this.logger.logRequest('openai-3.5', 'success', totalTime)
      return result || []
      
    } catch (error) {
      const totalTime = Date.now() - startTime
      console.log(`❌ [OpenAI-3.5] 실패 (${totalTime}ms): ${(error as Error).message}`)
      
      this.logger.logRequest('openai-3.5', 'failed', totalTime, error as Error)
      return [] // 즉시 빈 배열 반환하여 폴백 활성화
    }
  }
  
  // 단일 AI 요청 (Gemini) - 재시도 없음으로 응답성 개선
  public async requestGemini(noun: string): Promise<PredicateCandidate[]> {
    if (!this.geminiService) {
      throw new Error('Gemini 서비스가 초기화되지 않음')
    }
    
    const startTime = Date.now()
    
    try {
      // 타임아웃과 함께 단일 요청 수행
      const result = await Promise.race([
        this.geminiService.generatePredicates(noun),
        this.createTimeoutPromise(this.config.parallelRequestTimeout)
      ])
      
      const totalTime = Date.now() - startTime
      console.log(`✅ [Gemini-Flash] 성공 (${totalTime}ms)`)
      
      this.logger.logRequest('gemini-flash', 'success', totalTime)
      return result || []
      
    } catch (error) {
      const totalTime = Date.now() - startTime
      console.log(`❌ [Gemini-Flash] 실패 (${totalTime}ms): ${(error as Error).message}`)
      
      this.logger.logRequest('gemini-flash', 'failed', totalTime, error as Error)
      return [] // 즉시 빈 배열 반환하여 폴백 활성화
    }
  }
  
  // 서비스 가용성 확인
  public getServiceAvailability(): {
    openai: boolean
    gemini: boolean
    canParallel: boolean
  } {
    const openaiAvailable = !!this.openaiService && !!this.config.openaiApiKey
    const geminiAvailable = !!this.geminiService && !!this.config.geminiApiKey
    
    return {
      openai: openaiAvailable,
      gemini: geminiAvailable,
      canParallel: openaiAvailable && geminiAvailable && this.config.enableParallelAI
    }
  }
  
  // 설정 업데이트
  public updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('🔧 [ParallelAI] 설정 업데이트:', newConfig)
  }
  
  // 현재 설정 조회
  public getConfig(): AIServiceConfig {
    // API 키는 민감정보이므로 마스킹
    return {
      ...this.config,
      openaiApiKey: this.config.openaiApiKey ? '[SET]' : '[NOT_SET]',
      geminiApiKey: this.config.geminiApiKey ? '[SET]' : '[NOT_SET]'
    } as AIServiceConfig
  }
  
  // 타임아웃 프로미스 생성 헬퍼
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`요청 타임아웃 (${timeoutMs}ms)`))
      }, timeoutMs)
    })
  }

  // Private methods - 재시도 없는 간단한 병렬 요청
  private async executeParallelRequests(noun: string) {
    const promises: Promise<PredicateCandidate[]>[] = []
    
    // OpenAI와 Gemini 동시 요청 (재시도 없음)
    if (this.openaiService) {
      promises.push(this.requestOpenAI(noun))
    }
    
    if (this.geminiService) {
      promises.push(this.requestGemini(noun))
    }
    
    if (promises.length === 0) {
      throw new Error('사용 가능한 AI 서비스가 없습니다')
    }
    
    // Promise.allSettled로 모든 요청 병렬 실행 (실패해도 다른 요청은 계속)
    const results = await Promise.allSettled(promises)
    
    const openaiResult = this.openaiService ? results[0] : null
    const geminiResult = this.geminiService ? results[promises.length === 2 ? 1 : 0] : null
    
    return [
      { 
        success: openaiResult?.status === 'fulfilled', 
        result: openaiResult?.status === 'fulfilled' ? openaiResult.value : null,
        attempts: 1, 
        totalTime: 0,
        lastError: openaiResult?.status === 'rejected' ? openaiResult.reason : undefined
      },
      { 
        success: geminiResult?.status === 'fulfilled', 
        result: geminiResult?.status === 'fulfilled' ? geminiResult.value : null,
        attempts: 1, 
        totalTime: 0,
        lastError: geminiResult?.status === 'rejected' ? geminiResult.reason : undefined
      }
    ]
  }
  
  private async requestSingle(noun: string): Promise<ParallelAIResponse> {
    const startTime = Date.now()
    
    // OpenAI 우선 시도
    if (this.openaiService) {
      try {
        const openaiResults = await this.requestOpenAI(noun)
        return {
          openaiResults,
          geminiResults: null,
          combinedResults: openaiResults,
          processingTimeMs: Date.now() - startTime
        }
      } catch (error) {
        console.log('⚠️ [ParallelAI] OpenAI 실패, Gemini 시도')
      }
    }
    
    // Gemini 폴백
    if (this.geminiService) {
      try {
        const geminiResults = await this.requestGemini(noun)
        return {
          openaiResults: null,
          geminiResults,
          combinedResults: geminiResults,
          processingTimeMs: Date.now() - startTime
        }
      } catch (error) {
        console.log('❌ [ParallelAI] 모든 AI 서비스 실패')
      }
    }
    
    // 모든 서비스 실패
    return {
      openaiResults: null,
      geminiResults: null,
      combinedResults: [],
      processingTimeMs: Date.now() - startTime
    }
  }
  
  private mergeBasicResults(
    openaiResults: PredicateCandidate[] | null,
    geminiResults: PredicateCandidate[] | null
  ): PredicateCandidate[] {
    const combined: PredicateCandidate[] = []
    
    // OpenAI 결과 우선 추가
    if (openaiResults) {
      combined.push(...openaiResults)
    }
    
    // Gemini 결과 추가 (간단한 중복 제거)
    if (geminiResults) {
      geminiResults.forEach(geminiItem => {
        const isDuplicate = combined.some(existing => 
          existing.text.trim().toLowerCase() === geminiItem.text.trim().toLowerCase()
        )
        if (!isDuplicate) {
          combined.push(geminiItem)
        }
      })
    }
    
    return combined
  }
  
  // 디버깅 정보 제공
  public getDebugInfo(): {
    servicesInitialized: boolean
    config: AIServiceConfig
    availability: {
      openai: boolean
      gemini: boolean
      canParallel: boolean
    }
    recentMetrics: any
  } {
    return {
      servicesInitialized: !!(this.openaiService || this.geminiService),
      config: this.getConfig(),
      availability: this.getServiceAvailability(),
      recentMetrics: this.logger.getCurrentMetrics()
    }
  }
}

export default ParallelAIService.getInstance()