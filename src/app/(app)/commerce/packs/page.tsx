"use client";

import dynamic from "next/dynamic";

const PageComponent = dynamic(() => import("@/modules/commerce/pages/Packs"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div>Chargement...</div>
    </div>
  ),
});

export default function Page() {
  return <PageComponent />;
}
