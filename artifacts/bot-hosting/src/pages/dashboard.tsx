import React from "react";
import { useGetDashboardStats, useListBots } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Bot as BotIcon, PauseCircle } from "lucide-react";
import { BotStatusBadge } from "@/components/bot-status-badge";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: bots, isLoading: botsLoading } = useListBots();

  const recentBots = bots?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">SYSTEM_OVERVIEW</h1>
          <p className="text-muted-foreground mt-1">Real-time telemetry and cluster status.</p>
        </div>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-none" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-none border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Total Bots</CardTitle>
              <BotIcon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground" data-testid="stat-total">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="rounded-none border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Running</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500" data-testid="stat-running">{stats.running}</div>
            </CardContent>
          </Card>
          <Card className="rounded-none border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Stopped</CardTitle>
              <PauseCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground" data-testid="stat-stopped">{stats.stopped}</div>
            </CardContent>
          </Card>
          <Card className="rounded-none border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive" data-testid="stat-errors">{stats.error}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-1">
        <Card className="rounded-none border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-primary uppercase">Recent Bot Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {botsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-none" />
                ))}
              </div>
            ) : recentBots.length > 0 ? (
              <div className="divide-y divide-border border border-border">
                {recentBots.map((bot) => (
                  <Link key={bot.id} href={`/bots/${bot.id}`}>
                    <div className="flex items-center justify-between p-4 hover:bg-secondary/50 cursor-pointer transition-colors group">
                      <div className="flex flex-col space-y-1">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{bot.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-md">
                          {bot.description || "No description"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <BotStatusBadge status={bot.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground border border-dashed border-border">
                NO_BOTS_FOUND. INITIATE_CREATE_SEQUENCE.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
