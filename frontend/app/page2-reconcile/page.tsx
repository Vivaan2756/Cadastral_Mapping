import { Suspense } from "react";
import { Page2Reconcile } from "../../components/Page2Reconcile";
import { TopNavbar } from "../../components/layout/TopNavbar";

export const metadata = {
  title: "Statutory Administrative Reconciliation | TerraMap AI",
  description: "Reconciliation of Statutory Legal Cadastre against AI Ground-Truth Ortho Cadastre for Bairagarh Kalan, Bhopal.",
};

export default function Page() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TopNavbar />
      <div className="flex-1 relative">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-[#070d1e] text-cyan-400 font-mono text-sm">
              Loading Cadastral Reconciliation Environment...
            </div>
          }
        >
          <Page2Reconcile />
        </Suspense>
      </div>
    </div>
  );
}
