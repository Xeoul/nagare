"use client";

import { createContext, useContext } from "react";
import type { Content } from "@/lib/content";

export type FeedContextValue = {
  content: Content;
  furigana: boolean;
  saved: Set<string>;
  openGloss: (key: string) => void;
  toggleSave: (key: string) => void;
};

export const FeedContext = createContext<FeedContextValue | null>(null);

export function useFeed(): FeedContextValue {
  const value = useContext(FeedContext);
  if (!value) throw new Error("useFeed must be used inside the feed");
  return value;
}
