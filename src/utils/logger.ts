// 환경별 로깅 시스템
// 개발 환경과 프로덕션 환경 모두 동일한 로그 출력

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private static instance: Logger
  private logLevel: LogLevel

  private constructor() {
    // 개발 환경과 프로덕션 환경 모두 DEBUG 레벨부터 출력
    this.logLevel = LogLevel.DEBUG
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  error(message: string, error?: any, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error, ...args)
    }
  }

  // 사용자 상호작용 로그 (개발/프로덕션 환경 모두 동일)
  userAction(action: string, data?: any): void {
    console.log(`[USER_ACTION] ${action}`, data)
  }

  // AI 서비스 관련 로그 (개발/프로덕션 환경 모두 동일)
  aiService(message: string, data?: any): void {
    console.log(`[AI_SERVICE] ${message}`, data)
  }

  // 천지인 입력 관련 로그 (개발/프로덕션 환경 모두 동일)
  cheongjiinInput(message: string, data?: any): void {
    console.log(`[CHEONGJIIIN] ${message}`, data)
  }

  // 키보드 상태 변화 로그 (개발/프로덕션 환경 모두 동일)
  keyboardState(message: string, data?: any): void {
    console.log(`[KEYBOARD] ${message}`, data)
  }

  // 음성 출력 관련 로그 (개발/프로덕션 환경 모두 동일)
  speechOutput(message: string, data?: any): void {
    console.log(`[SPEECH] ${message}`, data)
  }
}

export const logger = Logger.getInstance()

// 기존 console.log를 대체하는 편의 함수들
export const logDebug = (message: string, ...args: any[]) => logger.debug(message, ...args)
export const logInfo = (message: string, ...args: any[]) => logger.info(message, ...args)
export const logWarn = (message: string, ...args: any[]) => logger.warn(message, ...args)
export const logError = (message: string, error?: any, ...args: any[]) => logger.error(message, error, ...args)
export const logUserAction = (action: string, data?: any) => logger.userAction(action, data)
export const logAiService = (message: string, data?: any) => logger.aiService(message, data)
export const logCheongjiinInput = (message: string, data?: any) => logger.cheongjiinInput(message, data)
export const logKeyboardState = (message: string, data?: any) => logger.keyboardState(message, data)
export const logSpeechOutput = (message: string, data?: any) => logger.speechOutput(message, data)