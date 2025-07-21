import { Client } from '@libsql/client'

export interface Migration {
  id: string
  description: string
  sql: string
  rollback?: string
}

export const migrations: Migration[] = [
  {
    id: '001_initial_schema',
    description: 'Create initial database schema',
    sql: `
      -- AI 서술어 캐시 테이블
      CREATE TABLE IF NOT EXISTS ai_predicate_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        input_word VARCHAR(100) NOT NULL,
        ai_response TEXT NOT NULL,
        model_name VARCHAR(50) NOT NULL,
        response_source VARCHAR(20) DEFAULT 'api',
        response_hash VARCHAR(64) UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        access_count INTEGER DEFAULT 1,
        last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_input_word ON ai_predicate_cache(input_word);
      CREATE INDEX IF NOT EXISTS idx_expires_at ON ai_predicate_cache(expires_at);
      CREATE INDEX IF NOT EXISTS idx_response_source ON ai_predicate_cache(response_source);

      -- TTS 오디오 캐시 테이블
      CREATE TABLE IF NOT EXISTS tts_audio_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sentence_text TEXT NOT NULL,
        sentence_hash VARCHAR(64) UNIQUE NOT NULL,
        audio_data TEXT,
        compression_type VARCHAR(20) DEFAULT 'base64_gzip',
        audio_format VARCHAR(10) DEFAULT 'mp3',
        duration_ms INTEGER,
        file_size_bytes INTEGER,
        compressed_size_bytes INTEGER,
        voice_config TEXT,
        tts_provider VARCHAR(20) DEFAULT 'gcp',
        is_api_generated BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 1,
        last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sentence_hash ON tts_audio_cache(sentence_hash);
      CREATE INDEX IF NOT EXISTS idx_is_api_generated ON tts_audio_cache(is_api_generated);

      -- 시스템 설정 테이블
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 기본 설정값 삽입
      INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
      ('ai_cache_duration_months', '3', 'AI 서술어 캐시 유지 기간 (개월)'),
      ('tts_cache_max_size_mb', '100', 'TTS 오디오 캐시 최대 크기 (MB)'),
      ('db_schema_version', '1.0.0', '데이터베이스 스키마 버전');
    `,
    rollback: `
      DROP TABLE IF EXISTS ai_predicate_cache;
      DROP TABLE IF EXISTS tts_audio_cache;
      DROP TABLE IF EXISTS system_settings;
    `
  },
  {
    id: '002_usage_logs',
    description: 'Add usage logging table',
    sql: `
      CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action_type VARCHAR(50) NOT NULL,
        input_data TEXT,
        response_data TEXT,
        cache_hit BOOLEAN DEFAULT FALSE,
        cache_eligible BOOLEAN DEFAULT TRUE,
        fallback_reason VARCHAR(100),
        processing_time_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_action_type ON usage_logs(action_type);
      CREATE INDEX IF NOT EXISTS idx_cache_hit ON usage_logs(cache_hit);
      CREATE INDEX IF NOT EXISTS idx_cache_eligible ON usage_logs(cache_eligible);
    `,
    rollback: `DROP TABLE IF EXISTS usage_logs;`
  }
]

export class MigrationManager {
  private client: Client

  constructor(client: Client) {
    this.client = client
  }

  async createMigrationsTable(): Promise<void> {
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(50) PRIMARY KEY,
        description TEXT,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  async getAppliedMigrations(): Promise<string[]> {
    const result = await this.client.execute('SELECT id FROM schema_migrations ORDER BY applied_at')
    return result.rows.map((row: any) => row.id as string)
  }

  async applyMigration(migration: Migration): Promise<void> {
    console.log(`📦 [DB] 마이그레이션 적용: ${migration.id} - ${migration.description}`)
    
    try {
      // SQL 문장을 개별적으로 분리하여 실행
      const sqlStatements = this.splitSqlStatements(migration.sql)
      
      // 각 SQL 문장을 순차적으로 실행 (batch 대신 개별 실행)
      for (let i = 0; i < sqlStatements.length; i++) {
        const statement = sqlStatements[i].trim()
        console.log(`🔧 [Migration] SQL 실행 ${i + 1}/${sqlStatements.length}: ${statement.substring(0, 50)}...`)
        
        await this.client.execute(statement)
        console.log(`✅ [Migration] SQL 완료 ${i + 1}/${sqlStatements.length}`)
      }
      
      // 마이그레이션 기록 추가
      await this.client.execute(
        'INSERT INTO schema_migrations (id, description) VALUES (?, ?)',
        [migration.id, migration.description]
      )
      
      console.log(`✅ [DB] 마이그레이션 완료: ${migration.id}`)
      
    } catch (error) {
      console.error(`❌ [Migration] 실행 실패: ${migration.id}`, error)
      throw error
    }
  }

  private splitSqlStatements(sql: string): string[] {
    // SQL 문장을 세미콜론으로 분리 (주석 제거 및 정리)
    
    // 1. 주석 라인 제거 (-- 로 시작하는 라인 전체 제거)
    const cleanedSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
    
    // 2. 세미콜론으로 분리하고 정리
    const statements = cleanedSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0)
    
    // 3. 디버깅을 위한 로그 출력
    console.log(`🔍 [Migration] SQL 분리 결과 (${statements.length}개 문장):`)
    statements.forEach((stmt, idx) => {
      console.log(`${idx + 1}. ${stmt.substring(0, 50)}...`)
    })
    
    return statements.map(statement => statement + ';')
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    if (!migration.rollback) {
      throw new Error(`마이그레이션 ${migration.id}에 롤백 스크립트가 없습니다`)
    }

    console.log(`🔄 [DB] 마이그레이션 롤백: ${migration.id}`)
    
    // 롤백 SQL도 분리하여 실행
    const sqlStatements = this.splitSqlStatements(migration.rollback)
    const batchCommands: Array<{ sql: string; args?: any[] }> = sqlStatements.map(sql => ({ sql: sql.trim() }))
    
    // 마이그레이션 기록 삭제
    batchCommands.push({
      sql: 'DELETE FROM schema_migrations WHERE id = ?',
      args: [migration.id]
    })
    
    await this.client.batch(batchCommands)
    
    console.log(`✅ [DB] 롤백 완료: ${migration.id}`)
  }

  async runMigrations(): Promise<void> {
    await this.createMigrationsTable()
    const appliedMigrations = await this.getAppliedMigrations()
    
    for (const migration of migrations) {
      if (!appliedMigrations.includes(migration.id)) {
        await this.applyMigration(migration)
      } else {
        console.log(`⏭️ [DB] 마이그레이션 스킵 (이미 적용됨): ${migration.id}`)
      }
    }
    
    console.log(`🎉 [DB] 모든 마이그레이션 완료 (${migrations.length}개)`)
  }

  async rollbackToMigration(targetMigrationId: string): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations()
    const targetIndex = migrations.findIndex(m => m.id === targetMigrationId)
    
    if (targetIndex === -1) {
      throw new Error(`마이그레이션 ${targetMigrationId}를 찾을 수 없습니다`)
    }

    for (let i = migrations.length - 1; i > targetIndex; i--) {
      const migration = migrations[i]
      if (appliedMigrations.includes(migration.id)) {
        await this.rollbackMigration(migration)
      }
    }
  }
}