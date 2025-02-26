"use client";

import { useState } from "react";
import { Mic  } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="p-6 rounded-xl border border-black/[.08] dark:border-white/[.145] transition-all">
      <div className="flex items-start space-x-4">
        <div className="bg-gradient-to-b from-black/[.08] to-black/[.04] dark:from-white/[.08] dark:to-white/[.04] rounded-lg p-2">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold mb-1">{title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function FeaturesDropdown() {
  const [open, setOpen] = useState(false);

  const features = [
    {
      title: "Pronunciation Analysis: How it works",
      description:
        "Our AI uses Automatic Speech Recognition (ASR) and advanced acoustic modeling to analyze your speech. Leveraging a massive language model, it evaluates phonetic features, prosodic elements, directly from the audio, providing a comprehensive pronunciation assessment.",
        icon: <Mic className="w-5 h-5" />,
    },
    // {
    //   title: "Adaptive Learning",
    //   description:
    //     "Our algorithms tailor lessons to your current level and learning style.",
    //     icon: <GraduationCap className="w-5 h-5" />,
    // },
    // {
    //   title: "Smart Progress",
    //   description: "Focus on what matters - skip what you already know.",
    //   icon: <Lightbulb className="w-5 h-5" />,
    // }
  ];

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
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
          ))}
        </div>
      </div>
    </div>
  );
}