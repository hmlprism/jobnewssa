import { SiteHeader } from "@/components/layout/header";

export default async function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
