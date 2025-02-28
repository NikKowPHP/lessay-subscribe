
export interface IAIService {
   generateContent(fileUri: string, userMessage: string, systemMessage: string, model: string): Promise<Record<string, unknown>>
}

export interface IUploadableAIService extends IAIService {
  uploadFile(
    audioBuffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<string> 
}