import { redirect } from "next/navigation";

export default async function DirectCredentialPage({ params }: PageProps<"/credential/[id]">) {
  const { id } = await params;
  redirect(`/report/${id}/credential`);
}
