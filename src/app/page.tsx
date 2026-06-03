// @ts-nocheck
"use client";

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/commerce/ventes");
}

export const dynamic = "force-dynamic";
