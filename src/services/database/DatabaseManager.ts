import { TursoClient, getTursoClient } from './tursoClient'
import { CacheService } from './cacheService'
import { logError } from '../../utils/logger'

/**
 * 데이터베이스 및 캐시 서비스 통합 관리자
 * - 싱글톤 패턴으로 앱 전체에서 하나의 인스턴스만 사용
 * - 앱 시작 시 한 번만 초기화하여 성능 최적화
 * - Hot Module Replacement (HMR) 지원
 */
export class DatabaseManager {
  private static instance: DatabaseManager | null = null
  private tursoClient: TursoClient | null = null
  private cacheService: CacheService | null = null
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null

  private constructor() {
    // 싱글톤 패턴을 위한 private 생성자
  }

  /**
   * DatabaseManager 싱글톤 인스턴스 반환
   */
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  /**
   * 데이터베이스 및 캐시 서비스 초기화
   * - 중복 호출 시 기존 초기화 Promise 반환 (중복 방지)
   * - 마이그레이션은 Turso 연결 시 자동 실행
   */
  async initialize(): Promise<void> {
    // 이미 초기화 중이면 기존 Promise 반환
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    // 이미 초기화 완료되었으면 즉시 반환
    if (this.isInitialized) {
      return Promise.resolve()
    }

    // 새로운 초기화 시작
    this.initializationPromise = this.performInitialization()
    return this.initializationPromise
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 [DatabaseManager] 데이터베이스 초기화 시작...')
      
      // 1. Turso 클라이언트 초기화 (마이그레이션 포함)
      this.tursoClient = await getTursoClient()
      
      // 2. 캐시 서비스 초기화
      this.cacheService = new CacheService()
      await this.cacheService.initialize()
      
      this.isInitialized = true
      console.log('✅ [DatabaseManager] 데이터베이스 초기화 완료')
      
    } catch (error) {
      console.error('❌ [DatabaseManager] 데이터베이스 초기화 실패:', error)
      logError('DatabaseManager 초기화 실패', error)
      
      // 초기화 실패 시 상태 리셋
      this.initializationPromise = null
      this.isInitialized = false
      
      throw error
    }
  }

  /**
   * 캐시 서비스 반환
   * @throws {Error} 초기화되지 않은 경우
   */
  getCacheService(): CacheService {
    if (!this.cacheService || !this.isInitialized) {
      throw new Error('DatabaseManager가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.')
    }
    return this.cacheService
  }

  /**
   * Turso 클라이언트 반환
   * @throws {Error} 초기화되지 않은 경우
   */
  getTursoClient(): TursoClient {
    if (!this.tursoClient || !this.isInitialized) {
      throw new Error('DatabaseManager가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.')
    }
    return this.tursoClient
  }

  /**
   * 초기화 상태 확인
   */
  get initialized(): boolean {
    return this.isInitialized
  }

  /**
   * 서비스 종료 (테스트용)
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🔄 [DatabaseManager] 서비스 종료 시작...')
      
      if (this.cacheService) {
        await this.cacheService.shutdown()
        this.cacheService = null
      }
      
      if (this.tursoClient) {
        await this.tursoClient.disconnect()
        this.tursoClient = null
      }
      
      this.isInitialized = false
      this.initializationPromise = null
      
      console.log('✅ [DatabaseManager] 서비스 종료 완료')
      
    } catch (error) {
      logError('DatabaseManager 종료 실패', error)
      throw error
    }
  }

  /**
   * 인스턴스 리셋 (테스트용)
   */
  static reset(): void {
    if (DatabaseManager.instance) {
      DatabaseManager.instance = null
    }
  }
}

// 편의 함수들
export const dbManager = DatabaseManager.getInstance()

/**
 * 앱 전체에서 사용할 데이터베이스 초기화 함수
 */
export async function initializeDatabase(): Promise<void> {
  return dbManager.initialize()
}

/**
 * 캐시 서비스 반환 (전역 사용)
 */
export function getCacheService(): CacheService {
  return dbManager.getCacheService()
}

/**
 * Turso 클라이언트 반환 (전역 사용)
 */
export function getTursoDatabase(): TursoClient {
  return dbManager.getTursoClient()
}