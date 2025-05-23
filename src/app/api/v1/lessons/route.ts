import { NextResponse } from 'next/server';
import { verifyJwt } from '@/services/auth.service';
import LessonService from '@/services/lesson.service';
import { LessonRepository } from '@/repositories/lesson.repository';
import { OnboardingRepository } from '@/repositories/onboarding.repository';

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
    const lessonRepository = new LessonRepository();
    const onboardingRepository = new OnboardingRepository();
    const lessonService = new LessonService(lessonRepository, null as any, onboardingRepository);
    const lessons = await lessonService.getLessons(userId);

    return NextResponse.json(lessons);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}