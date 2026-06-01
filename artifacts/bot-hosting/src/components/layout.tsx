import React from "react";
import { Link, useLocation } from "wouter";
import { Bot, LayoutDashboard, Terminal, Shield, LogOut, ChevronDown } from "lucide-react";
import { useClerk } from "@clerk/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Me {
  id: number;
  email: string;
  name?: string | null;
  picture?: string | null;
  role: string;
  approvalStatus: string;
  approvedUntil?: string | null;
}

interface LayoutProps {
  children: React.ReactNode;
  me: Me;
}

export function Layout({ children, me }: LayoutProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/bots", label: "Bots", icon: Bot },
    ...(me.role === "admin" ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  const expiryLabel = me.approvedUntil
    ? `Expires ${new Date(me.approvedUntil).toLocaleDateString()}`
    : me.role === "admin"
    ? "Admin"
    : null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card flex flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Terminal className="mr-2 h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-primary">BOT_HOST</span>
        </div>

        <nav className="flex space-x-2 md:flex-col md:space-x-0 md:space-y-1 p-4 overflow-x-auto md:overflow-x-visible flex-1">
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

        {/* User menu */}
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-secondary transition-colors text-left">
                {me.picture ? (
                  <img
                    src={me.picture}
                    alt={me.name ?? me.email}
                    className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                    {(me.name ?? me.email)[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{me.name ?? me.email}</div>
                  {expiryLabel && (
                    <div className="text-[10px] text-muted-foreground truncate">{expiryLabel}</div>
                  )}
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {me.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                className="text-destructive focus:text-destructive cursor-pointer text-xs"
              >
                <LogOut className="h-3 w-3 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
