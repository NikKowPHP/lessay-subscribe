'use client';

import { User } from 'lucide-react';
import Link from 'next/link';

export default function HeaderWithProfile() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 h-14 flex justify-end items-center">
        <Link href="/app/profile" title="User Profile">
          <User className="h-6 w-6 text-gray-600 hover:text-gray-900" />
        </Link>
      </div>
    </header>
  );
}
