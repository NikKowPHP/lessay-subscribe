'use server'
import { NextResponse } from 'next/server';
import { supabase } from '@/repositories/supabase/supabase';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email address" },
        { status: 400 }
      );
    }

    // Retrieve additional metadata
    const ip_address =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "";
    // You can also add more metadata if needed (for example, checking a "source" field from the body)
    const source = "web";

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
    console.error("Subscription error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}