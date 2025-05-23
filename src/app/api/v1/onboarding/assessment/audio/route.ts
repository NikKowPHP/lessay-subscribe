import { NextResponse } from 'next/server';
import { verifyJwt } from '@/services/auth.service';
import OnboardingService from '@/services/onboarding.service';
import { OnboardingRepository } from '@/repositories/onboarding.repository';
import LessonService from '@/services/lesson.service';
import AssessmentGeneratorService from '@/services/assessment-generator.service';
import AiService from '@/services/ai.service';
import { TTS } from '@/services/tts.service';

export async function POST(request: Request) {
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

    const formData = await request.formData();
    const sessionRecording = formData.get('sessionRecording') as Blob;
    const lessonId = formData.get('lessonId') as string;
    const recordingTime = formData.get('recordingTime') as string;
    const recordingSize = formData.get('recordingSize') as string;

    if (!sessionRecording || !lessonId || !recordingTime || !recordingSize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const onboardingRepository = new OnboardingRepository();
    const lessonService = new LessonService(null as any, null as any, null as any);
    const aiService = new AiService();
    const ttsService = new TTS(null as any);
    const assessmentGeneratorService = new AssessmentGeneratorService(aiService, ttsService, () => Promise.resolve(""));

    const onboardingService = new OnboardingService(onboardingRepository, lessonService, assessmentGeneratorService);
    const assessmentLesson = await onboardingService.getAssessmentLesson();

    if (!assessmentLesson) {
      return NextResponse.json({ error: 'Assessment lesson not found' }, { status: 404 });
    }

    const updatedAssessment = await onboardingService.processAssessmentLessonRecording(sessionRecording, assessmentLesson, Number(recordingTime), Number(recordingSize));

    return NextResponse.json(updatedAssessment);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}