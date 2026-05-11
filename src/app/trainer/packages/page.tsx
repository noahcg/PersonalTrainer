import { AppShell } from "@/components/layout/app-shell";
import { TrainerPackagesManager } from "@/components/product/trainer-packages-manager";
import { getTrainerPackageTypes } from "@/lib/package-types";
import { getTrainerPackages } from "@/lib/training-packages";

export default async function TrainerPackagesPage() {
  const [{ packages, mode }, { packageTypes }] = await Promise.all([getTrainerPackages(), getTrainerPackageTypes()]);

  return (
    <AppShell
      role="trainer"
      title="Training packages"
      subtitle="Manage client package terms, balances, pricing, policies, status, and package-level history."
    >
      <TrainerPackagesManager initialPackages={packages} initialPackageTypes={packageTypes} mode={mode} />
    </AppShell>
  );
}
