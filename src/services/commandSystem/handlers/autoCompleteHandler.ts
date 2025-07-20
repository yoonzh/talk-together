// AIDEV-NOTE: 자동완성 설정 명령어 핸들러
// "글자완성5초", "글자완성0초" 등의 명령어를 처리하여 자동완성 기능을 동적으로 설정

import type { CommandHandler, CommandContext, CommandResult, AutoCompleteConfig } from '../types'

export class AutoCompleteHandler implements CommandHandler {
  pattern = /^글자완성(\d+)초$/
  name = 'autoComplete'
  description = '글자 자동완성 시간 설정'
  examples = ['글자완성5초', '글자완성0초 (비활성화)', '글자완성3초']

  async execute(match: RegExpMatchArray, context: CommandContext): Promise<CommandResult> {
    const seconds = parseInt(match[1])
    
    // 유효한 시간 범위 검증
    if (seconds < 0 || seconds > 60) {
      return {
        success: false,
        message: '⚠️ 시간은 0-60초 사이로 설정해주세요',
        displayDuration: 3000
      }
    }
    
    // 자동완성 설정 생성
    const config: AutoCompleteConfig = {
      enabled: seconds > 0,
      duration: seconds,
      setAt: Date.now()
    }
    
    // 설정 적용
    context.setAutoCompleteConfig(config)
    
    // 사용자 피드백 메시지 생성
    const message = seconds === 0 
      ? '⚙️ 자동완성이 비활성화되었습니다'
      : `⚙️ 자동완성이 ${seconds}초로 설정되었습니다`
    
    console.log(`✅ 자동완성 설정 변경: ${seconds}초 (${config.enabled ? '활성화' : '비활성화'})`)
    
    return {
      success: true,
      message,
      shouldClearInput: true,
      displayDuration: 3000
    }
  }
}