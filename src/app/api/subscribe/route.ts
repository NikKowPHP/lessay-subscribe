'use server'
import { NextResponse } from 'next/server';
import { supabase } from '@/repositories/supabase/supabase';
import logger from '@/utils/logger';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { email } = payload;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email address" },
        { status: 400 }
      );
    }

    // Allow payload to specify a source, otherwise default to 'web'
    const source = payload.source || 'web';

    // Retrieve additional metadata (IP address)
    const ip_address =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "";

    // Insert the email along with additional metadata into the "waitlist" table
    const { error } = await supabase
      .from('waitlist')
      .insert([{ email, ip_address, source, status: "pending" }]);

    if (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Subscription successful" },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Subscription error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
export async function GET(req: Request) {
  const ip_address =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "";

  const { data, error } = await supabase.from('waitlist').select('*').eq('ip_address', ip_address);
  if (error) {
    return NextResponse.json(
      { message: error.message, isSubscribed: false },
      { status: 500 }
    );
  }
  return NextResponse.json(
    { message: "Subscription successful", isSubscribed: data.length > 0 },
    { status: 200 }
  );
}