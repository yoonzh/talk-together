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

The app supports multiple AI providers for real-time predicate generation. To enable AI features:

### Option 1: Gemini 2.5 Flash-Lite (Recommended)
1. Get a Gemini API key from https://ai.google.dev/
2. Add it to your `.env` file:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Option 2: OpenAI GPT-3.5 Turbo
1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Add it to your `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### API Priority
- If both keys are provided, Gemini will be used as the primary AI service
- If Gemini fails, the app automatically falls back to OpenAI
- If no API keys are provided, it uses local predicate generation

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
- **aiService.ts** - AI 서비스 추상화 레이어

### Features Implemented
✅ 천지인 키보드 (3x4 레이아웃)
✅ 한글 조합 로직 (초성+중성+종성)
✅ AI 기반 서술어 후보 생성 시스템
✅ 음성 출력 기능 (Web Speech API)
✅ 반응형 모바일 디자인
✅ 유닛 테스트 (Vitest)
✅ 실시간 AI 서술어 생성 (OpenAI GPT-3.5)

### Technology Stack
- React 19.1.0
- TypeScript 5.8.3
- Vite 7.0.4
- Vitest (testing)
- Web Speech API (음성 출력)
- OpenAI GPT-3.5 (AI 서술어 생성)

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

## 기능개발관련 중요 지침

모든 기능은 TDD 방식으로 개발합니다.
테스트케이스는 계속 누적됩니다.
테스트 케이스를 모두 통과해야 기능이 완료된것입니다.
테스트 케이스를 함부로 삭제하지마세요. 필요하다면 먼저 삭제해도 되는지 질문해 주세요.
개발을 진행하는 동안 추가되는 콘솔 로그는 배포할때 전부 삭제되면 안되고 디버깅에 필요한 필수 로그는 남아있어야합니다. 따라서 개발 서버에는 자세한 로그가 남아야하고 배포될때는 필수 로그가 남아야 합니다.

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
