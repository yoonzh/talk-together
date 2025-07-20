// AIDEV-NOTE: 메인 명령어 시스템 훅 - 모든 설정 명령어의 상태와 실행을 관리
// 자동완성 설정, AI 모델 변경, 도움말 표시 등의 통합 관리

import { useState, useCallback } from 'react'
import { CommandSystem } from '../services/commandSystem'
import type { AppSettings, AutoCompleteConfig, CommandContext } from '../services/commandSystem/types'

const getDefaultSettings = (): AppSettings => ({
  autoComplete: {
    enabled: false,  // 기본값: 자동완성 비활성화
    duration: 0,
    setAt: 0
  },
  aiModel: 'auto',
  session: {
    id: Math.random().toString(36).substr(2, 9),
    startTime: Date.now()
  }
})

export const useCommandSystem = () => {
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings())
  const [notification, setNotification] = useState<string | null>(null)
  const [helpVisible, setHelpVisible] = useState(false)
  
  const showNotification = useCallback((message: string) => {
    setNotification(message)
    // NotificationPopup 컴포넌트에서 자동으로 타이머 관리
  }, [])
  
  const setAutoCompleteConfig = useCallback((config: AutoCompleteConfig) => {
    setSettings(prev => ({ ...prev, autoComplete: config }))
    console.log('⚙️ 자동완성 설정 업데이트:', config)
  }, [])
  
  const setAiModel = useCallback((model: string) => {
    setSettings(prev => ({ ...prev, aiModel: model }))
    console.log('🤖 AI 모델 변경:', model)
  }, [])
  
  const showHelp = useCallback((visible: boolean) => {
    setHelpVisible(visible)
    console.log('📖 도움말 표시:', visible)
  }, [])
  
  const executeCommand = useCallback(async (input: string): Promise<boolean> => {
    const context: CommandContext = {
      setAutoCompleteConfig,
      setAiModel,
      showNotification,
      showHelp,
      currentSettings: settings
    }
    
    const result = await CommandSystem.getInstance().executeCommand(input, context)
    
    if (!result) {
      return false // 명령어가 아님
    }
    
    if (result.success && result.message) {
      showNotification(result.message)
    }
    
    return result.shouldClearInput || false
  }, [settings, setAutoCompleteConfig, setAiModel, showNotification, showHelp])
  
  return {
    settings,
    notification,
    setNotification,
    helpVisible,
    setHelpVisible,
    executeCommand
  }
}