// Enhanced Cache System Type Definitions
// AIDEV-NOTE: 평가 완료된 응답만 캐시하는 향상된 캐시 시스템 타입 정의

import { PredicateCandidate } from './aiTypes'

// Enhanced Cache Entry Types
export interface EvaluatedCacheEntry {
  id: number
  input_word: string
  evaluation_result: string        // JSON: ChatGPT-4o 평가 완료된 결과
  source_responses: string         // JSON: 원본 ChatGPT-3.5 + Gemini 응답
  evaluation_metadata: string      // JSON: 평가 메타데이터
  openai_model: string            // 'gpt-3.5-turbo'
  gemini_model: string            // 'gemini-2.5-flash-lite'  
  evaluator_model: string         // 'gpt-4o'
  response_hash: string           // 중복 방지 해시
  created_at: string
  expires_at: string
  access_count: number
  last_accessed_at: string
}

// Cache Service Types
export interface CacheQueryResult {
  found: boolean
  entry?: EvaluatedCacheEntry
  predicates?: PredicateCandidate[]
}

export interface CacheSourceResponses {
  openaiResults: PredicateCandidate[]
  geminiResults: PredicateCandidate[]
  combinedCount: number
}

// Cache Performance Types
export interface CachePerformanceReport {
  totalRequests: number
  hitRate: number
  evaluatedCacheUsage: number
  legacyCacheUsage: number
  averageResponseTime: number
  recommendation: string
}

export interface CacheStats {
  hits: number
  misses: number
  evaluatedHits: number
  legacyHits: number
  totalEntries: number
  sizeBytes: number
}

// Cache Migration Types
export interface LegacyCacheEntry {
  id: number
  input_word: string
  ai_response: string             // JSON: 기존 응답 형식
  model_name: string
  response_source: string
  created_at: string
}

export interface MigrationResult {
  processed: number
  migrated: number
  failed: number
  errors: string[]
}

// Cache Configuration Types
export interface CacheConfig {
  // Storage settings
  maxEntries: number              // default: 1000
  maxSizeBytes: number           // default: 100MB
  
  // Expiry settings
  defaultExpiryMonths: number    // default: 3
  cleanupIntervalHours: number   // default: 24
  
  // Performance settings
  enableCompression: boolean     // default: true
  enableMigration: boolean       // default: true
  migrationBatchSize: number     // default: 50
  
  // Validation settings
  validateOnRead: boolean        // default: true
  enableMetrics: boolean         // default: true
}

// Cache Operation Types
export interface CacheOperation {
  type: 'read' | 'write' | 'delete' | 'cleanup' | 'migrate'
  timestamp: string
  inputWord?: string
  success: boolean
  duration: number
  error?: string
}

export interface CacheCleanupResult {
  expiredRemoved: number
  lowAccessRemoved: number
  totalFreedBytes: number
  remainingEntries: number
}