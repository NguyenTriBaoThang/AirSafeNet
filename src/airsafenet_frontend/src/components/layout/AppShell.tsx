import type { ReactNode } from "react";
import AppHeader from "./AppHeader";
import SidebarNav from "./SidebarNav";

type Props = {
  children: ReactNode;
  title?: string;
};

export default function AppShell({ children }: Props) {
  return (
    <div className="app-shell">
      <AppHeader />
      <div className="app-shell__body">
        <SidebarNav />
        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  );
}