import { RefreshCw, MessageCircle, Terminal } from "lucide-react";
import { useClerk } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const WHATSAPP_NUMBER = "+923142033347";
const WHATSAPP_MESSAGE = encodeURIComponent("Hi, my BOT_HOST subscription has expired. I'd like to renew it.");

export default function SubscriptionExpired() {
  const { signOut } = useClerk();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-secondary rounded-sm border border-border">
            <RefreshCw className="h-10 w-10 text-primary" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">Subscription Expired</h1>

        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Your subscription has expired. Renew via WhatsApp to continue hosting your bots.
        </p>

        {/* Plans */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "7 Days", tag: "Basic" },
            { label: "30 Days", tag: "Standard" },
            { label: "3 Months", tag: "Premium" },
          ].map((plan) => (
            <div key={plan.label} className="bg-card border border-border rounded-sm p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{plan.tag}</div>
              <div className="text-sm font-bold text-primary">{plan.label}</div>
            </div>
          ))}
        </div>

        <a
          href={`https://wa.me/${WHATSAPP_NUMBER.replace("+", "")}?text=${WHATSAPP_MESSAGE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white font-bold text-sm rounded-sm hover:opacity-90 transition-opacity mb-4"
        >
          <MessageCircle className="h-4 w-4" />
          Renew on WhatsApp
        </a>

        <p className="text-xs text-muted-foreground mb-6">{WHATSAPP_NUMBER}</p>

        <button
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
        >
          <Terminal className="h-3 w-3" />
          Sign out
        </button>
      </div>
    </div>
  );
}
