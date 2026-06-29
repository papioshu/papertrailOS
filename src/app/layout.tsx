import type { Metadata } from "next";
import "./globals.css";
import { MusicPlayer } from "@/components/MusicPlayer";

export const metadata: Metadata = {
  title: "Papertrail OS",
  description: "Track. Connect. Remember. — lead research, grading, and controlled outreach.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <MusicPlayer />
      </body>
    </html>
  );
}
