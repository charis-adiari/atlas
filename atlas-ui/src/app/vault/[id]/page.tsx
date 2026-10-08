import { Workspace } from "@/components/Workspace";

export default async function VaultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Workspace vaultId={id} />;
}