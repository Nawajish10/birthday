import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = { title: "A birthday world for Meerah", description: "A little birthday experience made just for you." };
export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
