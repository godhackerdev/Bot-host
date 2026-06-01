import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetBot,
  useGetBotLogs,
  useStartBot,
  useStopBot,
  useRestartBot,
  useDeleteBot,
  useSendBotInput,
  getGetBotQueryKey,
  getGetBotLogsQueryKey,
  getListBotsQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BotStatusBadge } from "@/components/bot-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Settings,
  Play,
  Square,
  RotateCw,
  Trash2,
  Terminal as TerminalIcon,
  Activity,
  Upload,
  Send,
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { format } from "date-fns";

type WsMessage = { type: "stdout" | "stderr" | "stdin" | "system"; data: string; botId: number };

export default function BotDetail() {
  const [, params] = useRoute("/bots/:id");
  const id = parseInt(params?.id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [terminalLines, setTerminalLines] = useState<{ type: string; text: string }[]>([]);
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: bot, isLoading: botLoading, refetch: refetchBot } = useGetBot(id, {
    query: {
      enabled: !!id,
      queryKey: getGetBotQueryKey(id),
      refetchInterval: (query) => {
        const s = query.state.data?.status;
        const ins = query.state.data?.installStatus;
        return s === "running" || s === "starting" || ins === "installing" ? 4000 : false;
      },
    },
  });

  const { data: logs } = useGetBotLogs(id, {
    query: { enabled: !!id, queryKey: getGetBotLogsQueryKey(id) },
  });

  const startBot = useStartBot();
  const stopBot = useStopBot();
  const restartBot = useRestartBot();
  const deleteBot = useDeleteBot();
  const sendBotInput = useSendBotInput();

  const appendLine = useCallback((type: string, text: string) => {
    setTerminalLines((prev) => [...prev.slice(-500), { type, text }]);
    setTimeout(() => terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: "smooth" }), 30);
  }, []);

  useEffect(() => {
    if (!id) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?botId=${id}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => appendLine("system", "● Terminal connected.\n");
    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        if (msg.botId === id) appendLine(msg.type, msg.data);
      } catch {}
    };
    ws.onclose = () => appendLine("system", "○ Terminal disconnected.\n");
    ws.onerror = () => appendLine("system", "✗ Connection error.\n");

    return () => ws.close();
  }, [id, appendLine]);

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast({ title: "Invalid file", description: "Please upload a .zip file", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/bots/${id}/upload`, { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Upload failed");
      }
      toast({ title: "Upload successful", description: "npm install is now running in the terminal..." });
      refetchBot();
      queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleAction = (action: "start" | "stop" | "restart" | "delete") => {
    const options = {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBotQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBotLogsQueryKey(id) });
        if (action === "delete") setLocation("/bots");
        else toast({ title: `Bot ${action} successful` });
      },
      onError: (err: any) => {
        toast({ title: `Failed to ${action} bot`, description: err.message, variant: "destructive" });
      },
    };
    switch (action) {
      case "start": startBot.mutate({ id }, options); break;
      case "stop": stopBot.mutate({ id }, options); break;
      case "restart": restartBot.mutate({ id }, options); break;
      case "delete":
        if (confirm("Delete this bot? This action cannot be undone.")) deleteBot.mutate({ id }, options);
        break;
    }
  };

  const handleSendInput = () => {
    if (!inputText.trim()) return;
    sendBotInput.mutate(
      { id, data: { text: inputText.trim() } },
      {
        onError: (err: any) => toast({ title: "Failed to send input", description: err.message, variant: "destructive" }),
      }
    );
    setInputText("");
  };

  const getInstallBadge = () => {
    if (!bot) return null;
    switch (bot.installStatus) {
      case "none":
        return <Badge variant="outline" className="text-muted-foreground border-muted font-mono text-xs">NO_FILES</Badge>;
      case "installing":
        return <Badge variant="outline" className="text-yellow-400 border-yellow-400/40 font-mono text-xs animate-pulse">INSTALLING</Badge>;
      case "ready":
        return <Badge variant="outline" className="text-green-400 border-green-400/40 font-mono text-xs">READY</Badge>;
      case "failed":
        return <Badge variant="outline" className="text-red-400 border-red-400/40 font-mono text-xs">INSTALL_FAILED</Badge>;
    }
  };

  const getLineColor = (type: string) => {
    switch (type) {
      case "stderr": return "text-red-400";
      case "system": return "text-blue-400/80";
      case "stdin": return "text-yellow-300";
      default: return "text-gray-200";
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
    return <div className="text-center p-12 text-destructive font-mono">BOT_NOT_FOUND — ID: {id}</div>;
  }

  const canStart = bot.installStatus === "ready" && bot.status !== "running" && bot.status !== "starting";
  const canStop = bot.status === "running" || bot.status === "starting";
  const canRestart = bot.status === "running" && bot.installStatus === "ready";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/bots")} className="rounded-none border-border" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary uppercase font-mono" data-testid="text-bot-name">{bot.name}</h1>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              <span className="font-mono text-xs text-muted-foreground">ID:{bot.id}</span>
              <BotStatusBadge status={bot.status} />
              {getInstallBadge()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="rounded-none border-border hover:bg-green-500/20 hover:text-green-500 hover:border-green-500/50 uppercase tracking-widest text-xs font-bold font-mono"
            onClick={() => handleAction("start")}
            disabled={!canStart || startBot.isPending}
            data-testid="button-start"
          >
            {startBot.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Start
          </Button>
          <Button
            variant="outline"
            className="rounded-none border-border hover:bg-yellow-500/20 hover:text-yellow-500 hover:border-yellow-500/50 uppercase tracking-widest text-xs font-bold font-mono"
            onClick={() => handleAction("restart")}
            disabled={!canRestart || restartBot.isPending}
            data-testid="button-restart"
          >
            {restartBot.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
            Restart
          </Button>
          <Button
            variant="outline"
            className="rounded-none border-border hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50 uppercase tracking-widest text-xs font-bold font-mono"
            onClick={() => handleAction("stop")}
            disabled={!canStop || stopBot.isPending}
            data-testid="button-stop"
          >
            {stopBot.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
            Stop
          </Button>
          <Button variant="outline" className="rounded-none border-border" onClick={() => setLocation(`/bots/${bot.id}/edit`)} data-testid="button-edit">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 col-span-1">
          <Card className="rounded-none border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-xs uppercase text-muted-foreground font-bold tracking-wider">
                <Activity className="mr-2 h-4 w-4 text-primary" /> Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground font-bold">Description</p>
                <p className="text-sm mt-1">{bot.description || <span className="text-muted-foreground/50 italic">None</span>}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-bold">Phone</p>
                <p className="text-sm font-mono mt-1">{bot.phoneNumber || <span className="text-muted-foreground/50 italic">—</span>}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-bold">Webhook</p>
                <p className="text-xs font-mono mt-1 truncate text-muted-foreground" title={bot.webhookUrl || ""}>{bot.webhookUrl || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-bold">Created</p>
                <p className="text-xs font-mono mt-1 text-muted-foreground">{format(new Date(bot.createdAt), "yyyy-MM-dd HH:mm")}</p>
              </div>
              <div className="pt-3 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full rounded-none border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs font-mono"
                  onClick={() => handleAction("delete")}
                  disabled={deleteBot.isPending}
                  data-testid="button-delete"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> DELETE_INSTANCE
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-xs uppercase text-muted-foreground font-bold tracking-wider">
                <Package className="mr-2 h-4 w-4 text-primary" /> Bot Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bot.installStatus === "none" || bot.installStatus === "failed" ? (
                <div
                  className="border-2 border-dashed border-border hover:border-primary/60 transition-colors cursor-pointer rounded-sm p-6 text-center space-y-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="upload-zone"
                >
                  {bot.installStatus === "failed" && (
                    <AlertTriangle className="h-5 w-5 text-red-400 mx-auto" />
                  )}
                  <FolderOpen className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs text-muted-foreground font-mono">
                    {bot.installStatus === "failed" ? "Re-upload to retry" : "Drop .zip file here"}
                  </p>
                  <p className="text-xs text-muted-foreground/50">or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                    data-testid="input-file-upload"
                  />
                </div>
              ) : bot.installStatus === "installing" ? (
                <div className="flex flex-col items-center p-6 space-y-3">
                  <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
                  <p className="text-xs font-mono text-yellow-400">Running npm install...</p>
                  <p className="text-xs text-muted-foreground/50">Watch the terminal</p>
                </div>
              ) : (
                <div className="flex flex-col items-center p-4 space-y-3">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                  <p className="text-xs font-mono text-green-400">Files ready</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-none text-xs font-mono border-muted text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-reupload"
                  >
                    <Upload className="mr-2 h-3 w-3" />
                    {isUploading ? "Uploading..." : "Re-upload zip"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                  />
                </div>
              )}

              {isUploading && (
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting zip...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1 lg:col-span-2 flex flex-col" style={{ minHeight: 520 }}>
          <Card className="rounded-none border-border bg-black flex flex-col flex-1">
            <CardHeader className="border-b border-border/30 py-2 px-4 bg-zinc-950 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-xs uppercase text-primary font-bold tracking-wider font-mono">
                  <TerminalIcon className="mr-2 h-3 w-3" /> Terminal — {bot.name}
                </CardTitle>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
              <div
                ref={terminalRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-5 bg-black"
                style={{ minHeight: 400, scrollbarWidth: "thin" }}
                data-testid="terminal-output"
              >
                {terminalLines.length === 0 && logs && logs.length > 0 && (
                  <div className="space-y-0.5 mb-2 opacity-60 border-b border-white/5 pb-3 mb-3">
                    <div className="text-blue-400/60 text-xs mb-1">── stored logs ──</div>
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-3">
                        <span className="text-gray-600 shrink-0 select-none">[{format(new Date(log.createdAt), "HH:mm:ss")}]</span>
                        <span className={log.level === "error" ? "text-red-400/70" : log.level === "warn" ? "text-yellow-400/70" : "text-gray-400/70"}>{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
                {terminalLines.map((line, i) => (
                  <pre key={i} className={`whitespace-pre-wrap break-all ${getLineColor(line.type)}`}>{line.text}</pre>
                ))}
                {terminalLines.length === 0 && (!logs || logs.length === 0) && (
                  <span className="text-gray-600 italic">Waiting for output...</span>
                )}
              </div>

              <div className="border-t border-border/30 bg-zinc-950 px-3 py-2 flex items-center gap-2 flex-shrink-0">
                <span className="text-primary font-mono text-xs select-none">❯</span>
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendInput()}
                  placeholder={bot.status === "running" ? "Enter phone number, OTP, or command..." : "Bot not running"}
                  disabled={bot.status !== "running"}
                  className="border-none bg-transparent font-mono text-xs focus-visible:ring-0 focus-visible:ring-offset-0 text-green-300 placeholder:text-gray-700 p-0 h-6"
                  data-testid="input-terminal"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSendInput}
                  disabled={bot.status !== "running" || !inputText.trim() || sendBotInput.isPending}
                  className="h-6 w-6 p-0 text-primary hover:text-primary/80"
                  data-testid="button-send-input"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
