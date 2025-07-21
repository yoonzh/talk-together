import { createClient, Client, ResultSet } from '@libsql/client'
import { logError } from '../../utils/logger'
import { MigrationManager } from '../../database/migrations'

export interface TursoConfig {
  url: string
  authToken: string
}

export class TursoClient {
  private client: Client | null = null
  private config: TursoConfig
  private migrationManager: MigrationManager | null = null
  private isConnected = false

  constructor(config: TursoConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    try {
      console.log('🔌 [Turso] 데이터베이스 연결 시도...')
      
      this.client = createClient({
        url: this.config.url,
        authToken: this.config.authToken
      })

      // 연결 테스트
      await this.client.execute('SELECT 1')
      this.isConnected = true
      
      // 마이그레이션 매니저 초기화
      this.migrationManager = new MigrationManager(this.client)
      
      console.log('✅ [Turso] 데이터베이스 연결 성공')
      
      // 자동 마이그레이션 실행
      await this.runMigrations()
      
    } catch (error) {
      this.isConnected = false
      logError('Turso 데이터베이스 연결 실패', error)
      throw new Error(`데이터베이스 연결 실패: ${error}`)
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close()
      this.client = null
      this.isConnected = false
      console.log('🔌 [Turso] 데이터베이스 연결 해제')
    }
  }

  private ensureConnection(): Client {
    if (!this.client || !this.isConnected) {
      throw new Error('데이터베이스가 연결되지 않았습니다. connect()를 먼저 호출하세요.')
    }
    return this.client
  }

  async query(sql: string, params?: any[]): Promise<ResultSet> {
    const client = this.ensureConnection()
    
    try {
      console.log(`🔍 [Turso] Query: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`)
      const result = await client.execute({ sql, args: params || [] })
      return result
    } catch (error) {
      logError('Turso 쿼리 실행 실패', { sql, params, error })
      throw error
    }
  }

  async execute(sql: string, params?: any[]): Promise<ResultSet> {
    return this.query(sql, params)
  }

  async batch(statements: Array<{ sql: string; args?: any[] }>): Promise<ResultSet[]> {
    const client = this.ensureConnection()
    
    try {
      console.log(`📦 [Turso] Batch 실행: ${statements.length}개 명령`)
      const results = await client.batch(statements)
      return results
    } catch (error) {
      logError('Turso 배치 실행 실패', { statements, error })
      throw error
    }
  }

  async runMigrations(): Promise<void> {
    if (!this.migrationManager) {
      throw new Error('마이그레이션 매니저가 초기화되지 않았습니다')
    }
    
    try {
      await this.migrationManager.runMigrations()
    } catch (error) {
      logError('마이그레이션 실행 실패', error)
      throw error
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health_check')
      return result.rows.length > 0 && result.rows[0].health_check === 1
    } catch (error) {
      logError('Turso 헬스체크 실패', error)
      return false
    }
  }

  async getTableInfo(tableName: string): Promise<any[]> {
    const result = await this.query(`PRAGMA table_info(${tableName})`)
    return result.rows
  }

  async getSettings(): Promise<Record<string, string>> {
    try {
      const result = await this.query('SELECT setting_key, setting_value FROM system_settings')
      const settings: Record<string, string> = {}
      
      for (const row of result.rows) {
        settings[row.setting_key as string] = row.setting_value as string
      }
      
      return settings
    } catch (error) {
      // 테이블이 없는 경우 기본값 반환
      console.log('⚠️ [Turso] 시스템 설정 테이블 없음, 기본값 사용')
      return {
        ai_cache_duration_months: '3',
        tts_cache_max_size_mb: '100',
        cache_cleanup_interval_hours: '24'
      }
    }
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await this.execute(`
      INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, datetime('now'))
    `, [key, value])
    
    console.log(`⚙️ [Turso] 설정 업데이트: ${key} = ${value}`)
  }

  get isHealthy(): boolean {
    return this.isConnected && this.client !== null
  }

  get clientInfo(): string {
    return `Turso Client (연결: ${this.isConnected ? '활성' : '비활성'})`
  }
}

// 싱글톤 인스턴스 생성 함수
export function createTursoClient(): TursoClient {
  const url = import.meta.env.VITE_TURSO_DATABASE_URL || import.meta.env.TURSO_DATABASE_URL
  const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN || import.meta.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    throw new Error('Turso 데이터베이스 설정이 없습니다. TURSO_DATABASE_URL과 TURSO_AUTH_TOKEN을 설정하세요.')
  }

  return new TursoClient({ url, authToken })
}

// AIDEV-NOTE: 전역 클라이언트 인스턴스 - 앱에서 하나의 연결만 사용
let globalTursoClient: TursoClient | null = null

export async function getTursoClient(): Promise<TursoClient> {
  if (!globalTursoClient) {
    globalTursoClient = createTursoClient()
    await globalTursoClient.connect()
  }
  
  return globalTursoClient
}

export async function closeTursoClient(): Promise<void> {
  if (globalTursoClient) {
    await globalTursoClient.disconnect()
    globalTursoClient = null
  }
}