import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Layout } from "@/components/layout";
import { useGetMe } from "@workspace/api-client-react";

import Dashboard from "@/pages/dashboard";
import BotsList from "@/pages/bots/list";
import BotDetail from "@/pages/bots/detail";
import BotNew from "@/pages/bots/new";
import BotEdit from "@/pages/bots/edit";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import PendingApproval from "@/pages/pending-approval";
import SubscriptionExpired from "@/pages/subscription-expired";
import AdminPanel from "@/pages/admin";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(32, 100%, 50%)",
    colorForeground: "hsl(32, 100%, 75%)",
    colorMutedForeground: "hsl(32, 50%, 60%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(228, 10%, 8%)",
    colorInput: "hsl(32, 50%, 20%)",
    colorInputForeground: "hsl(32, 100%, 75%)",
    colorNeutral: "hsl(32, 50%, 20%)",
    fontFamily: "'JetBrains Mono', monospace",
    borderRadius: "0.125rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[hsl(228,10%,8%)] rounded-sm w-[440px] max-w-full overflow-hidden border border-[hsl(32,50%,20%)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(32,100%,75%)] font-bold",
    headerSubtitle: "text-[hsl(32,50%,60%)]",
    socialButtonsBlockButtonText: "text-[hsl(32,100%,75%)]",
    formFieldLabel: "text-[hsl(32,100%,75%)]",
    footerActionLink: "text-[hsl(32,100%,50%)] hover:text-[hsl(32,100%,65%)]",
    footerActionText: "text-[hsl(32,50%,60%)]",
    dividerText: "text-[hsl(32,50%,60%)]",
    identityPreviewEditButton: "text-[hsl(32,100%,50%)]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-[hsl(32,100%,75%)]",
    logoBox: "flex justify-center",
    logoImage: "h-8 w-auto",
    socialButtonsBlockButton: "border-[hsl(32,50%,20%)] bg-[hsl(228,10%,10%)] hover:bg-[hsl(228,10%,14%)]",
    formButtonPrimary: "bg-[hsl(32,100%,50%)] text-[hsl(228,10%,6%)] hover:bg-[hsl(32,100%,42%)] font-bold",
    formFieldInput: "bg-[hsl(228,10%,6%)] border-[hsl(32,50%,20%)] text-[hsl(32,100%,75%)]",
    footerAction: "bg-transparent",
    dividerLine: "bg-[hsl(32,50%,20%)]",
    alert: "bg-[hsl(228,10%,10%)] border-[hsl(32,50%,20%)]",
    otpCodeFieldInput: "bg-[hsl(228,10%,6%)] border-[hsl(32,50%,20%)] text-[hsl(32,100%,75%)]",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function AuthGatedApp() {
  const { data: me, isLoading, error } = useGetMe();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-primary font-mono text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error || !me) {
    return <PendingApproval />;
  }

  if (me.approvalStatus === "pending") {
    return <PendingApproval />;
  }

  if (me.approvalStatus === "rejected") {
    return <PendingApproval rejected />;
  }

  if (
    me.approvalStatus === "approved" &&
    me.approvedUntil &&
    new Date(me.approvedUntil) < new Date() &&
    me.role !== "admin"
  ) {
    return <SubscriptionExpired />;
  }

  return (
    <Layout me={me}>
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/bots" component={BotsList} />
        <Route path="/bots/new" component={BotNew} />
        <Route path="/bots/:id" component={BotDetail} />
        <Route path="/bots/:id/edit" component={BotEdit} />
        {me.role === "admin" && <Route path="/admin" component={AdminPanel} />}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <AuthGatedApp />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

const queryClient = new QueryClient();

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in with Google to access your bots",
          },
        },
        signUp: {
          start: {
            title: "Create account",
            subtitle: "Sign up with Google to get started",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/dashboard" component={() => (
              <Show when="signed-in" fallback={<Redirect to="/" />}>
                <AuthGatedApp />
              </Show>
            )} />
            <Route path="/bots/*?" component={() => (
              <Show when="signed-in" fallback={<Redirect to="/" />}>
                <AuthGatedApp />
              </Show>
            )} />
            <Route path="/admin" component={() => (
              <Show when="signed-in" fallback={<Redirect to="/" />}>
                <AuthGatedApp />
              </Show>
            )} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
