import React from "react";
import { Badge } from "@/components/ui/badge";
import { BotStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export function BotStatusBadge({ status }: { status: BotStatus }) {
  const getStatusColor = (s: BotStatus) => {
    switch (s) {
      case "running":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "stopped":
        return "bg-muted text-muted-foreground border-border";
      case "error":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "starting":
      case "stopping":
        return "bg-primary/20 text-primary border-primary/30 animate-pulse";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Badge variant="outline" className={`font-mono uppercase ${getStatusColor(status)}`}>
      {status === "running" && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
      {status}
    </Badge>
  );
}
