import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// for components of shadcn/ui
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
