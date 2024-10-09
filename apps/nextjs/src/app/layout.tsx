import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

import { BasicProvider } from "@basictech/nextjs"

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};


const basic_schema = {
  project_id: '123',
  namespace: 'todos',
  version: 0,
  tables: {
      todos: {
          name: 'todos',
          type: 'collection',
          fields: {
              id: {
                  type: 'string',
                  primary: true,
              },
              title: {
                  type: 'string',
                  indexed: true,
              },
              completed: {
                  type: 'boolean',
                  indexed: true,
              }
          }
      },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BasicProvider project_id="5a15ffd6-89fe-4921-a1a0-e411ecd6da97" schema={basic_schema}>
        {children}
        </BasicProvider>
        </body>
    </html>
  );
}
