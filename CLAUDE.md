# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

### 이 앱은 언어장애가있는 장애인의 의소소통을 보조하기 위해 제작됩니다.

- 해당 장애인은 자폐장애로 4에서 7세 정도의 지능을 가지고 있습니다.
- 웹으로 서비스되고 휴대폰에서 사용되는 앱이니 레이아웃에 유의하세요.
- 앱의 모든 동작은 자폐장애인이 사용하기 쉽게 디자인되어야 합니다.
- 사용자가 목적어(명사)를 입력하면 그와 연관되는 서술어 후보를 목록을 제시합니다. 예를 들어 "수영"을 입력하면, "수영이 좋아요", "수영장에 가고싶어요", "수영이 힘들어요" 등의 목록이 보여야 합니다.
- 서술어를 보여줄 때 서술어를 의미하는 그림(이모지, 직관적인 아이콘, 비슷한 그림 등)을 함께 보여주어 사용자가 쉽게 선택할 수 있게 합니다.
- 화면 하단에는 한글 천지인 키보드가 나옵니다. 키보드를 입력하면 화면의 상단에 조합된 한글이 표시됩니다.
- 매번 입력마다 단어를 평가하여 서술어 후보를 제시합니다.
- 말하기 버튼을 누르면 음성으로 문장을 출력합니다. 이때 문장과 연관된 애니메이션을 함께 보여줍니다.

### 천지인 자판 레이아웃

|ㅣ|ㆍ|ㅡ|
|-|-|-|
|ㄱㅋ|ㄴㄹ|ㄷㅌ|
|ㅂㅍ|ㅅㅎ|ㅈㅊ|
|space|ㅇㅁ|backspace|
- space(공백)와 backspace는 이모지로 표시 (⎵, ⌫)
- 자음을 한번 클릭하면 첫번째 자음, 두번 클릭하면 두번째 자음, 세번 클릭하면 첫번째 자음의 쌍자음(단, ㄴ과 ㅇ은 쌍자음 없음). 네번째 클릭하면 첫번째 자음순으로 loop

### 천지인 모음 조합 테이블
| 조합되는 모음 | 1st | 2nd | 3rd | 4th | 5th |
|---------|-----|-----|-----|-----|-----|
| ㅣ       | ㅣ   |     |     |     |     |
| ㅡ       | ㅡ   |     |     |     |     |
| ㅏ       | ㅣ   | ·   |     |     |     |
| ㅓ       | ·   | ㅣ   |     |     |     |
| ㅗ       | ·   | ㅡ   |     |     |     |
| ㅜ       | ㅡ   | ·   |     |     |     |
| ㅑ       | ㅣ   | ·   | ·   |     |     |
| ㅕ       | ·   | ·   | ㅣ   |     |     |
| ㅛ       | ·   | ·   | ㅡ   |     |     |
| ㅠ       | ㅡ   | ·   | ·   |     |     |
| ㅐ       | ㅣ   | ·   | ㅣ   |     |     |
| ㅒ       | ㅣ   | ·   | ·   | ㅣ   |     |
| ㅔ       | ·   | ㅣ   | ㅣ   |     |     |
| ㅖ       | ·   | ·   | ㅣ   | ㅣ   |     |
| ㅢ       | ㅡ   | ㅣ   |     |     |     |
| ㅚ       | ·   | ㅡ   | ㅣ   |     |     |
| ㅟ       | ㅡ   | ·   | ㅣ   |     |     |
| ㅘ       | ·   | ㅡ   | ㅣ   | ·   |     |
| ㅝ       | ㅡ   | ·   | ·   | ㅣ   |     |
| ㅙ       | ·   | ㅡ   | ㅣ   | ·   | ㅣ   |
| ㅞ       | ㅡ   | ·   | ·   | ㅣ   | ㅣ   |

### 천지인 한글 입력 소스를 생성하면 유닛테스트 필요
- 초정 + 중성
- 초성 + 중성 + 종성
- 중성은 모든 조합 테이블 사용
- 초성에는 ㄱ 사용
- 종성에는 ㅇ 사용

## Development Setup

This project is built with React, TypeScript, and Vite. To get started:

1. Install dependencies: `npm install`
2. Copy environment variables: `cp .env.example .env`
3. Edit `.env` file and add your AI API keys (optional):
   - `GEMINI_API_KEY` for Gemini 2.5 Flash-Lite (recommended)
   - `OPENAI_API_KEY` for OpenAI GPT-3.5 Turbo
4. Start development server: `npm run dev`
5. Run tests: `npm test`
6. Build for production: `npm run build`

## AI Configuration

The app supports multiple AI providers for real-time predicate generation. AI 서비스가 다른것이 추가될 수 있으니 추상화에 신경써라.
AI는 Option 1을 먼저 시도하고 실패하면 다음 Option으로 넘어간다. 모든 AI서비스 호출에 실패하면 로컬 폴백으로 응답한다. 작업은 추상화 레벨에서 이루어져 서비스 로직은 단일 호출로 처리해야한다.

To enable AI features:
### Option 1: OpenAI GPT-3.5 Turbo
1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Add it to your `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```
### Option 2: Gemini 2.5 Flash-Lite
1. Get a Gemini API key from https://ai.google.dev/
2. Add it to your `.env` file:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Environment Variables
- **Local Development**: Use `OPENAI_API_KEY` and `GEMINI_API_KEY` in your `.env` file
- **Production (Vercel)**: Set environment variables without any prefix in Vercel dashboard
- VITE_ prefix 사용 금지

### Features
- Real-time Korean sentence generation for autism communication aid
- Context-aware predicate suggestions based on input nouns
- Automatic Korean particle (조사) processing
- Request-type sentences prioritized for communication assistance

## Common Commands

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build application for production
- `npm run preview` - Preview production build locally
- `npm test` - Run unit tests with Vitest

## Architecture

### Core Components
- **App.tsx** - Main application component that manages global state
- **CheongjiinKeyboard** - 천지인 키보드 컴포넌트 (3x4 grid layout)
- **TextDisplay** - 입력된 텍스트와 선택된 서술어를 표시
- **PredicateList** - 입력된 명사에 따른 서술어 후보 목록
- **SpeechButton** - 음성 출력 버튼

### Key Utilities
- **hangulUtils.ts** - 한글 조합/분해 로직
- **cheongjiinUtils.ts** - 천지인 키 매핑 및 모음 조합
- **useCheongjiinInput.ts** - 천지인 입력 상태 관리 훅
- **openaiService.ts** - OpenAI API를 통한 실시간 서술어 생성
- **geminiService.ts** - Gemini API를 통한 실시간 서술어 생성
- **promptTemplates.ts** - AI 서비스용 공통 프롬프트 템플릿

### Features Implemented
✅ 천지인 키보드 (3x4 레이아웃)
✅ 한글 조합 로직 (초성+중성+종성)
✅ AI 기반 서술어 후보 생성 시스템
✅ 향상된 음성 출력 기능 (GCP TTS + Web Speech API)
✅ 반응형 모바일 디자인
✅ 유닛 테스트 (Vitest)
✅ 실시간 AI 서술어 생성
✅ GCP TTS 사용
✅ turso를 AI 응답과 TTS 응답 캐시 DB 로 사용

### Technology Stack
- React 19.1.0
- TypeScript 5.8.3
- Vite 7.0.4
- Vitest (testing)
- Web Speech API + Gemini TTS (음성 출력)
- OpenAI GPT-3.5 + Gemini 2.5 Flash (AI 서술어 생성)

## TTS (Text-to-Speech) 기능

### 음성 출력 시스템
앱은 세 가지 TTS 시스템을 지원합니다:
1. **Google Cloud TTS** (기본값)
   - Google Cloud Text-to-Speech API 사용
   - 고품질 한국어 음성 합성
   - MP3 형태의 오디오 스트리밍
   - 다양한 음성 옵션 지원

2. **Gemini 2.5 Flash TTS** (향상된 텍스트 전처리)
   - AI 기반 텍스트 전처리로 더 자연스러운 음성
   - 자폐장애인을 위한 맞춤형 텍스트 최적화
   - 어려운 표현을 쉬운 말로 변환
   - 발음하기 어려운 단어 개선
   - 최종 음성 출력은 Web Speech API 사용

3. **Web Speech API** (위 기능 실패 시 사용)
   - 브라우저 내장 TTS 엔진 사용
   - 별도 API 키 불필요
   - 즉시 사용 가능

## TTS 설정 방법
환경 변수 `TTS_MODULE`을 사용하여 TTS 시스템을 선택합니다:

```bash
# .env 파일 설정
TTS_MODULE=GEMINI_TTS      # Gemini TTS 사용 (텍스트 전처리)
TTS_MODULE=GCP_TTS         # Google Cloud TTS 사용 (고품질 음성)
# TTS_MODULE 설정하지 않으면 Web Speech API 사용

# Google Cloud Platform API 키 (TTS_MODULE=GCP_TTS일 때 필요)
GCP_API_KEY=your_gcp_api_key_here

# Gemini API 키 (TTS_MODULE=GEMINI_TTS일 때 필요)
GEMINI_API_KEY=your_gemini_api_key_here
```

### TTS 서비스 아키텍처
```
TTSServiceFactory
├── WebSpeechTTSService
│   └── 브라우저 내장 Web Speech API 사용
├── EnhancedGeminiTTSService (텍스트 전처리)
│   ├── Gemini API를 통한 텍스트 전처리
│   ├── 자폐장애인 맞춤형 텍스트 최적화
│   └── Web Speech API로 최종 음성 출력
└── GoogleCloudTTSServiceWrapper (고품질 음성)
    ├── Google Cloud TTS API 호출
    ├── Base64 오디오 데이터 수신
    └── HTML5 Audio 엘리먼트로 재생
```

### 환경 변수 우선순위
1. `TTS_MODULE` 환경 변수 확인
2. 해당 모듈에 필요한 API 키 확인
3. API 키가 없으면 Web Speech API로 폴백

### 폴백 시스템
- 선택된 TTS 서비스 실패 시 자동 폴백
- 네트워크 오류나 API 제한 시 에러 로깅

### 테스트 커버리지
- 세 가지 TTS 시스템의 단위 테스트
- TTSServiceFactory의 환경 변수 기반 서비스 선택 테스트
- Google Cloud TTS API 응답 처리 테스트
- 긴 텍스트 및 특수 문자 처리 테스트

### 참고사항
- `TTS_MODULE` 환경 변수를 통한 통합된 TTS 모듈 선택 방식 사용
- 레거시 `GEMINI_TTS` 환경 변수는 제거됨 (v1.1.0부터)

## 기능개발관련 중요 지침

모든 기능은 TDD 방식으로 개발합니다.
테스트케이스는 계속 누적됩니다.
테스트 케이스를 모두 통과해야 기능이 완료된것입니다.
테스트 케이스를 함부로 삭제하지마세요. 필요하다면 먼저 삭제해도 되는지 질문해 주세요.
개발을 진행하는 동안 추가되는 콘솔 로그는 배포할때 전부 삭제되면 안되고 디버깅에 필요한 필수 로그는 남아있어야합니다. 따라서 개발 서버에는 자세한 로그가 남아야하고 배포될때는 필수 로그가 남아있어야 합니다.

## 주석관련 중요 코멘트

코드베이스 전반에 걸쳐, 필요에 따라 특정 형식의 주석을 추가하세요. 이 주석은 본인에게 도움이 되는 인라인 지식으로, grep 등으로 쉽게 검색 가능해야 합니다.

### 주석 작성 지침:
AI와 개발자 모두를 대상으로 할 경우, AIDEV-NOTE:, AIDEV-TODO:, AIDEV-QUESTION: 와 같이 대문자 접두어를 사용하세요.
주석은 간결하게 (120자 이내) 작성하세요.
중요: 파일을 스캔하기 전에, 먼저 관련 하위 디렉토리 내의 기존 앵커(AIDEV-*)가 있는지 확인하세요.
관련 코드를 수정할 경우, 반드시 해당 앵커 주석도 업데이트해야 합니다.
명시적인 사람의 지시 없이 AIDEV-NOTE는 삭제하지 마세요.

주석 예시:
```javascript
// AIDEV-NOTE: 성능에 민감한 경로입니다. 불필요한 메모리 할당을 피하세요.
async function renderFeed(...) {
    ...
}
```

## 주요 결정사항 (Project Decisions)

### 🎯 프로젝트 목적 및 사용자
- **대상 사용자**: 자폐장애인 (4-7세 지능 수준)
- **사용 환경**: 웹 기반 서비스, 휴대폰에서 주로 사용
- **UI/UX 원칙**: 자폐장애인이 사용하기 쉽게 큰 버튼, 직관적 아이콘, 간단한 조작

### ⌨️ 천지인 키보드 구현 결정
- **레이아웃**: 3x4 그리드 (총 12개 버튼)
- **자음 처리**: 클릭 횟수에 따른 순환 (ㄱ→ㅋ→ㄲ→ㄱ...)
- **모음 조합**: 천지인 방식 완전 구현 (ㅣ+ㆍ=ㅏ, ㆍ+ㅣ=ㅓ 등)
- **종성 분해**: 종성 상태에서 모음 입력 시 자동으로 새 글자의 초성으로 변환
- **중성 조합**: 유효하지 않은 조합도 vowelSequence 유지하여 연속 입력 지원

### 🤖 AI 기반 서술어 생성 결정
- **실시간 처리**: 명사 입력 후 500ms 디바운스로 OpenAI API 호출
- **프롬프트 설계**: 자폐장애인 맞춤형 (4-7세 지능 수준, 간단한 표현)
- **폴백 시스템**: API 실패 시 로컬 카테고리별 서술어 제공
- **카테고리 분류**: place, food, activity, person, general
- **환경 변수**: `VITE_OPENAI_API_KEY`로 API 키 관리

### 📖 한국어 조사 처리 결정
- **받침 인식**: 한글 완성형 유니코드 기반 정확한 받침 판단
- **자동 변환 규칙**:
  - `을/를` → 받침 있으면 `을`, 없으면 `를`
  - `이/가` → 받침 있으면 `이`, 없으면 `가`
  - `와/과` → 받침 있으면 `과`, 없으면 `와`
- **AI 연동**: OpenAI 프롬프트와 로컬 백업 모두 조사 처리 적용
- **패턴 매칭**: 정규식 기반 조사 패턴 자동 교체

### 🏗️ 아키텍처 설계 결정
- **컴포넌트 구조**: App → TextDisplay, PredicateList, SpeechButton, CheongjiinKeyboard
- **상태 관리**: React hooks 기반 (useState, useEffect)
- **서비스 계층**:
  - `openaiService.ts` - OpenAI API 호출 및 응답 처리
  - `aiService.ts` - AI 서비스 추상화 레이어
  - `josiUtils.ts` - 한국어 조사 처리
- **유틸리티 분리**:
  - `hangulUtils.ts` - 한글 조합/분해 로직
  - `cheongjiinUtils.ts` - 천지인 키 매핑 및 모음 조합
  - `useCheongjiinInput.ts` - 천지인 입력 상태 관리

### 🌐 서버 및 배포 설정
- **개발 서버**: 0.0.0.0:3000 (네트워크 접근 가능)
- **환경 변수**: .env 파일로 API 키 관리
- **빌드**: TypeScript 컴파일 + Vite 번들링

### 🧪 테스트 전략 결정
- **단위 테스트**: 한글 조합, 천지인 변환, 조사 처리 로직
- **테스트 케이스**:
  - 한글 조합 (초성+중성, 초성+중성+종성)
  - 천지인 모음 조합 (모든 조합 테이블)
  - 조사 처리 (받침 유무별 정확한 조사 선택)
- **테스트 도구**: Vitest + @testing-library/react

### 🎵 음성 출력 결정
- **API 선택**: Web Speech API (브라우저 내장)
- **언어 설정**: 한국어 (ko-KR)
- **사용자 경험**: 큰 말하기 버튼, 문장 완성 시에만 활성화

### 🔄 사용자 플로우 결정
1. 천지인 키보드로 명사 입력
2. 실시간 AI 서술어 생성 (500ms 디바운스)
3. 이모지와 함께 서술어 후보 표시
4. 사용자가 서술어 선택
5. 완성된 문장 음성 출력

이러한 결정사항들이 자폐장애인의 의사소통을 효과적으로 지원하는 시스템의 기반이 되었습니다.

## 개발 철학 및 주요 원칙

### 하위호환성 관련 결정

- **특별한 요청이 없다면 하위호환성을 유지하지 말라**: 
  - 기술 부채를 최소화하고 최신 기술과 개발 방식에 집중
  - 불필요한 레거시 코드 유지를 피하고 지속적인 리팩토링 권장
  - 새로운 기능과 최적화를 위해 과감한 변경 허용
  - 호환성 유지로 인한 복잡성과 성능 저하 방지

## 데이터베이스 관련 중요 결정사항 (Database Architecture Decisions)

### 📊 **Turso SQLite + LibSQL 선택 이유**
- **클라우드 네이티브**: 글로벌 분산 SQLite 서비스
- **비용 효율성**: 스타트업 친화적인 가격 정책
- **성능**: Edge 노드를 통한 낮은 지연시간
- **개발 편의성**: SQL 문법 그대로 사용 가능

### 🏗️ **스키마 설계 원칙**

#### **AI 서술어 캐시 테이블 (ai_predicate_cache)**
```sql
CREATE TABLE ai_predicate_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  input_word VARCHAR(100) NOT NULL,           -- 사용자 입력 명사
  ai_response TEXT NOT NULL,                  -- JSON: PredicateCandidate[] 완전 응답
  model_name VARCHAR(50) NOT NULL,            -- AI 모델명 (gpt-3.5-turbo, gemini-2.5-flash-lite)
  response_source VARCHAR(20) DEFAULT 'api', -- 'api' | 'local_fallback'
  response_hash VARCHAR(64) UNIQUE,           -- 중복 방지 해시
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,                        -- 3개월 후 만료
  access_count INTEGER DEFAULT 1,             -- 사용 빈도 추적
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### **TTS 오디오 캐시 테이블 (tts_audio_cache)**
```sql
CREATE TABLE tts_audio_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sentence_text TEXT NOT NULL,                -- 문장 텍스트
  sentence_hash VARCHAR(64) UNIQUE NOT NULL,  -- 문장 해시값
  audio_data TEXT,                            -- Base64 + gzip 압축 오디오
  compression_type VARCHAR(20) DEFAULT 'base64_gzip',
  audio_format VARCHAR(10) DEFAULT 'mp3',
  duration_ms INTEGER,                        -- 재생 시간
  file_size_bytes INTEGER,                    -- 원본 크기
  compressed_size_bytes INTEGER,              -- 압축 후 크기
  voice_config TEXT,                          -- TTS 설정 (JSON)
  tts_provider VARCHAR(20) DEFAULT 'gcp',     -- 'gcp' | 'gemini' | 'webspeech'
  is_api_generated BOOLEAN DEFAULT TRUE,      -- API 생성 여부
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 1,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 🔄 **마이그레이션 전략**

#### **단순화 결정 (v1.1.0)**
- **레거시 제거**: `ai_response` (텍스트 배열) → `ai_response` (JSON PredicateCandidate[])
- **단일 응답 타입**: 완전한 메타데이터 (text, emoji, category) 포함
- **마이그레이션 복구**: 실패한 마이그레이션 자동 정리 로직 구현
- **데이터 정리**: 호환되지 않는 레거시 캐시 데이터 삭제

```typescript
// 마이그레이션 복구 로직
if (appliedMigrations.includes('003_complete_responses_only')) {
  console.log('🧹 [DB] 실패한 마이그레이션 정리: 003_complete_responses_only')
  await this.client.execute(`DELETE FROM schema_migrations WHERE id = '003_complete_responses_only'`)
}
```

### 📈 **캐시 전략**

#### **AI 응답 캐시**
- **유지 기간**: 3개월 (설정 가능)
- **용량 관리**: LRU 방식으로 1000개 → 800개 유지
- **중복 방지**: 입력어 + 응답 + 모델명 기반 해시
- **모델 우선순위**: OpenAI > Gemini > 로컬 폴백

#### **TTS 오디오 캐시**  
- **압축**: Base64 + gzip으로 용량 최적화
- **용량 제한**: 100MB 최대 크기
- **품질 보존**: MP3 형식으로 고품질 유지
- **다중 제공자**: GCP TTS, Gemini TTS, Web Speech API

### 🛡️ **데이터 보안 및 개인정보**

#### **익명화 정책**
- **사용자 식별**: 익명 사용 (user_id NULL 허용)
- **입력 데이터**: 개인정보 포함하지 않는 단순 명사만 저장
- **로그 정책**: 디버깅용 로그에서 민감 정보 제외

#### **데이터 정리**
- **자동 만료**: 캐시 데이터 3개월 후 자동 삭제
- **용량 관리**: 설정된 한계 초과 시 오래된 데이터 우선 삭제
- **수동 정리**: 관리자 도구를 통한 선택적 데이터 삭제 가능

### ⚡ **성능 최적화**

#### **인덱스 전략**
```sql
-- AI 캐시 조회 최적화
CREATE INDEX idx_input_word ON ai_predicate_cache(input_word);
CREATE INDEX idx_expires_at ON ai_predicate_cache(expires_at);
CREATE INDEX idx_ai_response ON ai_predicate_cache(ai_response);

-- TTS 캐시 조회 최적화  
CREATE INDEX idx_sentence_hash ON tts_audio_cache(sentence_hash);
CREATE INDEX idx_tts_provider ON tts_audio_cache(tts_provider);
```

#### **쿼리 최적화**
- **복합 조건**: 만료일 + 단어 + 소스를 조합한 효율적 쿼리
- **배치 처리**: 다중 삭제 작업 시 트랜잭션 활용
- **연결 풀링**: LibSQL 클라이언트 재사용으로 연결 오버헤드 최소화

### 🔮 **확장성 고려사항**

#### **스케일링 전략**
- **Turso 글로벌 복제**: 사용자 위치별 성능 최적화
- **캐시 계층화**: 로컬 메모리 → Turso → AI API 순서
- **부하 분산**: 여러 AI 제공자 간 로드 밸런싱

#### **미래 확장 계획**
- **사용자 개인화**: 개별 사용자 맞춤 캐시 (선택적)
- **멀티 언어**: 다국어 서술어 지원
- **고급 분석**: 사용 패턴 분석 및 개선 제안
