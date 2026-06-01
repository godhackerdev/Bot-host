import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListBots, useStartBot, useStopBot, useRestartBot, useDeleteBot, getListBotsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BotStatusBadge } from "@/components/bot-status-badge";
import { Play, Square, RotateCw, Trash2, Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function BotsList() {
  const { data: bots, isLoading } = useListBots();
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const startBot = useStartBot();
  const stopBot = useStopBot();
  const restartBot = useRestartBot();
  const deleteBot = useDeleteBot();

  const filteredBots = bots?.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || (b.description && b.description.toLowerCase().includes(search.toLowerCase()))) || [];

  const handleAction = (e: React.MouseEvent, action: 'start' | 'stop' | 'restart' | 'delete', id: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const options = {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        toast({ title: `Command ${action} executed successfully` });
      },
      onError: (err: any) => {
        toast({ title: `Failed to ${action} bot`, description: err.message, variant: "destructive" });
      }
    };

    switch (action) {
      case 'start': startBot.mutate({ id }, options); break;
      case 'stop': stopBot.mutate({ id }, options); break;
      case 'restart': restartBot.mutate({ id }, options); break;
      case 'delete': 
        if (confirm("Are you sure you want to delete this bot?")) {
          deleteBot.mutate({ id }, options); 
        }
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">BOT_FLEET</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor your WhatsApp bot instances.</p>
        </div>
        <Button onClick={() => setLocation("/bots/new")} className="rounded-none font-bold tracking-wider">
          <Plus className="mr-2 h-4 w-4" /> DEPLOY_NEW_BOT
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Filter by name or description..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-md rounded-none bg-card border-border focus-visible:ring-primary"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-none" />
          ))}
        </div>
      ) : filteredBots.length > 0 ? (
        <div className="grid gap-4">
          {filteredBots.map((bot) => (
            <Link key={bot.id} href={`/bots/${bot.id}`}>
              <Card className="rounded-none border-border hover:border-primary/50 transition-colors cursor-pointer group bg-card">
                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{bot.name}</h3>
                      <BotStatusBadge status={bot.status} />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {bot.description || "No description provided."}
                    </p>
                    <div className="text-xs text-muted-foreground font-mono mt-2">
                      ID: {bot.id} | UPTIME: {bot.uptimeSeconds ? `${Math.floor(bot.uptimeSeconds / 60)}m` : '0m'}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 shrink-0">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-none border-border hover:bg-green-500/20 hover:text-green-500 hover:border-green-500/50"
                      onClick={(e) => handleAction(e, 'start', bot.id)}
                      disabled={bot.status === 'running' || bot.status === 'starting' || startBot.isPending}
                      title="Start Bot"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-none border-border hover:bg-yellow-500/20 hover:text-yellow-500 hover:border-yellow-500/50"
                      onClick={(e) => handleAction(e, 'restart', bot.id)}
                      disabled={bot.status === 'stopped' || bot.status === 'error' || restartBot.isPending}
                      title="Restart Bot"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-none border-border hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50"
                      onClick={(e) => handleAction(e, 'stop', bot.id)}
                      disabled={bot.status === 'stopped' || bot.status === 'error' || bot.status === 'stopping' || stopBot.isPending}
                      title="Stop Bot"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="rounded-none border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                      onClick={(e) => handleAction(e, 'delete', bot.id)}
                      disabled={deleteBot.isPending}
                      title="Delete Bot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="rounded-none border-border border-dashed bg-transparent">
          <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Search className="h-12 w-12 mb-4 text-border" />
            <p className="text-lg font-mono">NO_MATCHING_RECORDS</p>
            <p className="text-sm">Adjust your filters or deploy a new instance.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
