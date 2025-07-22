// Enhanced AI Services Type Definitions
// AIDEV-NOTE: 병렬 AI 요청 처리를 위한 확장된 타입 정의

export interface PredicateCandidate {
  text: string
  emoji: string
  category: string
}

// Parallel AI Response Types
export interface ParallelAIResponse {
  openaiResults: PredicateCandidate[] | null
  geminiResults: PredicateCandidate[] | null
  openaiError?: Error
  geminiError?: Error
  combinedResults: PredicateCandidate[]
  processingTimeMs: number
}

// Evaluation Types
export interface EvaluatedPredicates {
  predicates: PredicateCandidate[]
  evaluationMeta: {
    evaluator: 'gpt-4o'
    originalCount: number
    finalCount: number
    timestamp: string
    processingTimeMs: number
  }
}

// Communication Status Types
export type AIServiceStatus = 'success' | 'failed' | 'timeout'

export interface CommunicationStatus {
  openai: AIServiceStatus
  gemini: AIServiceStatus
  evaluator: AIServiceStatus
}

// Fallback Strategy Types
export enum FallbackLevel {
  FULL_SUCCESS = 0,        // ChatGPT-3.5 + Gemini + ChatGPT-4o
  PARTIAL_AI_SUCCESS = 1,  // Single AI + ChatGPT-4o  
  NO_EVALUATION = 2,       // AI responses + local merge
  EMERGENCY_FALLBACK = 3   // Local fallback + possible ChatGPT-4o
}

export interface FallbackResult {
  level: FallbackLevel
  predicates: PredicateCandidate[]
  communicationStatus: CommunicationStatus
  processingTime: number
  cacheEligible: boolean
  fallbackReason?: string
}

// API Configuration Types
export interface AIServiceConfig {
  // API Keys
  openaiApiKey: string
  geminiApiKey: string
  
  // Performance tuning
  parallelRequestTimeout: number    // default: 8000ms
  evaluationTimeout: number         // default: 10000ms
  maxRetryAttempts: number          // default: 2
  
  // Feature flags
  enableParallelAI: boolean         // default: true
  enableGPT4oEvaluation: boolean    // default: true
  enableEnhancedCache: boolean      // default: true
  fallbackToLegacy: boolean         // default: false
}

// Communication Logging Types
export interface CommunicationLog {
  timestamp: string
  service: 'openai-3.5' | 'gemini-flash' | 'gpt-4o' | 'local-fallback'
  status: AIServiceStatus
  requestData?: any
  responseData?: any
  error?: string
  duration: number
}

// Error Types
export interface AIServiceError extends Error {
  service: string
  retryable: boolean
  statusCode?: number
}

// Response Merger Types
export interface MergeOptions {
  prioritizeOpenAI: boolean
  removeDuplicates: boolean
  sortByCategory: boolean
  maxResults?: number
}

export interface MergeResult {
  mergedResults: PredicateCandidate[]
  duplicatesRemoved: number
  openaiCount: number
  geminiCount: number
}