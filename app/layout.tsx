import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Fraunces, Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "South Africa Job Vacancies | Job News SA",
    template: "%s | Job News SA",
  },
  description:
    "Job News SA connects people with opportunities, keeps South Africans informed, and contributes to a brighter, more inclusive future. Real vacancies across all nine provinces, free for job seekers.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        {children}
        <script
          data-cfasync="false"
          type="text/javascript"
          id="clever-core"
          dangerouslySetInnerHTML={{
            __html: `/* <![CDATA[ */
    (function (document, window) {
        var a, c = document.createElement("script"), f = window.frameElement;

        c.id = "CleverCoreLoader106978";
        c.src = "https://scripts.cleverwebserver.com/f486c19997701daecae13922116d9e04.js";

        c.async = !0;
        c.type = "text/javascript";
        c.setAttribute("data-target", window.name || (f && f.getAttribute("id")));
        c.setAttribute("data-callback", "put-your-callback-function-here");
        c.setAttribute("data-callback-url-click", "put-your-click-macro-here");
        c.setAttribute("data-callback-url-view", "put-your-view-macro-here");

        try {
            a = parent.document.getElementsByTagName("script")[0] || document.getElementsByTagName("script")[0];
        } catch (e) {
            a = !1;
        }

        a || (a = document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]);
        a.parentNode.insertBefore(c, a);
    })(document, window);
/* ]]> */`,
          }}
        />
        <div className="clever-core-ads"></div>
        <Analytics />
      </body>
    </html>
  );
}
