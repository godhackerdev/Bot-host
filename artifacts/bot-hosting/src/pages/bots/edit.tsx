import React, { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetBot, useUpdateBot, getGetBotQueryKey, getListBotsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const botPatchSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  phoneNumber: z.string().optional(),
  webhookUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  token: z.string().optional(),
});

type BotPatchValues = z.infer<typeof botPatchSchema>;

export default function BotEdit() {
  const [, params] = useRoute("/bots/:id/edit");
  const id = parseInt(params?.id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bot, isLoading } = useGetBot(id, { query: { enabled: !!id, queryKey: getGetBotQueryKey(id) } });
  const updateBot = useUpdateBot();

  const form = useForm<BotPatchValues>({
    resolver: zodResolver(botPatchSchema),
    defaultValues: {
      name: "",
      description: "",
      phoneNumber: "",
      webhookUrl: "",
      token: "",
    },
  });

  useEffect(() => {
    if (bot) {
      form.reset({
        name: bot.name,
        description: bot.description || "",
        phoneNumber: bot.phoneNumber || "",
        webhookUrl: bot.webhookUrl || "",
        token: bot.token || "", // API might omit this for security, but populate if exists
      });
    }
  }, [bot, form]);

  const onSubmit = (data: BotPatchValues) => {
    updateBot.mutate(
      { id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBotQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() });
          toast({ title: "Configuration updated", description: `Instance ${id} modified successfully.` });
          setLocation(`/bots/${id}`);
        },
        onError: (err: any) => {
          toast({ title: "Failed to update configuration", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
         <Skeleton className="h-12 w-64 rounded-none" />
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(`/bots/${id}`)} className="rounded-none border-border">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">EDIT_INSTANCE</h1>
          <p className="text-muted-foreground mt-1">Modify parameters for {bot.name}.</p>
        </div>
      </div>

      <Card className="rounded-none border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center text-lg uppercase">
            <Settings className="mr-2 h-5 w-5 text-primary" />
            Configuration
          </CardTitle>
          <CardDescription>Update parameters for your bot.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BOT_NAME *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., prod-support-bot" className="rounded-none bg-background font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DESCRIPTION</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Purpose of this bot..." className="rounded-none bg-background font-mono resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PHONE_NUMBER</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" className="rounded-none bg-background font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AUTH_TOKEN</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Leave blank to keep current" className="rounded-none bg-background font-mono" {...field} />
                      </FormControl>
                      <FormDescription>Only enter if changing.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="webhookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WEBHOOK_URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.example.com/webhook" className="rounded-none bg-background font-mono" {...field} />
                    </FormControl>
                    <FormDescription>Where to send incoming messages.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4 border-t border-border">
                <Button type="submit" disabled={updateBot.isPending} className="rounded-none font-bold uppercase tracking-wider px-8">
                  {updateBot.isPending ? "Applying..." : "Apply Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
