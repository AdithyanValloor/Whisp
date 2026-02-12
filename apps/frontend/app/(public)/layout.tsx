import type { ReactNode } from "react";

export default function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main>
      <div>
        {children}
      </div>
    </main>
  );
}
