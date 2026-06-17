"use client";

import dynamic from "next/dynamic";

const PageComponent = dynamic(() => import("@/modules/livraison/pages/Recuperation"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center">
    <div>Chargement...</div>
    </div>
  ),
});

export default function Page() {
  return <PageComponent />;
}
