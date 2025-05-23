import { NextResponse } from 'next/server';
import { verifyJwt } from '@/services/auth.service';
import { getLearningProgressAction } from '@/lib/server-actions/learning_progress-actions';

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

    const progressSummary = await getLearningProgressAction(userId);

    if (!progressSummary) {
      return NextResponse.json({ error: 'Progress summary not found' }, { status: 404 });
    }

    return NextResponse.json(progressSummary);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}