import { NextResponse } from 'next/server';
import { verifyJwt } from '@/services/auth.service';
import LessonService from '@/services/lesson.service';
import { LessonRepository } from '@/repositories/lesson.repository';
import { OnboardingRepository } from '@/repositories/onboarding.repository';
import AssessmentGeneratorService from '@/services/assessment-generator.service';
import AiService from '@/services/ai.service';
import { TTS } from '@/services/tts.service';

export async function POST(
  request: Request,
  { params }: { params: { lessonId: string } }
) {
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
    const lessonId = params.lessonId;

    const formData = await request.formData();
    const sessionRecording = formData.get('sessionRecording') as Blob;
    const recordingTime = formData.get('recordingTime') as string;
    const recordingSize = formData.get('recordingSize') as string;

    if (!sessionRecording || !lessonId || !recordingTime || !recordingSize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const lessonRepository = new LessonRepository();
    const onboardingRepository = new OnboardingRepository();
    const lessonService = new LessonService(lessonRepository, null as any, onboardingRepository);
    const aiService = new AiService();
    const ttsService = new TTS(null as any);
    const assessmentGeneratorService = new AssessmentGeneratorService(aiService, ttsService, () => Promise.resolve(""));

    const lesson = await lessonService.getLessonById(lessonId);

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const updatedLesson = await lessonService.processLessonRecording(sessionRecording, Number(recordingTime), Number(recordingSize), lesson);

    return NextResponse.json(updatedLesson);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
