"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ApplicationStatus } from "@/types/database";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

export function ApplicantStatus({
  applicationId,
  initialStatus,
}: {
  applicationId: string;
  initialStatus: ApplicationStatus;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(initialStatus);
  const [saving, setSaving] = useState(false);

  async function handleChange(newStatus: ApplicationStatus) {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", applicationId);
    setStatus(newStatus);
    setSaving(false);
  }

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value as ApplicationStatus)}
      disabled={saving}
      className="border border-[var(--color-line)] bg-[var(--color-paper)] px-2 py-1 text-sm disabled:opacity-50"
    >
      {(Object.entries(STATUS_LABELS) as [ApplicationStatus, string][]).map(
        ([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        )
      )}
    </select>
  );
}
