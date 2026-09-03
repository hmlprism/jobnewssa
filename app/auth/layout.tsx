import { SiteHeader } from "@/components/layout/header";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
