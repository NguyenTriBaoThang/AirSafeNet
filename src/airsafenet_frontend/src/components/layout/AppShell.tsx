import type { ReactNode } from "react";
import AppHeader from "./AppHeader";
import SidebarNav from "./SidebarNav";

type Props = {
  title: string;
  children: ReactNode;
};

export default function AppShell({ title, children }: Props) {
  return (
    <div className="app-shell">
      <AppHeader title={title} />

      <div className="app-shell__body">
        <SidebarNav />

        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  );
}