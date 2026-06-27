import { redirect } from "next/navigation";

// Canonical /profiles/[profileId] entry point; the workflow lives at /p/[slug].
export default async function ProfileWorkflow({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/p/${slug}`);
}
