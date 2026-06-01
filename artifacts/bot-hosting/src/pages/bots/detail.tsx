import React, { useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetBot, 
  useGetBotLogs, 
  useStartBot, 
  useStopBot, 
  useRestartBot, 
  useDeleteBot,
  getGetBotQueryKey,
  getListBotsQueryKey,
  getGetDashboardStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BotStatusBadge } from "@/components/bot-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings, Play, Square, RotateCw, Trash2, Terminal as TerminalIcon, Activity } from "lucide-react";
import { format } from "date-fns";

export default function BotDetail() {
  const [, params] = useRoute("/bots/:id");
  const id = parseInt(params?.id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Poll for bot status every 5 seconds if running/starting/stopping
  const { data: bot, isLoading: botLoading } = useGetBot(id, { 
    query: { 
      enabled: !!id, 
      queryKey: getGetBotQueryKey(id),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return (status === 'starting' || status === 'stopping' || status === 'running') ? 5000 : false;
      }
    } 
  });

  // Poll for logs more frequently if bot is running
  const { data: logs, isLoading: logsLoading } = useGetBotLogs(id, {
    query: {
      enabled: !!id,
      refetchInterval: bot?.status === 'running' ? 3000 : false
    }
  });

  const startBot = useStartBot();
  const stopBot = useStopBot();
  const restartBot = useRestartBot();
  const deleteBot = useDeleteBot();

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleAction = (action: 'start' | 'stop' | 'restart' | 'delete') => {
    const options = {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBotQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        toast({ title: `Command ${action} executed successfully` });
        if (action === 'delete') {
          setLocation("/bots");
        }
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
        if (confirm("Are you sure you want to delete this bot? This action cannot be undone.")) {
          deleteBot.mutate({ id }, options); 
        }
        break;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-400';
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-destructive';
      case 'debug': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  if (botLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
        <Skeleton className="h-96 w-full rounded-none" />
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="text-center p-12 text-destructive font-mono">
        BOT_NOT_FOUND. ID: {id}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/bots")} className="rounded-none border-border">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary uppercase">{bot.name}</h1>
            <div className="flex items-center space-x-3 mt-1">
              <span className="font-mono text-xs text-muted-foreground">ID: {bot.id}</span>
              <BotStatusBadge status={bot.status} />
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            className="rounded-none border-border hover:bg-green-500/20 hover:text-green-500 hover:border-green-500/50 uppercase tracking-widest text-xs font-bold"
            onClick={() => handleAction('start')}
            disabled={bot.status === 'running' || bot.status === 'starting' || startBot.isPending}
          >
            <Play className="mr-2 h-4 w-4" /> Start
          </Button>
          <Button 
            variant="outline" 
            className="rounded-none border-border hover:bg-yellow-500/20 hover:text-yellow-500 hover:border-yellow-500/50 uppercase tracking-widest text-xs font-bold"
            onClick={() => handleAction('restart')}
            disabled={bot.status === 'stopped' || bot.status === 'error' || restartBot.isPending}
          >
            <RotateCw className="mr-2 h-4 w-4" /> Restart
          </Button>
          <Button 
            variant="outline" 
            className="rounded-none border-border hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50 uppercase tracking-widest text-xs font-bold"
            onClick={() => handleAction('stop')}
            disabled={bot.status === 'stopped' || bot.status === 'error' || bot.status === 'stopping' || stopBot.isPending}
          >
            <Square className="mr-2 h-4 w-4" /> Stop
          </Button>
          <Button 
            variant="outline" 
            className="rounded-none border-border"
            onClick={() => setLocation(`/bots/${bot.id}/edit`)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-none border-border bg-card col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center text-sm uppercase text-muted-foreground font-bold tracking-wider">
              <Activity className="mr-2 h-4 w-4 text-primary" /> Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground font-bold">Description</p>
              <p className="text-sm mt-1">{bot.description || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground font-bold">Phone Number</p>
              <p className="text-sm font-mono mt-1">{bot.phoneNumber || "Not Configured"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground font-bold">Webhook URL</p>
              <p className="text-sm font-mono mt-1 truncate" title={bot.webhookUrl || ""}>{bot.webhookUrl || "Not Configured"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground font-bold">Uptime</p>
              <p className="text-sm font-mono mt-1">
                {bot.uptimeSeconds ? `${Math.floor(bot.uptimeSeconds / 3600)}h ${Math.floor((bot.uptimeSeconds % 3600) / 60)}m ${bot.uptimeSeconds % 60}s` : '0s'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground font-bold">Created</p>
              <p className="text-sm font-mono mt-1">{format(new Date(bot.createdAt), 'yyyy-MM-dd HH:mm:ss')}</p>
            </div>
            
            <div className="pt-4 border-t border-border mt-4">
              <Button 
                variant="outline" 
                className="w-full rounded-none border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleAction('delete')}
                disabled={deleteBot.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" /> DESTROY_INSTANCE
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border bg-black col-span-1 md:col-span-2 flex flex-col h-[500px]">
          <CardHeader className="border-b border-border/50 py-3 bg-card">
            <CardTitle className="flex items-center text-sm uppercase text-primary font-bold tracking-wider">
              <TerminalIcon className="mr-2 h-4 w-4" /> Live Terminal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/0 to-black pointer-events-none z-10" />
            <div className="h-full overflow-y-auto p-4 font-mono text-xs leading-relaxed tracking-tight" style={{ scrollbarWidth: 'thin' }}>
              {logsLoading ? (
                <div className="text-muted-foreground animate-pulse">Initializing log stream...</div>
              ) : logs && logs.length > 0 ? (
                <div className="space-y-1">
                  {logs.map((log) => (
                    <div key={log.id} className="flex space-x-3 hover:bg-white/5 px-1 rounded-sm transition-colors">
                      <span className="text-muted-foreground/50 shrink-0 select-none">
                        [{format(new Date(log.createdAt), 'HH:mm:ss')}]
                      </span>
                      <span className={`shrink-0 uppercase font-bold w-12 ${getLogLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                      <span className="text-gray-300 break-all">{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              ) : (
                <div className="text-muted-foreground/50 italic">No logs recorded for this instance.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
