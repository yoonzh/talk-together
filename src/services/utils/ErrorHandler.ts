// AI Service Error Handling and Retry Logic
// AIDEV-NOTE: 병렬 AI 요청에서 발생하는 에러 처리 및 지능적 재시도 시스템

import { AIServiceError, AIServiceStatus } from './types/aiTypes'

export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  timeoutMs: number
  exponentialBackoff: boolean
  retryableErrors: string[]
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  attempts: number
  totalTime: number
  lastError?: Error
}

export class AIErrorHandler {
  private static instance: AIErrorHandler
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 8000,
    timeoutMs: 8000,
    exponentialBackoff: true,
    retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN']
  }
  
  private constructor() {}
  
  public static getInstance(): AIErrorHandler {
    if (!AIErrorHandler.instance) {
      AIErrorHandler.instance = new AIErrorHandler()
    }
    return AIErrorHandler.instance
  }
  
  // 재시도 로직이 포함된 작업 실행
  public async withRetry<T>(
    operation: () => Promise<T>,
    serviceName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = { ...this.defaultRetryConfig, ...customConfig }
    const startTime = Date.now()
    let lastError: Error | undefined
    
    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        console.log(`🔄 [${serviceName}] 시도 ${attempt}/${config.maxRetries + 1}`)
        
        // 타임아웃 래퍼
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise<T>(config.timeoutMs, serviceName)
        ])
        
        const totalTime = Date.now() - startTime
        console.log(`✅ [${serviceName}] 성공 (${totalTime}ms, 시도: ${attempt})`)
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime,
        }
        
      } catch (error) {
        lastError = error as Error
        const isRetryable = this.isRetryableError(lastError, config)
        const isLastAttempt = attempt === config.maxRetries + 1
        
        console.log(`⚠️ [${serviceName}] 시도 ${attempt} 실패: ${lastError.message}`)
        
        if (isLastAttempt || !isRetryable) {
          console.log(`❌ [${serviceName}] 최종 실패 (재시도 ${isRetryable ? '불가' : '소진'})`)
          break
        }
        
        // 지연 후 재시도
        const delay = this.calculateDelay(attempt, config)
        console.log(`⏳ [${serviceName}] ${delay}ms 후 재시도`)
        await this.delay(delay)
      }
    }
    
    const totalTime = Date.now() - startTime
    return {
      success: false,
      attempts: config.maxRetries + 1,
      totalTime,
      lastError
    }
  }
  
  // 병렬 작업 에러 처리
  public async withParallelRetry<T>(
    operations: Array<{
      operation: () => Promise<T>
      serviceName: string
      config?: Partial<RetryConfig>
    }>
  ): Promise<Array<RetryResult<T>>> {
    const results = await Promise.allSettled(
      operations.map(({ operation, serviceName, config }) =>
        this.withRetry(operation, serviceName, config)
      )
    )
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        console.error(`❌ [ParallelRetry] ${operations[index].serviceName} 실패:`, result.reason)
        return {
          success: false,
          attempts: 0,
          totalTime: 0,
          lastError: result.reason
        }
      }
    })
  }
  
  // AI 서비스 전용 에러 생성
  public createAIServiceError(
    message: string,
    service: string,
    statusCode?: number,
    retryable: boolean = true
  ): AIServiceError {
    const error = new Error(message) as AIServiceError
    error.service = service
    error.retryable = retryable
    error.statusCode = statusCode
    error.name = 'AIServiceError'
    
    return error
  }
  
  // HTTP 에러 상태 분석
  public analyzeHttpError(response: Response): AIServiceError {
    const statusCode = response.status
    let retryable = false
    let message = `HTTP ${statusCode}: ${response.statusText}`
    
    // 재시도 가능한 HTTP 상태 코드
    if ([408, 429, 500, 502, 503, 504].includes(statusCode)) {
      retryable = true
    }
    
    // 특별한 처리가 필요한 상태 코드
    switch (statusCode) {
      case 401:
        message = 'API 키가 유효하지 않습니다'
        retryable = false
        break
      case 403:
        message = 'API 접근 권한이 없습니다'
        retryable = false
        break
      case 429:
        message = 'API 요청 한도를 초과했습니다'
        retryable = true
        break
      case 500:
        message = '서버 내부 오류가 발생했습니다'
        retryable = true
        break
    }
    
    return this.createAIServiceError(message, 'HTTP', statusCode, retryable)
  }
  
  // 네트워크 에러 분석
  public analyzeNetworkError(error: Error): AIServiceError {
    const message = error.message.toLowerCase()
    let retryable = true
    
    // 재시도 불가능한 에러 패턴
    if (message.includes('invalid') || message.includes('unauthorized')) {
      retryable = false
    }
    
    return this.createAIServiceError(
      `네트워크 오류: ${error.message}`,
      'Network',
      undefined,
      retryable
    )
  }
  
  // 응답 상태 결정
  public determineServiceStatus(result: RetryResult<any>): AIServiceStatus {
    if (result.success) {
      return 'success'
    }
    
    if (result.lastError?.message.includes('timeout')) {
      return 'timeout'
    }
    
    return 'failed'
  }
  
  // 에러 재시도 가능성 판단
  private isRetryableError(error: Error, config: RetryConfig): boolean {
    const errorMessage = error.message.toLowerCase()
    
    // AIServiceError인 경우 retryable 속성 확인
    if ('retryable' in error) {
      return (error as AIServiceError).retryable
    }
    
    // 네트워크 에러 패턴 확인
    return config.retryableErrors.some(pattern => 
      errorMessage.includes(pattern.toLowerCase())
    ) || errorMessage.includes('timeout') || errorMessage.includes('connection')
  }
  
  // 재시도 지연 시간 계산
  private calculateDelay(attempt: number, config: RetryConfig): number {
    if (!config.exponentialBackoff) {
      return config.baseDelayMs
    }
    
    // 지수 백오프 + 지터
    const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1)
    const jitter = Math.random() * 0.1 * exponentialDelay // 10% 지터
    const finalDelay = Math.min(exponentialDelay + jitter, config.maxDelayMs)
    
    return Math.round(finalDelay)
  }
  
  // 타임아웃 프로미스 생성
  private createTimeoutPromise<T>(timeoutMs: number, serviceName: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(this.createAIServiceError(
          `타임아웃: ${timeoutMs}ms 초과`,
          serviceName,
          undefined,
          true
        ))
      }, timeoutMs)
    })
  }
  
  // 지연 유틸리티
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  // 에러 로깅 및 분석
  public logError(error: Error, context: string): void {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      ...(error as AIServiceError).service && { service: (error as AIServiceError).service },
      ...(error as AIServiceError).statusCode && { statusCode: (error as AIServiceError).statusCode }
    }
    
    console.error(`🚨 [ErrorHandler] ${context}:`, errorInfo)
  }
  
  // 서비스별 설정 업데이트
  public updateRetryConfig(serviceName: string, config: Partial<RetryConfig>): void {
    console.log(`🔧 [ErrorHandler] ${serviceName} 재시도 설정 업데이트:`, config)
    // 실제 구현에서는 서비스별 설정을 저장할 수 있음
  }
  
  // 회복력 지표 계산
  public calculateResilienceMetrics(results: RetryResult<any>[]): {
    successRate: number
    averageAttempts: number
    timeoutRate: number
    retryEffectiveness: number
  } {
    const total = results.length
    const successful = results.filter(r => r.success).length
    const timeouts = results.filter(r => 
      r.lastError?.message.includes('timeout')
    ).length
    
    const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0)
    const successfulRetries = results.filter(r => r.success && r.attempts > 1).length
    
    return {
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageAttempts: total > 0 ? totalAttempts / total : 0,
      timeoutRate: total > 0 ? (timeouts / total) * 100 : 0,
      retryEffectiveness: total > 0 ? (successfulRetries / total) * 100 : 0
    }
  }
}

export default AIErrorHandler.getInstance()