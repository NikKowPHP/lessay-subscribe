import { LessonModel, LessonStep } from "@/models/AppAllModels.model"
import { ILessonRepository } from "@/lib/interfaces/all-interfaces"

export default class LessonService implements ILessonRepository {
  private lessonRepository: ILessonRepository

  constructor(lessonRepository: ILessonRepository) {
    this.lessonRepository = lessonRepository
  }

  async getLessons(): Promise<LessonModel[]> {
    return this.lessonRepository.getLessons()
  }

  async getLessonById(lessonId: string): Promise<LessonModel | null> {
    return this.lessonRepository.getLessonById(lessonId)
  }

  async createLesson(lessonData: {
    focusArea: string
    targetSkills: string[]
    sequence: LessonStep[]
  }): Promise<LessonModel> {
    return this.lessonRepository.createLesson(lessonData)
  }

  async updateLesson(lessonId: string, lessonData: Partial<LessonModel>): Promise<LessonModel> {
    return this.lessonRepository.updateLesson(lessonId, lessonData)
  }

  async completeLesson(
    lessonId: string,
    performanceMetrics?: {
      accuracy?: number
      pronunciationScore?: number
      errorPatterns?: string[]
    }
  ): Promise<LessonModel> {
    return this.lessonRepository.completeLesson(lessonId, performanceMetrics)
  }

  async deleteLesson(lessonId: string): Promise<void> {
    return this.lessonRepository.deleteLesson(lessonId)
  }
}