revoke select on profiles from anon;
revoke select on profiles from authenticated;

grant select (id, role, full_name, phone, province, city, headline, resume_url, avatar_url, created_at, updated_at, nqf_level, qualification_title, qualification_type, professional_registration, work_authorization, preferred_province, preferred_contract_type) on profiles to anon, authenticated;
