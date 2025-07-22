// ChatGPT-4o Evaluation Service
// AIDEV-NOTE: 병합된 AI 응답을 ChatGPT-4o로 평가하여 15개 서술어를 선별하는 시스템

import { 
  PredicateCandidate, 
  EvaluatedPredicates
} from '../utils/types/aiTypes'
import PromptManager from '../utils/PromptManager'
import errorHandler from '../utils/ErrorHandler'
import communicationLogger from '../utils/AICommunicationLogger'

export interface EvaluationConfig {
  model: string
  maxTokens: number
  temperature: number
  targetCount: number
  timeoutMs: number
  enableValidation: boolean
}

export interface EvaluationMetrics {
  originalCount: number
  evaluatedCount: number
  processingTimeMs: number
  tokensUsed?: number
  qualityScore: number
  categoryDistribution: Record<string, number>
}

export class EvaluationService {
  private static instance: EvaluationService
  private openaiApiKey: string
  private promptManager: typeof PromptManager
  private errorHandler: typeof errorHandler
  private logger: typeof communicationLogger
  
  private config: EvaluationConfig = {
    model: 'gpt-4o',
    maxTokens: 800,
    temperature: 0.7,
    targetCount: 15,
    timeoutMs: 10000,
    enableValidation: true
  }
  
  private constructor() {
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || ''
    this.promptManager = PromptManager
    this.errorHandler = errorHandler
    this.logger = communicationLogger
    
    if (!this.openaiApiKey) {
      console.warn('⚠️ [EvaluationService] OpenAI API 키가 설정되지 않음')
    } else {
      console.log('🧠 [EvaluationService] ChatGPT-4o 평가 서비스 초기화 완료')
    }
  }
  
  public static getInstance(): EvaluationService {
    if (!EvaluationService.instance) {
      EvaluationService.instance = new EvaluationService()
    }
    return EvaluationService.instance
  }
  
  // 메인 평가 메서드
  public async evaluatePredicates(
    candidateArray: PredicateCandidate[],
    originalNoun: string
  ): Promise<EvaluatedPredicates> {
    const startTime = Date.now()
    
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API 키가 설정되지 않음')
    }
    
    if (!candidateArray || candidateArray.length === 0) {
      throw new Error('평가할 서술어 후보가 없습니다')
    }
    
    console.log(`🧠 [EvaluationService] 평가 시작: ${candidateArray.length}개 후보 → ${this.config.targetCount}개 선별`)
    
    try {
      // 1. 프롬프트 생성
      const evaluationPrompt = this.createEvaluationPrompt(candidateArray, originalNoun)
      
      // 2. ChatGPT-4o 호출 (재시도 없음으로 응답성 개선)
      console.log(`🧠 [EvaluationService] ChatGPT-4o 평가 요청 시작`)
      
      const response = await Promise.race([
        this.callChatGPT4o(evaluationPrompt),
        this.createTimeoutPromise(this.config.timeoutMs)
      ])
      
      console.log(`✅ [EvaluationService] ChatGPT-4o 평가 응답 수신`)
      
      // 3. 응답 파싱
      const evaluatedPredicates = this.parseEvaluationResponse(response)
      
      // 4. 결과 검증
      if (this.config.enableValidation) {
        this.validateEvaluationResult(evaluatedPredicates, originalNoun)
      }
      
      const processingTime = Date.now() - startTime
      
      // 5. 메타데이터 생성
      const evaluationMeta = {
        evaluator: 'gpt-4o' as const,
        originalCount: candidateArray.length,
        finalCount: evaluatedPredicates.length,
        timestamp: new Date().toISOString(),
        processingTimeMs: processingTime
      }
      
      // 6. 로깅
      this.logger.logEvaluation(
        candidateArray.length,
        evaluatedPredicates.length,
        processingTime,
        true
      )
      
      console.log(`✅ [EvaluationService] 평가 완료: ${evaluatedPredicates.length}개 선별 (${processingTime}ms)`)
      
      return {
        predicates: evaluatedPredicates,
        evaluationMeta
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      this.logger.logEvaluation(candidateArray.length, 0, processingTime, false, error as Error)
      
      console.error('❌ [EvaluationService] 평가 실패:', error)
      throw error
    }
  }
  
  // 평가 없이 기본 정렬 적용
  public applyBasicEvaluation(
    candidateArray: PredicateCandidate[],
    _originalNoun: string
  ): EvaluatedPredicates {
    console.log(`🔄 [EvaluationService] 기본 평가 적용: ${candidateArray.length}개 → ${this.config.targetCount}개`)
    
    // 1. 중복 제거 (정규화된 텍스트 기준)
    const deduped = this.removeDuplicates(candidateArray)
    
    // 2. 카테고리별 정렬 (요청 우선)
    const sorted = this.sortByPriority(deduped)
    
    // 3. 타겟 개수로 제한
    const limited = sorted.slice(0, this.config.targetCount)
    
    const evaluationMeta = {
      evaluator: 'gpt-4o' as const,
      originalCount: candidateArray.length,
      finalCount: limited.length,
      timestamp: new Date().toISOString(),
      processingTimeMs: 0
    }
    
    console.log(`✅ [EvaluationService] 기본 평가 완료: ${limited.length}개`)
    
    return {
      predicates: limited,
      evaluationMeta
    }
  }
  
  // 평가 가능 여부 확인
  public canEvaluate(): boolean {
    return !!this.openaiApiKey
  }
  
  // 평가 설정 업데이트
  public updateConfig(newConfig: Partial<EvaluationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('🔧 [EvaluationService] 설정 업데이트:', newConfig)
  }
  
  // 현재 설정 조회
  public getConfig(): EvaluationConfig {
    return { ...this.config }
  }
  
  // 평가 메트릭스 생성
  public generateMetrics(
    originalCandidates: PredicateCandidate[],
    evaluatedResult: EvaluatedPredicates
  ): EvaluationMetrics {
    // 카테고리 분포 계산
    const categoryDistribution = evaluatedResult.predicates.reduce((dist, item) => {
      const category = item.category || 'general'
      dist[category] = (dist[category] || 0) + 1
      return dist
    }, {} as Record<string, number>)
    
    // 품질 점수 계산 (간단한 휴리스틱)
    let qualityScore = 100
    
    // 요청 카테고리 비율 확인
    const requestCount = evaluatedResult.predicates.filter(p => 
      p.category === '요청' || p.category === 'request'
    ).length
    const requestRatio = requestCount / evaluatedResult.predicates.length
    
    if (requestRatio < 0.3) {
      qualityScore -= 15 // 요청 문장이 적으면 점수 차감
    }
    
    // 카테고리 다양성 확인
    const uniqueCategories = Object.keys(categoryDistribution).length
    if (uniqueCategories < 3) {
      qualityScore -= 10 // 카테고리 다양성이 낮으면 점수 차감
    }
    
    return {
      originalCount: originalCandidates.length,
      evaluatedCount: evaluatedResult.predicates.length,
      processingTimeMs: evaluatedResult.evaluationMeta.processingTimeMs,
      qualityScore: Math.max(0, qualityScore),
      categoryDistribution
    }
  }
  
  // 타임아웃 프로미스 생성 헬퍼
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`ChatGPT-4o 평가 타임아웃 (${timeoutMs}ms)`))
      }, timeoutMs)
    })
  }

  // Private methods
  private createEvaluationPrompt(candidateArray: PredicateCandidate[], originalNoun: string): string {
    return this.promptManager.interpolateTemplate('gpt4o-evaluation', {
      CANDIDATE_ARRAY: JSON.stringify(candidateArray, null, 2),
      ORIGINAL_NOUN: originalNoun
    })
  }
  
  private async callChatGPT4o(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '당신은 자폐장애인을 위한 의사소통 보조 시스템의 전문 평가자입니다. 항상 정확한 JSON 형태로 응답해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    })
    
    if (!response.ok) {
      throw this.errorHandler.analyzeHttpError(response)
    }
    
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    
    if (!content) {
      throw new Error('ChatGPT-4o 응답에서 내용을 찾을 수 없습니다')
    }
    
    return content
  }
  
  private parseEvaluationResponse(response: string): PredicateCandidate[] {
    try {
      // JSON 마크다운 제거
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      
      if (!parsed.predicates || !Array.isArray(parsed.predicates)) {
        throw new Error('응답에서 predicates 배열을 찾을 수 없습니다')
      }
      
      return parsed.predicates.map((p: any, index: number) => {
        if (!p.text || typeof p.text !== 'string') {
          throw new Error(`항목 ${index + 1}: text 필드가 유효하지 않습니다`)
        }
        
        return {
          text: p.text.trim(),
          emoji: p.emoji || '😊',
          category: p.category || 'general'
        }
      })
      
    } catch (error) {
      console.error('❌ [ChatGPT-4o] JSON 파싱 실패 - 원본 응답:', error)
      console.error('📄 [ChatGPT-4o] 받은 전체 응답 내용:')
      console.error('==================== 시작 ====================')
      console.error(response)
      console.error('==================== 끝 =====================')
      throw new Error(`ChatGPT-4o 응답 파싱 실패: ${(error as Error).message}`)
    }
  }
  
  private validateEvaluationResult(predicates: PredicateCandidate[], _originalNoun: string): void {
    if (predicates.length === 0) {
      throw new Error('평가 결과가 비어있습니다')
    }
    
    if (predicates.length > this.config.targetCount + 5) {
      console.warn(`⚠️ [EvaluationService] 예상보다 많은 결과: ${predicates.length}개`)
    }
    
    // 필수 필드 검증
    predicates.forEach((predicate, index) => {
      if (!predicate.text || predicate.text.trim() === '') {
        throw new Error(`항목 ${index + 1}: 텍스트가 비어있습니다`)
      }
      
      if (predicate.text.length > 30) {
        console.warn(`⚠️ [EvaluationService] 항목 ${index + 1}: 텍스트가 너무 깁니다 (${predicate.text.length}자)`)
      }
    })
    
    // 중복 검사
    const texts = predicates.map(p => p.text.trim().toLowerCase())
    const uniqueTexts = new Set(texts)
    
    if (uniqueTexts.size < texts.length) {
      console.warn(`⚠️ [EvaluationService] 중복된 서술어가 포함되어 있습니다`)
    }
  }
  
  private removeDuplicates(items: PredicateCandidate[]): PredicateCandidate[] {
    const seen = new Set<string>()
    const result: PredicateCandidate[] = []
    
    items.forEach(item => {
      const normalized = item.text.trim().toLowerCase().replace(/\s+/g, ' ')
      if (!seen.has(normalized)) {
        seen.add(normalized)
        result.push(item)
      }
    })
    
    return result
  }
  
  private sortByPriority(items: PredicateCandidate[]): PredicateCandidate[] {
    const categoryPriority: Record<string, number> = {
      '요청': 1,
      'request': 1,
      '감정': 2,
      'emotion': 2,
      '상태': 3,
      'state': 3,
      'general': 4,
      '기타': 5
    }
    
    return items.sort((a, b) => {
      const aPriority = categoryPriority[a.category] || 10
      const bPriority = categoryPriority[b.category] || 10
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      return a.text.length - b.text.length
    })
  }
  
  // 평가 결과 디버깅 정보
  public getDebugInfo(): {
    isConfigured: boolean
    config: EvaluationConfig
    promptTemplate: string
    recentMetrics: any
  } {
    return {
      isConfigured: !!this.openaiApiKey,
      config: this.getConfig(),
      promptTemplate: this.promptManager.getEvaluationPrompt(),
      recentMetrics: this.logger.getCurrentMetrics()
    }
  }
}

export default EvaluationService.getInstance()