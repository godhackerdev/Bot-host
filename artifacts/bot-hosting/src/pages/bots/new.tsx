import React from "react";
import { useLocation } from "wouter";
import { useCreateBot, getListBotsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
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
import { ArrowLeft, TerminalSquare } from "lucide-react";

const botSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  phoneNumber: z.string().optional(),
  webhookUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  token: z.string().optional(),
});

type BotFormValues = z.infer<typeof botSchema>;

export default function BotNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createBot = useCreateBot();

  const form = useForm<BotFormValues>({
    resolver: zodResolver(botSchema),
    defaultValues: {
      name: "",
      description: "",
      phoneNumber: "",
      webhookUrl: "",
      token: "",
    },
  });

  const onSubmit = (data: BotFormValues) => {
    createBot.mutate(
      { data },
      {
        onSuccess: (bot) => {
          queryClient.invalidateQueries({ queryKey: getListBotsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({ title: "Bot deployed successfully", description: `Instance ${bot.id} created.` });
          setLocation(`/bots/${bot.id}`);
        },
        onError: (err: any) => {
          toast({ title: "Failed to deploy bot", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/bots")} className="rounded-none border-border">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">DEPLOY_INSTANCE</h1>
          <p className="text-muted-foreground mt-1">Configure parameters for a new WhatsApp bot.</p>
        </div>
      </div>

      <Card className="rounded-none border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center text-lg uppercase">
            <TerminalSquare className="mr-2 h-5 w-5 text-primary" />
            Instance Configuration
          </CardTitle>
          <CardDescription>Required and optional parameters for your bot.</CardDescription>
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
                        <Input type="password" placeholder="WhatsApp API Token" className="rounded-none bg-background font-mono" {...field} />
                      </FormControl>
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
                <Button type="submit" disabled={createBot.isPending} className="rounded-none font-bold uppercase tracking-wider px-8">
                  {createBot.isPending ? "Deploying..." : "Deploy Bot"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
