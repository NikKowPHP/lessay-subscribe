// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Conditionally merges CSS class names.
 * Uses clsx to handle conditional classes and tailwind-merge to resolve conflicts.
 * @param inputs - Class names or conditional class objects.
 * @returns A string of merged class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// You can add other utility functions to this file as needed.
