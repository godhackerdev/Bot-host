import { Link } from "wouter";
import { Terminal, Bot, Zap, Shield, Clock } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-primary">BOT_HOST</span>
        </div>
        <Link href="/sign-in">
          <button className="px-4 py-1.5 text-sm font-medium border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded-sm">
            Sign In
          </button>
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-secondary text-primary px-3 py-1 rounded-sm text-xs font-mono mb-6 border border-border">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          WhatsApp Bot Hosting Platform
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
          Host your WhatsApp bots<br />
          <span className="text-primary">with one click</span>
        </h1>

        <p className="text-muted-foreground max-w-lg mb-10 text-sm leading-relaxed">
          Upload your Node.js bot, we handle the rest. Live terminal output,
          process management, and instant deployment — all in one platform.
        </p>

        <Link href="/sign-up">
          <button className="px-8 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-sm hover:opacity-90 transition-opacity">
            Get Started →
          </button>
        </Link>

        <p className="text-xs text-muted-foreground mt-4">
          Sign in with Google • Manual approval required
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 max-w-3xl w-full text-left">
          {[
            {
              icon: Bot,
              title: "Bot Management",
              desc: "Upload zip files, run npm install, start/stop/restart bots — all from the dashboard.",
            },
            {
              icon: Zap,
              title: "Live Terminal",
              desc: "Stream real-time output via WebSocket. See exactly what your bot is doing.",
            },
            {
              icon: Clock,
              title: "Subscription Plans",
              desc: "Choose from 7-day, 30-day, or 3-month plans. Pay via WhatsApp to +923142033347.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-card border border-border p-5 rounded-sm">
              <f.icon className="h-5 w-5 text-primary mb-3" />
              <h3 className="font-bold text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>BOT_HOST © 2025</span>
        <div className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          <span>Secure • Reliable</span>
        </div>
      </footer>
    </div>
  );
}
