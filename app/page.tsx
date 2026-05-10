"use client";

import { HomeView } from "@/components/home-view";

/** Today’s court grid; unauthenticated visitors are sent to `/login` (or `/login?mode=signup`). */
export default function Home() {
  return <HomeView />;
}
