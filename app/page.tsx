import { Suspense } from "react";
import { TruthGuardDashboard } from "@/components/truthguard-dashboard";

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading scanner...</div>}>
      <TruthGuardDashboard />
    </Suspense>
  );
}
