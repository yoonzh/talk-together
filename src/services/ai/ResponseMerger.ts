// Response Merging and Prioritization Service
// AIDEV-NOTE: 병렬 AI 응답을 병합하고 중복제거, 카테고리 정렬, 우선순위 처리를 담당

import { 
  PredicateCandidate, 
  MergeOptions, 
  MergeResult 
} from '../utils/types/aiTypes'

export interface CategoryPriority {
  [category: string]: number
}

export interface MergeStats {
  totalInput: number
  duplicatesRemoved: number
  finalCount: number
  categoryDistribution: Record<string, number>
  sourceDistribution: {
    openaiOnly: number
    geminiOnly: number
    common: number
  }
}

export class ResponseMerger {
  private static instance: ResponseMerger
  
  // 카테고리 우선순위 (숫자가 낮을수록 높은 우선순위)
  private categoryPriority: CategoryPriority = {
    '요청': 1,
    'request': 1,    // 영문 대응
    '감정': 2,
    'emotion': 2,
    '상태': 3,
    'state': 3,
    '행동': 4,
    'action': 4,
    '특성': 5,
    'property': 5,
    'general': 6,
    '기타': 7,
    'other': 7
  }
  
  private constructor() {}
  
  public static getInstance(): ResponseMerger {
    if (!ResponseMerger.instance) {
      ResponseMerger.instance = new ResponseMerger()
    }
    return ResponseMerger.instance
  }
  
  // 메인 병합 메서드
  public mergeWithPriority(
    openaiResults: PredicateCandidate[] | null,
    geminiResults: PredicateCandidate[] | null,
    options: Partial<MergeOptions> = {}
  ): MergeResult {
    const mergeOptions: MergeOptions = {
      prioritizeOpenAI: true,
      removeDuplicates: true,
      sortByCategory: true,
      maxResults: undefined,
      ...options
    }
    
    console.log(`🔄 [ResponseMerger] 병합 시작 (OpenAI: ${openaiResults?.length || 0}, Gemini: ${geminiResults?.length || 0})`)
    
    // 1. 기본 병합
    const combined = this.combineResponses(openaiResults, geminiResults, mergeOptions)
    
    // 2. 중복 제거
    const { deduped, duplicatesRemoved } = mergeOptions.removeDuplicates 
      ? this.removeDuplicates(combined)
      : { deduped: combined, duplicatesRemoved: 0 }
    
    // 3. 카테고리별 정렬
    const sorted = mergeOptions.sortByCategory 
      ? this.sortByCategory(deduped)
      : deduped
    
    // 4. 결과 제한
    const final = mergeOptions.maxResults 
      ? sorted.slice(0, mergeOptions.maxResults)
      : sorted
    
    console.log(`✅ [ResponseMerger] 병합 완료: ${final.length}개 (중복 제거: ${duplicatesRemoved}개)`)
    
    return {
      mergedResults: final,
      duplicatesRemoved,
      openaiCount: openaiResults?.length || 0,
      geminiCount: geminiResults?.length || 0
    }
  }
  
  // 응답 통계 생성
  public generateMergeStats(
    openaiResults: PredicateCandidate[] | null,
    geminiResults: PredicateCandidate[] | null,
    mergedResults: PredicateCandidate[]
  ): MergeStats {
    const openaiSet = new Set((openaiResults || []).map(r => this.normalizeText(r.text)))
    const geminiSet = new Set((geminiResults || []).map(r => this.normalizeText(r.text)))
    // const mergedSet = new Set(mergedResults.map(r => this.normalizeText(r.text))) // unused for now
    
    // 카테고리 분포 계산
    const categoryDistribution = mergedResults.reduce((dist, item) => {
      const category = item.category || 'general'
      dist[category] = (dist[category] || 0) + 1
      return dist
    }, {} as Record<string, number>)
    
    // 소스 분포 계산
    let openaiOnly = 0
    let geminiOnly = 0
    let common = 0
    
    mergedResults.forEach(item => {
      const normalizedText = this.normalizeText(item.text)
      const inOpenAI = openaiSet.has(normalizedText)
      const inGemini = geminiSet.has(normalizedText)
      
      if (inOpenAI && inGemini) {
        common++
      } else if (inOpenAI) {
        openaiOnly++
      } else if (inGemini) {
        geminiOnly++
      }
    })
    
    const totalInput = (openaiResults?.length || 0) + (geminiResults?.length || 0)
    
    return {
      totalInput,
      duplicatesRemoved: totalInput - mergedResults.length,
      finalCount: mergedResults.length,
      categoryDistribution,
      sourceDistribution: {
        openaiOnly,
        geminiOnly,
        common
      }
    }
  }
  
  // 품질 분석
  public analyzeQuality(results: PredicateCandidate[]): {
    score: number
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    let score = 100
    
    // 1. 카테고리 다양성 검사
    const categories = new Set(results.map(r => r.category))
    if (categories.size < 3) {
      issues.push('카테고리 다양성 부족')
      recommendations.push('더 다양한 카테고리의 서술어를 포함하세요')
      score -= 10
    }
    
    // 2. 요청 카테고리 비율 검사
    const requestCount = results.filter(r => 
      r.category === '요청' || r.category === 'request'
    ).length
    const requestRatio = requestCount / results.length
    
    if (requestRatio < 0.3) {
      issues.push('요청 카테고리 비율 낮음')
      recommendations.push('자폐장애인이 사용하기 쉬운 요청 문장을 더 포함하세요')
      score -= 15
    }
    
    // 3. 문장 길이 검사
    const longSentences = results.filter(r => r.text.length > 15).length
    if (longSentences > results.length * 0.5) {
      issues.push('문장이 너무 복잡함')
      recommendations.push('4-7세 수준에 맞는 간단한 문장을 사용하세요')
      score -= 10
    }
    
    // 4. 이모지 누락 검사
    const missingEmoji = results.filter(r => !r.emoji || r.emoji.trim() === '').length
    if (missingEmoji > 0) {
      issues.push(`${missingEmoji}개 항목에 이모지 누락`)
      recommendations.push('모든 서술어에 직관적인 이모지를 포함하세요')
      score -= missingEmoji * 2
    }
    
    // 5. 중복 텍스트 검사 (정규화 후)
    const normalizedTexts = results.map(r => this.normalizeText(r.text))
    const uniqueTexts = new Set(normalizedTexts)
    if (uniqueTexts.size < normalizedTexts.length) {
      const duplicates = normalizedTexts.length - uniqueTexts.size
      issues.push(`${duplicates}개 중복 텍스트 발견`)
      recommendations.push('중복된 서술어를 제거하세요')
      score -= duplicates * 5
    }
    
    return {
      score: Math.max(0, score),
      issues,
      recommendations
    }
  }
  
  // 카테고리 우선순위 업데이트
  public updateCategoryPriority(newPriorities: CategoryPriority): void {
    this.categoryPriority = { ...this.categoryPriority, ...newPriorities }
    console.log('🔧 [ResponseMerger] 카테고리 우선순위 업데이트:', newPriorities)
  }
  
  // 현재 카테고리 우선순위 조회
  public getCategoryPriority(): CategoryPriority {
    return { ...this.categoryPriority }
  }
  
  // Private helper methods
  private combineResponses(
    openaiResults: PredicateCandidate[] | null,
    geminiResults: PredicateCandidate[] | null,
    options: MergeOptions
  ): PredicateCandidate[] {
    const combined: PredicateCandidate[] = []
    
    if (options.prioritizeOpenAI) {
      // OpenAI 결과 우선 추가
      if (openaiResults) {
        combined.push(...openaiResults)
      }
      if (geminiResults) {
        combined.push(...geminiResults)
      }
    } else {
      // Gemini 결과 우선 추가
      if (geminiResults) {
        combined.push(...geminiResults)
      }
      if (openaiResults) {
        combined.push(...openaiResults)
      }
    }
    
    return combined
  }
  
  private removeDuplicates(items: PredicateCandidate[]): {
    deduped: PredicateCandidate[]
    duplicatesRemoved: number
  } {
    const seen = new Set<string>()
    const deduped: PredicateCandidate[] = []
    let duplicatesRemoved = 0
    
    items.forEach(item => {
      const normalizedText = this.normalizeText(item.text)
      
      if (!seen.has(normalizedText)) {
        seen.add(normalizedText)
        deduped.push(item)
      } else {
        duplicatesRemoved++
        console.log(`🔍 [ResponseMerger] 중복 제거: "${item.text}"`)
      }
    })
    
    return { deduped, duplicatesRemoved }
  }
  
  private sortByCategory(items: PredicateCandidate[]): PredicateCandidate[] {
    return items.sort((a, b) => {
      const aPriority = this.categoryPriority[a.category] || 999
      const bPriority = this.categoryPriority[b.category] || 999
      
      // 1차: 카테고리 우선순위
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      // 2차: 텍스트 길이 (짧은 것 우선)
      if (a.text.length !== b.text.length) {
        return a.text.length - b.text.length
      }
      
      // 3차: 알파벳 순서
      return a.text.localeCompare(b.text, 'ko-KR')
    })
  }
  
  private normalizeText(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,!?]/g, '') // 구두점 제거
      .replace(/을\/를|이\/가|과\/와/g, '') // 조사 변형 제거
  }
  
  // 카테고리별 그룹핑
  public groupByCategory(items: PredicateCandidate[]): Record<string, PredicateCandidate[]> {
    return items.reduce((groups, item) => {
      const category = item.category || 'general'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(item)
      return groups
    }, {} as Record<string, PredicateCandidate[]>)
  }
  
  // 병합 결과 검증
  public validateMergeResult(result: PredicateCandidate[]): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // 필수 필드 검증
    result.forEach((item, index) => {
      if (!item.text || item.text.trim() === '') {
        errors.push(`항목 ${index + 1}: 텍스트가 비어있음`)
      }
      if (!item.emoji || item.emoji.trim() === '') {
        warnings.push(`항목 ${index + 1}: 이모지가 비어있음`)
      }
      if (!item.category || item.category.trim() === '') {
        warnings.push(`항목 ${index + 1}: 카테고리가 비어있음`)
      }
    })
    
    // 중복 검사
    const textCounts = new Map<string, number>()
    result.forEach(item => {
      const normalized = this.normalizeText(item.text)
      textCounts.set(normalized, (textCounts.get(normalized) || 0) + 1)
    })
    
    textCounts.forEach((count, text) => {
      if (count > 1) {
        warnings.push(`중복 텍스트 발견: "${text}" (${count}회)`)
      }
    })
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

export default ResponseMerger.getInstance()