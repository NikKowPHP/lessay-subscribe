import { NextResponse } from 'next/server';
import { verifyJwt } from '@/services/auth.service';
import OnboardingService from '@/services/onboarding.service';
import { OnboardingRepository } from '@/repositories/onboarding.repository';

export async function POST(
  request: Request,
  { params }: { params: { stepName: string } }
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
    const stepName = params.stepName;
    const formData = await request.json();

    const onboardingService = new OnboardingService(new OnboardingRepository(), null as any, null as any);
    const updatedOnboarding = await onboardingService.updateOnboarding(stepName, formData);

    return NextResponse.json(updatedOnboarding);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}