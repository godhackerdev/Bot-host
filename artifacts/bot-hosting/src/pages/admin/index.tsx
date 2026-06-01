import { useState } from "react";
import { Shield, CheckCircle, XCircle, Clock, RefreshCw, Users } from "lucide-react";
import { useListUsers, useUpdateUserApproval } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getListUsersQueryKey } from "@workspace/api-client-react";

type ApprovalStatus = "pending" | "approved" | "rejected";

const DURATION_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "3 months (90 days)", value: 90 },
];

function statusBadge(status: string, approvedUntil?: string | null) {
  if (status === "approved") {
    const expired = approvedUntil && new Date(approvedUntil) < new Date();
    if (expired) {
      return <Badge variant="outline" className="text-orange-400 border-orange-400 text-[10px]">Expired</Badge>;
    }
    return <Badge variant="outline" className="text-green-400 border-green-400 text-[10px]">Approved</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="outline" className="text-red-400 border-red-400 text-[10px]">Rejected</Badge>;
  }
  return <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-[10px]">Pending</Badge>;
}

export default function AdminPanel() {
  const { data: users, isLoading } = useListUsers();
  const { mutate: updateApproval } = useUpdateUserApproval();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedDuration, setSelectedDuration] = useState<Record<number, number>>({});

  function handleAction(userId: number, action: ApprovalStatus) {
    const durationDays = action === "approved" ? (selectedDuration[userId] ?? 30) : null;

    updateApproval(
      { id: userId, data: { approvalStatus: action, durationDays } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({
            title: action === "approved" ? "User approved" : action === "rejected" ? "User rejected" : "User set to pending",
            description: action === "approved" && durationDays
              ? `Access granted for ${durationDays} days`
              : undefined,
          });
        },
        onError: () => {
          toast({ title: "Failed to update user", variant: "destructive" });
        },
      }
    );
  }

  const pendingUsers = users?.filter((u) => u.approvalStatus === "pending" && u.role !== "admin") ?? [];
  const otherUsers = users?.filter((u) => u.approvalStatus !== "pending" || u.role === "admin") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage user subscriptions</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm animate-pulse">Loading users...</div>
      ) : (
        <>
          {/* Pending users */}
          {pendingUsers.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                Pending Approval ({pendingUsers.length})
              </h2>
              <div className="space-y-2">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-card border border-yellow-400/30 rounded-sm p-4 flex flex-col md:flex-row md:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{user.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={String(selectedDuration[user.id] ?? 30)}
                        onValueChange={(v) =>
                          setSelectedDuration((prev) => ({ ...prev, [user.id]: Number(v) }))
                        }
                      >
                        <SelectTrigger className="w-40 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => handleAction(user.id, "approved")}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-400/30 hover:bg-green-500/20 rounded-sm text-xs transition-colors"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(user.id, "rejected")}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-400/30 hover:bg-red-500/20 rounded-sm text-xs transition-colors"
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All users */}
          <div>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              All Users ({users?.length ?? 0})
            </h2>
            <div className="bg-card border border-border rounded-sm overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">User</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Expires</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Role</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{user.name ?? "—"}</div>
                        <div className="text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(user.approvalStatus, user.approvedUntil)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.approvedUntil
                          ? new Date(user.approvedUntil).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {user.role === "admin" ? (
                          <Badge variant="outline" className="text-primary border-primary text-[10px]">Admin</Badge>
                        ) : (
                          <span className="text-muted-foreground">User</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.role !== "admin" && (
                          <div className="flex items-center gap-1">
                            <Select
                              value={String(selectedDuration[user.id] ?? 30)}
                              onValueChange={(v) =>
                                setSelectedDuration((prev) => ({ ...prev, [user.id]: Number(v) }))
                              }
                            >
                              <SelectTrigger className="w-28 h-6 text-[10px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DURATION_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={String(opt.value)} className="text-[10px]">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button
                              onClick={() => handleAction(user.id, "approved")}
                              title="Approve"
                              className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleAction(user.id, "rejected")}
                              title="Reject"
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleAction(user.id, "pending")}
                              title="Reset to pending"
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
