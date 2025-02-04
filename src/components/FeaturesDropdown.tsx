"use client";

import { useState } from "react";

export default function FeaturesDropdown() {
  const [open, setOpen] = useState(true);

  return (
    <div className="w-full">
      <div className="flex justify-center sm:justify-start">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8 group"
        >
          {open ? "Hide Details" : "How it works"}
          <svg
            className={`w-4 h-4 ml-2 transition-transform duration-300 ${
              open ? "rotate-90" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 mt-4 ${
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="grid grid-cols-1 gap-3">
          {/* Feature Card: Adaptive Learning */}
          <div className="p-6 rounded-xl border border-black/[.08] dark:border-white/[.145] transition-all">
            <div className="flex items-start space-x-4">
              <div className="bg-gradient-to-b from-black/[.08] to-black/[.04] dark:from-white/[.08] dark:to-white/[.04] rounded-lg p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Adaptive Learning</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Our algorithms tailor lessons to your current level and learning style.
                </p>
              </div>
            </div>
          </div>

          {/* Feature Card: Smart Progress */}
          <div className="p-6 rounded-xl border border-black/[.08] dark:border-white/[.145] transition-all">
            <div className="flex items-start space-x-4">
              <div className="bg-gradient-to-b from-black/[.08] to-black/[.04] dark:from-white/[.08] dark:to-white/[.04] rounded-lg p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart Progress</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Focus on what matters - skip what you already know.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}