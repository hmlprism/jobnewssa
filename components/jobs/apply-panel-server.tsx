import { getAuthUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { ApplyPanel } from "./apply-panel";

export async function ApplyPanelServer({ jobId }: { jobId: string }) {
  const user = await getAuthUser();

  if (!user) {
    return <ApplyPanel jobId={jobId} userId={null} initialStatus="signed_out" />;
  }

  const supabase = await createClient();
  const [{ data: profile }, { data: existing }] = await Promise.all([
    supabase
      .from("profiles")
      .select("resume_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("applicant_id", user.id)
      .maybeSingle(),
  ]);

  if (!profile?.resume_url) {
    return <ApplyPanel jobId={jobId} userId={user.id} initialStatus="no_resume" />;
  }
  if (existing) {
    return <ApplyPanel jobId={jobId} userId={user.id} initialStatus="applied" />;
  }
  return <ApplyPanel jobId={jobId} userId={user.id} initialStatus="ready" />;
}
