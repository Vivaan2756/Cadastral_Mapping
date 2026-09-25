import { Suspense } from "react";
import { Page2Reconcile } from "../../components/Page2Reconcile";

export const metadata = {
  title: "Statutory Administrative Reconciliation | TerraMap AI",
  description: "Reconciliation of Statutory Legal Cadastre against AI Ground-Truth Ortho Cadastre for Bairagarh Kalan, Bhopal.",
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
