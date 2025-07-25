// AIDEV-NOTE: AI 서비스용 프롬프트 템플릿 관리 파일
// OpenAI와 Gemini 서비스에서 공통으로 사용하는 프롬프트 템플릿

/**
 * 공통 프롬프트 템플릿 - 중복 제거를 위한 기본 템플릿
 */
const COMMON_PROMPT_TEMPLATE = (noun: string): string => `당신은 말을 못하는 자폐장애인(4-7세 지능 수준)을 위한 의사소통 보조 시스템입니다.
사용자 입력어 "${noun}"에 대해 **한국어 문법에 맞는** 자연스럽고 실용적인 문장 후보 5개에서 20개를 생성해주세요.

중요한 순서 요구사항:
1. 생성된 문장의 20%는 요청형이어야하고 제일 먼저 나타나야합니다.(가고싶어요, 하고싶어요, 주세요, 도와주세요 등)
2. 그 다음 순서는 사용자 입력어와 관련된 감정 표현 (좋아요, 싫어요 등). 단, 사용자 입력어에 대한 감정 표현이 어색하다면 생략
3. 생성된 문장이 감정을 표현하는 문장이면 반대 감정에 대한 문장도 생성
4. 나머지 문장은 상태, 특성 등을 표현하는 문장
5. 응답 토큰수가 모자라면 생성을 멈추고 JSON 포맷에 맞게 출력해주세요.
6. 응답문장은 한국어/한글로 생성하세요.

일반 요구사항:
1. 자폐장애인이 일상에서 자주 사용할 만한 표현
2. 간단하고 이해하기 쉬운 문장
3. 각 서술어마다 적절한 이모지 1개
4. 사용자 입력어의 의미와 문맥에 정확히 맞는 서술어를 생성
5. 사용자 입력어와 관련된 구체적인 행동, 상태, 감정을 표현
6. category가 달라도 동일한 문장 생성 금지`

/**
 * JSON 출력 형식 예시
 */
const JSON_OUTPUT_FORMAT = `
출력 형식 (JSON):
{
  "predicates": [
    {"text": "자동차를 타고 가요", "emoji": "🚗", "category": "이동"},
    {"text": "자동차가 빨라요", "emoji": "💨", "category": "특성"},
    {"text": "자동차를 운전해요", "emoji": "🚙", "category": "행동"},
    {"text": "자동차가 멋져요", "emoji": "✨", "category": "감정"},
    {"text": "자동차를 씻어요", "emoji": "🧼", "category": "관리"},
    {"text": "자동차가 크네요", "emoji": "📏", "category": "특성"}
  ]
}`

/**
 * 자폐장애인 의사소통 보조를 위한 서술어 생성 프롬프트를 생성합니다.
 *
 * @param noun - 사용자가 입력한 명사
 * @returns 완성된 프롬프트 문자열
 */
export const createPredicatePrompt = (noun: string): string => {
  return `
${COMMON_PROMPT_TEMPLATE(noun)}

${JSON_OUTPUT_FORMAT}

사용자 입력어: "${noun}"
`
}

/**
 * 도움말에 표시할 AI 프롬프트 (JSON 출력 형식 제외)
 * @param noun - 사용자가 입력한 명사 (예시용)
 * @returns 사용자가 볼 수 있는 프롬프트 내용
 */
export const getDisplayPrompt = (noun: string = '{사용자입력어}'): string => {
  return COMMON_PROMPT_TEMPLATE(noun)
}