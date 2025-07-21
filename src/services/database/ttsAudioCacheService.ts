import { TursoClient } from './tursoClient'
import { logError } from '../../utils/logger'
// Node.js crypto 모듈은 브라우저에서 사용할 수 없으므로 간단한 해시 함수 구현
function createSimpleHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32비트 정수로 변환
  }
  return Math.abs(hash).toString(16)
}
// import { TTSOptions } from '../geminiTtsService' // 현재 사용하지 않음

export interface TTSAudioCache {
  id: number
  sentence_text: string
  sentence_hash: string
  audio_data: string
  compression_type: string
  audio_format: string
  duration_ms: number | null
  file_size_bytes: number | null
  compressed_size_bytes: number | null
  voice_config: TTSVoiceConfig
  tts_provider: string
  is_api_generated: boolean
  created_at: string
  access_count: number
  last_accessed_at: string
}

export interface TTSVoiceConfig {
  voice?: string
  speed?: number
  pitch?: number
  language?: string
}

export interface TTSCacheStats {
  total_entries: number
  total_size_mb: number
  api_generated_count: number
  fallback_count: number
  cache_hits_today: number
  average_duration_ms: number
}

export enum TTSSource {
  GOOGLE_CLOUD = 'gcp_tts',
  GEMINI_TTS = 'gemini_tts', 
  WEB_SPEECH_FALLBACK = 'web_speech_fallback'
}

export class TTSAudioCacheService {
  private client: TursoClient
  private maxCacheSizeMB: number = 100

  constructor(client: TursoClient) {
    this.client = client
  }

  async initialize(): Promise<void> {
    const settings = await this.client.getSettings()
    this.maxCacheSizeMB = parseInt(settings.tts_cache_max_size_mb) || 100
    console.log(`⚙️ [TTS Cache] 최대 캐시 크기: ${this.maxCacheSizeMB}MB`)
  }

  private generateSentenceHash(sentenceText: string, voiceConfig: TTSVoiceConfig): string {
    const content = `${sentenceText}:${JSON.stringify(voiceConfig)}`
    return createSimpleHash(content)
  }

  private compressAudioData(base64Audio: string): string {
    // Base64 + gzip 압축 시뮬레이션 (실제로는 pako 라이브러리 등 사용)
    // 현재는 Base64 그대로 저장 (향후 압축 라이브러리 추가 예정)
    return base64Audio
  }

  private decompressAudioData(compressedData: string): string {
    // 압축 해제 (현재는 그대로 반환)
    return compressedData
  }

  async getAudioFromCache(sentenceText: string, voiceConfig: TTSVoiceConfig = {}): Promise<TTSAudioCache | null> {
    try {
      const sentenceHash = this.generateSentenceHash(sentenceText, voiceConfig)
      
      const result = await this.client.query(`
        SELECT * FROM tts_audio_cache 
        WHERE sentence_hash = ? 
          AND is_api_generated = TRUE
        ORDER BY last_accessed_at DESC 
        LIMIT 1
      `, [sentenceHash])

      if (result.rows.length === 0) {
        console.log(`🔍 [TTS Cache] 캐시 미스: ${sentenceText.substring(0, 30)}...`)
        return null
      }

      const row = result.rows[0]
      const cache: TTSAudioCache = {
        id: row.id as number,
        sentence_text: row.sentence_text as string,
        sentence_hash: row.sentence_hash as string,
        audio_data: row.audio_data as string,
        compression_type: row.compression_type as string,
        audio_format: row.audio_format as string,
        duration_ms: row.duration_ms as number | null,
        file_size_bytes: row.file_size_bytes as number | null,
        compressed_size_bytes: row.compressed_size_bytes as number | null,
        voice_config: JSON.parse(row.voice_config as string),
        tts_provider: row.tts_provider as string,
        is_api_generated: Boolean(row.is_api_generated),
        created_at: row.created_at as string,
        access_count: row.access_count as number,
        last_accessed_at: row.last_accessed_at as string
      }

      // 접근 횟수 및 시간 업데이트
      await this.updateAccessInfo(cache.id)
      
      console.log(`🎯 [TTS Cache] 캐시 히트: ${sentenceText.substring(0, 30)}... (제공자: ${cache.tts_provider}, 접근: ${cache.access_count + 1}회)`)
      return cache

    } catch (error) {
      logError('TTS 오디오 캐시 조회 실패', { sentenceText, error })
      return null
    }
  }

  async saveAudioToCache(
    sentenceText: string,
    audioData: string,
    voiceConfig: TTSVoiceConfig,
    ttsSource: TTSSource,
    durationMs?: number,
    originalSizeBytes?: number
  ): Promise<void> {
    // 폴백 소스는 캐시하지 않음
    if (ttsSource === TTSSource.WEB_SPEECH_FALLBACK) {
      console.log(`🚫 [TTS Cache] Web Speech 폴백 캐시 제외: ${sentenceText.substring(0, 30)}...`)
      return
    }

    try {
      const sentenceHash = this.generateSentenceHash(sentenceText, voiceConfig)
      const compressedAudio = this.compressAudioData(audioData)
      const compressedSize = new Blob([compressedAudio]).size

      // 중복 체크
      const existingResult = await this.client.query(
        'SELECT id FROM tts_audio_cache WHERE sentence_hash = ?',
        [sentenceHash]
      )

      if (existingResult.rows.length > 0) {
        console.log(`⏭️ [TTS Cache] 중복 오디오 스킵: ${sentenceText.substring(0, 30)}...`)
        return
      }

      await this.client.execute(`
        INSERT INTO tts_audio_cache (
          sentence_text, sentence_hash, audio_data, compression_type, 
          audio_format, duration_ms, file_size_bytes, compressed_size_bytes,
          voice_config, tts_provider, is_api_generated, access_count, 
          last_accessed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `, [
        sentenceText,
        sentenceHash,
        compressedAudio,
        'base64_gzip',
        'mp3',
        durationMs || null,
        originalSizeBytes || null,
        compressedSize,
        JSON.stringify(voiceConfig),
        ttsSource,
        true // is_api_generated
      ])

      console.log(`💾 [TTS Cache] 오디오 캐시 저장: ${sentenceText.substring(0, 30)}... (제공자: ${ttsSource}, 크기: ${Math.round(compressedSize/1024)}KB)`)

      // 캐시 크기 관리
      await this.manageCacheSize()

    } catch (error) {
      logError('TTS 오디오 캐시 저장 실패', { sentenceText, ttsSource, error })
    }
  }

  private async updateAccessInfo(cacheId: number): Promise<void> {
    try {
      await this.client.execute(`
        UPDATE tts_audio_cache 
        SET access_count = access_count + 1, 
            last_accessed_at = datetime('now')
        WHERE id = ?
      `, [cacheId])
    } catch (error) {
      logError('TTS 캐시 접근 정보 업데이트 실패', { cacheId, error })
    }
  }

  async manageCacheSize(): Promise<void> {
    try {
      // 현재 캐시 크기 확인
      const sizeResult = await this.client.query(`
        SELECT SUM(compressed_size_bytes) / 1024.0 / 1024.0 as total_mb 
        FROM tts_audio_cache
      `)

      const currentSizeMB = sizeResult.rows[0].total_mb as number || 0

      if (currentSizeMB > this.maxCacheSizeMB) {
        // LRU 방식으로 오래된 캐시 삭제
        const targetSizeMB = this.maxCacheSizeMB * 0.8 // 80%까지 줄임
        // const bytesToDelete = (currentSizeMB - targetSizeMB) * 1024 * 1024 // 현재 사용하지 않음

        const deleteResult = await this.client.execute(`
          DELETE FROM tts_audio_cache 
          WHERE id IN (
            SELECT id FROM tts_audio_cache 
            ORDER BY last_accessed_at ASC, access_count ASC 
            LIMIT (
              SELECT COUNT(*) / 5 FROM tts_audio_cache
            )
          )
        `)

        console.log(`📊 [TTS Cache] 크기 관리: ${deleteResult.rowsAffected}개 삭제 (${Math.round(currentSizeMB)}MB → 목표: ${Math.round(targetSizeMB)}MB)`)
      }
    } catch (error) {
      logError('TTS 캐시 크기 관리 실패', error)
    }
  }

  async cleanOldCache(daysOld: number = 30): Promise<number> {
    try {
      const result = await this.client.execute(`
        DELETE FROM tts_audio_cache 
        WHERE created_at <= datetime('now', '-${daysOld} days')
      `)

      const deletedCount = result.rowsAffected || 0
      if (deletedCount > 0) {
        console.log(`🗑️ [TTS Cache] 오래된 캐시 정리: ${deletedCount}개 삭제 (${daysOld}일 이상)`)
      }

      return deletedCount
    } catch (error) {
      logError('오래된 TTS 캐시 정리 실패', error)
      return 0
    }
  }

  async getCacheStats(): Promise<TTSCacheStats> {
    try {
      const [totalResult, sizeResult, apiResult, fallbackResult, todayHitsResult, avgDurationResult] = await Promise.all([
        this.client.query('SELECT COUNT(*) as count FROM tts_audio_cache'),
        this.client.query(`
          SELECT SUM(compressed_size_bytes) / 1024.0 / 1024.0 as size_mb 
          FROM tts_audio_cache
        `),
        this.client.query('SELECT COUNT(*) as count FROM tts_audio_cache WHERE is_api_generated = TRUE'),
        this.client.query('SELECT COUNT(*) as count FROM tts_audio_cache WHERE is_api_generated = FALSE'),
        this.client.query(`
          SELECT COUNT(*) as hits FROM tts_audio_cache 
          WHERE last_accessed_at >= date('now')
        `),
        this.client.query(`
          SELECT AVG(duration_ms) as avg_duration 
          FROM tts_audio_cache 
          WHERE duration_ms IS NOT NULL
        `)
      ])

      return {
        total_entries: totalResult.rows[0].count as number,
        total_size_mb: Math.round((sizeResult.rows[0].size_mb as number || 0) * 100) / 100,
        api_generated_count: apiResult.rows[0].count as number,
        fallback_count: fallbackResult.rows[0].count as number,
        cache_hits_today: todayHitsResult.rows[0].hits as number,
        average_duration_ms: Math.round(avgDurationResult.rows[0].avg_duration as number || 0)
      }
    } catch (error) {
      logError('TTS 캐시 통계 조회 실패', error)
      return {
        total_entries: 0,
        total_size_mb: 0,
        api_generated_count: 0,
        fallback_count: 0,
        cache_hits_today: 0,
        average_duration_ms: 0
      }
    }
  }

  async logCacheOperation(
    operation: 'hit' | 'miss' | 'save' | 'skip',
    sentenceText: string,
    ttsSource?: TTSSource,
    details?: any
  ): Promise<void> {
    try {
      await this.client.execute(`
        INSERT INTO usage_logs (
          action_type, input_data, response_data, cache_hit, 
          cache_eligible, fallback_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        'tts_cache_' + operation,
        sentenceText.substring(0, 100), // 긴 텍스트 자름
        JSON.stringify({ tts_source: ttsSource, ...details }),
        operation === 'hit',
        operation !== 'skip',
        ttsSource === TTSSource.WEB_SPEECH_FALLBACK ? 'web_speech_fallback' : null
      ])
    } catch (error) {
      // 로그 실패는 중요하지 않으므로 에러를 던지지 않음
      console.warn('TTS 캐시 로그 기록 실패:', error)
    }
  }

  async getFrequentSentences(limit: number = 10): Promise<Array<{sentence: string, count: number}>> {
    try {
      const result = await this.client.query(`
        SELECT sentence_text as sentence, SUM(access_count) as count
        FROM tts_audio_cache
        WHERE is_api_generated = TRUE
        GROUP BY sentence_text
        ORDER BY count DESC
        LIMIT ?
      `, [limit])

      return result.rows.map(row => ({
        sentence: row.sentence as string,
        count: row.count as number
      }))
    } catch (error) {
      logError('자주 사용되는 문장 조회 실패', error)
      return []
    }
  }

  async playFromCache(cache: TTSAudioCache): Promise<void> {
    try {
      const audioData = this.decompressAudioData(cache.audio_data)
      
      // Base64를 Blob으로 변환
      const binaryString = atob(audioData)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const audioBlob = new Blob([bytes], { type: `audio/${cache.audio_format}` })
      const audioUrl = URL.createObjectURL(audioBlob)

      // 오디오 재생
      const audio = new Audio(audioUrl)
      
      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl)
          reject(error)
        }
        
        audio.play().catch(reject)
      })
      
    } catch (error) {
      logError('캐시된 오디오 재생 실패', error)
      throw error
    }
  }
}