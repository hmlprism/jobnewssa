import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <div className="flex min-h-[60vh] items-start justify-center">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
