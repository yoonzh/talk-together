// AIDEV-NOTE: AI 모델 전환 명령어 핸들러
// "챗지피티", "제미나이" 명령어를 처리하여 AI 모델을 동적으로 변경

import type { CommandHandler, CommandContext, CommandResult } from '../types'

export class AiModelHandler implements CommandHandler {
  pattern = /^(챗지피티|제미나이|chatgpt|gemini)$/i
  name = 'aiModel'
  description = 'AI 모델 변경'
  examples = ['챗지피티', '제미나이', 'chatgpt', 'gemini']

  async execute(match: RegExpMatchArray, context: CommandContext): Promise<CommandResult> {
    const input = match[1].toLowerCase()
    let modelName: string
    let displayName: string
    
    // 입력어에 따른 모델 결정
    if (input === '챗지피티' || input === 'chatgpt') {
      modelName = 'openai'
      displayName = 'ChatGPT'
    } else if (input === '제미나이' || input === 'gemini') {
      modelName = 'gemini'
      displayName = 'Gemini'
    } else {
      return {
        success: false,
        message: '⚠️ 지원하지 않는 AI 모델입니다',
        displayDuration: 3000
      }
    }
    
    // AI 모델 설정 적용
    context.setAiModel(modelName)
    
    const message = `🤖 이제부터 똑똑이로 ${displayName}를 사용합니다`
    
    console.log(`✅ AI 모델 변경: ${displayName} (${modelName})`)
    
    return {
      success: true,
      message,
      shouldClearInput: true,
      displayDuration: 3000
    }
  }
}