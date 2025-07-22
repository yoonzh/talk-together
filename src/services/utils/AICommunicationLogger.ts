// AI Communication Logging and Monitoring System
// AIDEV-NOTE: 병렬 AI 요청 통신 상황을 간략하게 로깅하고 분석하는 시스템

import { CommunicationLog, AIServiceStatus, CommunicationStatus } from './types/aiTypes'

export interface SessionSummary {
  sessionId: string
  startTime: string
  endTime?: string
  totalRequests: number
  serviceStats: Record<string, {
    success: number
    failed: number
    timeout: number
    averageResponseTime: number
  }>
  overallSuccessRate: number
}

export interface CommunicationMetrics {
  totalRequests: number
  successRate: number
  averageResponseTime: number
  servicePerformance: Record<string, {
    requests: number
    successRate: number
    averageTime: number
    lastStatus: AIServiceStatus
  }>
  recentErrors: string[]
}

export class AICommunicationLogger {
  private static instance: AICommunicationLogger
  private logs: CommunicationLog[] = []
  private currentSession: SessionSummary
  private maxLogsRetention = 100 // 최근 100개 로그만 유지
  private logLevel: 'minimal' | 'detailed' = 'minimal'
  
  private constructor() {
    this.currentSession = this.createNewSession()
    this.logLevel = (import.meta.env.VITE_AI_COMMUNICATION_LOG_LEVEL as any) || 'minimal'
    console.log(`📊 [CommLogger] 초기화 완료 (레벨: ${this.logLevel})`)
  }
  
  public static getInstance(): AICommunicationLogger {
    if (!AICommunicationLogger.instance) {
      AICommunicationLogger.instance = new AICommunicationLogger()
    }
    return AICommunicationLogger.instance
  }
  
  // 개별 AI 서비스 요청 로깅
  public logRequest(
    service: string,
    status: AIServiceStatus,
    duration: number,
    error?: Error,
    requestData?: any,
    responseData?: any
  ): void {
    const timestamp = new Date().toISOString()
    
    // 간략한 콘솔 로깅 (항상 출력)
    const statusIcon = this.getStatusIcon(status)
    const errorMsg = error ? ` - ${error.message}` : ''
    console.log(`🤖 [${service}] ${statusIcon} ${status} (${duration}ms)${errorMsg}`)
    
    // 상세 로그 저장 (detailed 모드일 때만)
    const logEntry: CommunicationLog = {
      timestamp,
      service: service as any,
      status,
      duration,
      error: error?.message,
      ...(this.logLevel === 'detailed' && {
        requestData: this.sanitizeData(requestData),
        responseData: this.sanitizeData(responseData)
      })
    }
    
    this.logs.push(logEntry)
    this.maintainLogSize()
    this.updateSessionStats(service, status, duration)
  }
  
  // 병렬 요청 결과 로깅
  public logParallelRequest(
    inputWord: string,
    communicationStatus: CommunicationStatus,
    totalDuration: number,
    resultCount: number
  ): void {
    const summary = this.formatCommunicationStatus(communicationStatus)
    console.log(`🔄 [Parallel] "${inputWord}" → ${summary} (${totalDuration}ms, ${resultCount}개 결과)`)
    
    // 각 서비스별 상태 로깅
    Object.entries(communicationStatus).forEach(([service, status]) => {
      if (status !== 'success') {
        console.log(`⚠️ [${service}] ${status}`)
      }
    })
  }
  
  // 평가 요청 로깅
  public logEvaluation(
    originalCount: number,
    finalCount: number,
    duration: number,
    success: boolean,
    error?: Error
  ): void {
    if (success) {
      console.log(`🧠 [GPT-4o] 평가 완료 (${originalCount}→${finalCount}개, ${duration}ms)`)
    } else {
      console.log(`❌ [GPT-4o] 평가 실패 (${duration}ms) - ${error?.message}`)
    }
  }
  
  // 폴백 로깅
  public logFallback(
    level: number,
    reason: string,
    finalResultCount: number
  ): void {
    const levelName = ['완전성공', '부분성공', '평가없음', '응급폴백'][level] || '알수없음'
    console.log(`🔄 [Fallback] Level ${level} (${levelName}): ${reason} → ${finalResultCount}개`)
  }
  
  // 캐시 상호작용 로깅
  public logCache(
    operation: 'hit' | 'miss' | 'write',
    inputWord: string,
    cacheType?: 'evaluated' | 'legacy'
  ): void {
    const icons = { hit: '🎯', miss: '🔍', write: '💾' }
    const typeInfo = cacheType ? ` (${cacheType})` : ''
    console.log(`${icons[operation]} [Cache] ${operation} "${inputWord}"${typeInfo}`)
  }
  
  // 세션 요약 생성
  public getSessionSummary(): string {
    const stats = this.currentSession.serviceStats
    const summary = Object.entries(stats)
      .map(([service, stat]) => {
        const total = stat.success + stat.failed + stat.timeout
        const successRate = total > 0 ? Math.round((stat.success / total) * 100) : 0
        return `${service}: ${stat.success}✅ ${stat.failed}❌ ${stat.timeout}⏰ (${successRate}%)`
      })
      .join(' | ')
    
    return summary || '활동 없음'
  }
  
  // 실시간 메트릭스 조회
  public getCurrentMetrics(): CommunicationMetrics {
    const recentLogs = this.logs.slice(-20) // 최근 20개
    const totalRequests = recentLogs.length
    const successCount = recentLogs.filter(log => log.status === 'success').length
    const totalDuration = recentLogs.reduce((sum, log) => sum + log.duration, 0)
    
    // 서비스별 성능 계산
    const servicePerformance: Record<string, any> = {}
    const serviceGroups = this.groupLogsByService(recentLogs)
    
    Object.entries(serviceGroups).forEach(([service, logs]) => {
      const requests = logs.length
      const successes = logs.filter(log => log.status === 'success').length
      const avgTime = logs.reduce((sum, log) => sum + log.duration, 0) / requests
      
      servicePerformance[service] = {
        requests,
        successRate: Math.round((successes / requests) * 100),
        averageTime: Math.round(avgTime),
        lastStatus: logs[logs.length - 1]?.status || 'unknown'
      }
    })
    
    // 최근 에러 메시지
    const recentErrors = recentLogs
      .filter(log => log.error)
      .slice(-3)
      .map(log => `${log.service}: ${log.error}`)
    
    return {
      totalRequests,
      successRate: totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 0,
      averageResponseTime: totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0,
      servicePerformance,
      recentErrors
    }
  }
  
  // 성능 보고서 생성
  public generatePerformanceReport(): {
    summary: string
    details: CommunicationMetrics
    recommendations: string[]
  } {
    const metrics = this.getCurrentMetrics()
    const recommendations: string[] = []
    
    // 성능 분석 및 권장사항
    if (metrics.successRate < 80) {
      recommendations.push('전체 성공률이 낮습니다. 네트워크 연결을 확인하세요.')
    }
    
    if (metrics.averageResponseTime > 5000) {
      recommendations.push('응답 시간이 느립니다. 타임아웃 설정을 검토하세요.')
    }
    
    Object.entries(metrics.servicePerformance).forEach(([service, perf]) => {
      if (perf.successRate < 70) {
        recommendations.push(`${service} 서비스 성능이 저하되었습니다.`)
      }
    })
    
    if (recommendations.length === 0) {
      recommendations.push('모든 서비스가 정상 작동 중입니다.')
    }
    
    return {
      summary: this.getSessionSummary(),
      details: metrics,
      recommendations
    }
  }
  
  // 로그 레벨 변경
  public setLogLevel(level: 'minimal' | 'detailed'): void {
    this.logLevel = level
    console.log(`📊 [CommLogger] 로그 레벨 변경: ${level}`)
  }
  
  // 세션 리셋
  public resetSession(): void {
    this.currentSession = this.createNewSession()
    this.logs = []
    console.log(`📊 [CommLogger] 새 세션 시작: ${this.currentSession.sessionId}`)
  }
  
  // Private helper methods
  private getStatusIcon(status: AIServiceStatus): string {
    const icons = {
      success: '✅',
      failed: '❌',
      timeout: '⏰'
    }
    return icons[status] || '❓'
  }
  
  private formatCommunicationStatus(status: CommunicationStatus): string {
    const results = Object.entries(status).map(([service, stat]) => {
      const icon = this.getStatusIcon(stat)
      return `${service}:${icon}`
    })
    return results.join(' ')
  }
  
  private sanitizeData(data: any): any {
    if (!data) return undefined
    
    // API 키 등 민감 정보 제거
    const sanitized = JSON.parse(JSON.stringify(data))
    if (typeof sanitized === 'object') {
      this.removeSensitiveFields(sanitized)
    }
    return sanitized
  }
  
  private removeSensitiveFields(obj: any): void {
    const sensitiveKeys = ['apikey', 'authorization', 'token', 'key', 'secret']
    
    Object.keys(obj).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        obj[key] = '[REDACTED]'
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.removeSensitiveFields(obj[key])
      }
    })
  }
  
  private maintainLogSize(): void {
    if (this.logs.length > this.maxLogsRetention) {
      this.logs = this.logs.slice(-this.maxLogsRetention)
    }
  }
  
  private createNewSession(): SessionSummary {
    return {
      sessionId: Date.now().toString(),
      startTime: new Date().toISOString(),
      totalRequests: 0,
      serviceStats: {},
      overallSuccessRate: 0
    }
  }
  
  private updateSessionStats(service: string, status: AIServiceStatus, duration: number): void {
    if (!this.currentSession.serviceStats[service]) {
      this.currentSession.serviceStats[service] = {
        success: 0,
        failed: 0,
        timeout: 0,
        averageResponseTime: 0
      }
    }
    
    const stats = this.currentSession.serviceStats[service]
    stats[status]++
    
    // 평균 응답 시간 업데이트 (이동 평균)
    const totalResponses = stats.success + stats.failed + stats.timeout
    stats.averageResponseTime = Math.round(
      (stats.averageResponseTime * (totalResponses - 1) + duration) / totalResponses
    )
    
    this.currentSession.totalRequests++
  }
  
  private groupLogsByService(logs: CommunicationLog[]): Record<string, CommunicationLog[]> {
    return logs.reduce((groups, log) => {
      if (!groups[log.service]) {
        groups[log.service] = []
      }
      groups[log.service].push(log)
      return groups
    }, {} as Record<string, CommunicationLog[]>)
  }
}

export default AICommunicationLogger.getInstance()