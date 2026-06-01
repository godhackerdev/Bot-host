import React from "react";
import { Link, useLocation } from "wouter";
import { Bot, LayoutDashboard, Terminal, Settings } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/bots", label: "Bots", icon: Bot },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Terminal className="mr-2 h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-primary">BOT_HOST</span>
        </div>
        <nav className="flex space-x-2 md:flex-col md:space-x-0 md:space-y-1 p-4 overflow-x-auto md:overflow-x-visible">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center space-x-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
