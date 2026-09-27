import { Suspense } from "react";
import { Page2Reconcile } from "../../components/Page2Reconcile";

export const metadata = {
  title: "Cadastral Reconciliation | TerraMap AI",
  description:
    "AI-powered cadastral mapping, parcel visualization, and administrative reconciliation using official geographic datasets.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#070d1e] text-cyan-400 font-mono text-sm">
          Loading Cadastral Reconciliation Environment...
        </div>
      }
    >
      <Page2Reconcile />
    </Suspense>
  );
}
