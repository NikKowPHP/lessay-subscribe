import { NextResponse } from 'next/server';
import { verifyJwt } from '@/services/auth.service';
import OnboardingService from '@/services/onboarding.service';
import { OnboardingRepository } from '@/repositories/onboarding.repository';
import LessonService from '@/services/lesson.service';
import AssessmentGeneratorService from '@/services/assessment-generator.service';
import AiService from '@/services/ai.service';
import { TTS } from '@/services/tts.service';

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authorization.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.sub;
    const onboardingRepository = new OnboardingRepository();
    const lessonService = new LessonService(null as any, null as any, null as any);
    const aiService = new AiService();
    const ttsService = new TTS(null as any);
    const assessmentGeneratorService = new AssessmentGeneratorService(aiService, ttsService, () => Promise.resolve(""));

    const onboardingService = new OnboardingService(onboardingRepository, lessonService, assessmentGeneratorService);
    const assessmentLesson = await onboardingService.getAssessmentLesson();

    return NextResponse.json(assessmentLesson);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}