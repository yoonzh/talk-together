-- Turso SQLite Database Schema for TalkTogether
-- 자폐장애인 의사소통 보조 앱을 위한 데이터베이스 스키마

-- 사용자 테이블 (향후 회원가입 대비)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(20) CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'student',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- 교사-학생 관계 테이블
CREATE TABLE IF NOT EXISTS teacher_students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  UNIQUE(teacher_id, student_id)
);

-- AI 서술어 캐시 테이블 (모든 사용자 공유)
CREATE TABLE IF NOT EXISTS ai_predicate_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  input_word VARCHAR(100) NOT NULL,                    -- 사용자 입력어 (key)
  ai_response TEXT NOT NULL,                           -- AI의 모든 응답 (JSON 배열)
  model_name VARCHAR(50) NOT NULL,                     -- 생성한 모델명
  response_source VARCHAR(20) DEFAULT 'api',          -- 응답 소스 (api, local_fallback)
  response_hash VARCHAR(64) UNIQUE,                    -- 응답 중복 방지용 해시
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,                                 -- 3개월 후 만료일
  access_count INTEGER DEFAULT 1,                     -- 사용 빈도
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI 서술어 캐시 인덱스
CREATE INDEX IF NOT EXISTS idx_input_word ON ai_predicate_cache(input_word);
CREATE INDEX IF NOT EXISTS idx_expires_at ON ai_predicate_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_model_name ON ai_predicate_cache(model_name);
CREATE INDEX IF NOT EXISTS idx_response_source ON ai_predicate_cache(response_source);

-- TTS 오디오 캐시 테이블 (모든 사용자 공유)
CREATE TABLE IF NOT EXISTS tts_audio_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sentence_text TEXT NOT NULL,                         -- 문장 텍스트 (key)
  sentence_hash VARCHAR(64) UNIQUE NOT NULL,           -- 문장 해시값
  audio_data TEXT,                                     -- Base64 + gzip 압축된 오디오
  compression_type VARCHAR(20) DEFAULT 'base64_gzip',  -- 압축 방식
  audio_format VARCHAR(10) DEFAULT 'mp3',              -- 오디오 포맷
  duration_ms INTEGER,                                 -- 재생 시간 (밀리초)
  file_size_bytes INTEGER,                             -- 압축 전 원본 크기
  compressed_size_bytes INTEGER,                       -- 압축 후 크기
  voice_config TEXT,                                   -- TTS 설정 (JSON)
  tts_provider VARCHAR(20) DEFAULT 'gcp',              -- TTS 제공자
  is_api_generated BOOLEAN DEFAULT TRUE,               -- API 생성 여부 (폴백 제외)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 1,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TTS 오디오 캐시 인덱스
CREATE INDEX IF NOT EXISTS idx_sentence_hash ON tts_audio_cache(sentence_hash);
CREATE INDEX IF NOT EXISTS idx_tts_provider ON tts_audio_cache(tts_provider);
CREATE INDEX IF NOT EXISTS idx_last_accessed ON tts_audio_cache(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_is_api_generated ON tts_audio_cache(is_api_generated);

-- 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 사용 로그 테이블 (분석용)
CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                                     -- NULL이면 익명 사용자
  action_type VARCHAR(50) NOT NULL,                    -- 'ai_request', 'tts_request', 'sentence_select'
  input_data TEXT,                                     -- 입력 데이터
  response_data TEXT,                                  -- 응답 데이터
  cache_hit BOOLEAN DEFAULT FALSE,                     -- 캐시 히트 여부
  cache_eligible BOOLEAN DEFAULT TRUE,                 -- 캐시 가능 여부
  fallback_reason VARCHAR(100),                        -- 폴백 사유
  processing_time_ms INTEGER,                          -- 처리 시간
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 사용 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_action_type ON usage_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_cache_hit ON usage_logs(cache_hit);
CREATE INDEX IF NOT EXISTS idx_cache_eligible ON usage_logs(cache_eligible);
CREATE INDEX IF NOT EXISTS idx_fallback_reason ON usage_logs(fallback_reason);

-- 기본 시스템 설정 삽입
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('ai_cache_duration_months', '3', 'AI 서술어 캐시 유지 기간 (개월)'),
('tts_cache_max_size_mb', '100', 'TTS 오디오 캐시 최대 크기 (MB)'),
('cache_cleanup_interval_hours', '24', '캐시 정리 실행 간격 (시간)'),
('app_version', '1.0.0', '앱 버전'),
('db_schema_version', '1.0.0', '데이터베이스 스키마 버전');