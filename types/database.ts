export type UserRole = "job_seeker" | "employer" | "admin";
export type WorkAuthorization = "citizen" | "permanent_resident" | "work_permit" | "other";
export type ContractType =
  | "permanent"
  | "part_time"
  | "temporary"
  | "contract"
  | "internship"
  | "volunteer";
export type JobSource = "adzuna" | "manual" | "employer_direct";
export type JobStatus = "draft" | "pending_review" | "published" | "expired" | "rejected";
export type ApplicationStatus = "submitted" | "viewed" | "shortlisted" | "rejected" | "hired";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  province: string | null;
  city: string | null;
  headline: string | null;
  resume_url: string | null;
  avatar_url: string | null;
  // Qualifications
  nqf_level: string | null;
  qualification_title: string | null;
  qualification_type: string | null;
  professional_registration: string | null;
  // Work authorisation
  work_authorization: WorkAuthorization | null;
  // Job preferences (used for future candidate matching)
  preferred_province: string | null;
  preferred_contract_type: ContractType | null;
  desired_salary_min: number | null;
  // Private — owner-only via security definer RPC; never returned by select *
  disability_status: string | null;
  ee_designation: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  province: string | null;
  city: string | null;
  verified: boolean;
  verification_method: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface Sector {
  id: number;
  name: string;
  slug: string;
}

export interface Job {
  id: string;
  company_id: string | null;
  company_name_raw: string | null;
  posted_by: string | null;
  title: string;
  slug: string;
  description: string;
  sector_id: number | null;
  province: string | null;
  city: string | null;
  is_remote: boolean;
  contract_type: ContractType;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_is_market_related: boolean;
  ee_aa_only: boolean;
  disabled_only: boolean;
  employment_equity_note: string | null;
  accommodation_contact: string | null;
  required_nqf_level: string | null;
  required_qualification_type: string | null;
  source: JobSource;
  external_id: string | null;
  external_url: string | null;
  status: JobStatus;
  posted_at: string;
  expires_at: string | null;
  views_count: number;
  created_at: string;
  updated_at: string;
  // joined
  company?: Company | null;
  sector?: Sector | null;
}

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_note: string | null;
  resume_url: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  application_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface JobAlert {
  id: string;
  user_id: string | null;
  email: string;
  keywords: string | null;
  province: string | null;
  sector_id: number | null;
  frequency: string;
  active: boolean;
  created_at: string;
  last_sent_at: string | null;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  source_name: string;
  source_url: string;
  image_url: string | null;
  published_at: string;
  category: string | null;
  created_at: string;
}

// Note: no `Database` generic type is exported from this file anymore.
// supabase-js's client generic doesn't infer correctly against a Database
// built from named interfaces like the ones below (see lib/supabase/client.ts
// for the full explanation) — so the Supabase clients are created untyped,
// and query results are cast to these interfaces at each call site instead
// (see lib/jobs-query.ts for the pattern). Swap in real generated types
// (`supabase gen types typescript`) once the project is live if you want
// end-to-end client type safety.

export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  permanent: "Permanent",
  part_time: "Part-Time",
  temporary: "Temporary",
  contract: "Contract",
  internship: "Internship",
  volunteer: "Volunteer",
};
