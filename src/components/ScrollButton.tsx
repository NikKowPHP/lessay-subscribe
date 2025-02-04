"use client";

export default function ScrollButton() {
  const handleClick = () => {
    const features = document.getElementById("features");
    if (features) {
      features.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8 group"
    >
      How it works
      <svg
        className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </button>
  );
}