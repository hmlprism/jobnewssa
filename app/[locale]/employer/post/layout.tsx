import { SiteHeader } from "@/components/layout/header";

export default async function PostJobLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
