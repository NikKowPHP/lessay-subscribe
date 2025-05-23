import { NextResponse } from 'next/server';
import { verifyJwt } from '@/services/auth.service';
import OnboardingService from '@/services/onboarding.service';
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
    const onboardingService = new OnboardingService(new OnboardingRepository(), null as any, null as any);
    const onboarding = await onboardingService.getOnboarding();

    if (!onboarding) {
      return NextResponse.json({ message: 'Onboarding not found' }, { status: 404 });
    }

    return NextResponse.json({
      userId: onboarding.userId,
      nativeLanguage: onboarding.nativeLanguage,
      targetLanguage: onboarding.targetLanguage,
      proficiencyLevel: onboarding.proficiencyLevel,
      learningPurpose: onboarding.learningPurpose,
      initialAssessmentCompleted: onboarding.initialAssessmentCompleted,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}