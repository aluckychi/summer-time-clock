import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { THEME_BOOTSTRAP } from "./clock-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SUMMER TIME — 夏の時計",
  description:
    "暑すぎる夏を先回りして生きるための時計。実時刻より1時間ぶん先の「サマータイム」を表示します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      data-theme="day"
      suppressHydrationWarning
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {children}
      </body>
    </html>
  );
}
