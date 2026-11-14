import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Role = "CLIENT" | "ARTIST" | "ORGANIZATION" | "VENDOR" | "AFFILIATE" | "VERIFIER" | "CONSULTANT" | "ADMIN";
type GuideAction = { label: string; path: string };
type GuideMessage = { id: number; from: "assistant" | "user"; text: string; actions?: GuideAction[] };

const roleNames: Record<Role, string> = {
  CLIENT: "Customer", ARTIST: "Artist", ORGANIZATION: "Organizer", VENDOR: "Service provider",
  AFFILIATE: "Affiliate", VERIFIER: "Verifier", CONSULTANT: "Consultant", ADMIN: "Platform admin",
};

const topics: Array<{ label: string; words: string[]; text: string; actions: GuideAction[] }> = [
  {
    label: "Create a custom song",
    words: ["custom song", "sample", "studio", "yuletide", "storytelling", "song", "jingle", "voice-over"],
    text: "Start in the Music Project Studio on the home page. Choose a genre, mood, key and tempo, then play a locally generated sample sketch. You can describe the occasion, add a dedication and submit a production brief. The team reviews the brief and confirms the final quote before production.",
    actions: [{ label: "Open Music Project Studio", path: "/#music-studio" }],
  },
  {
    label: "Browse artists and services",
    words: ["artist", "marketplace", "browse", "find talent", "services", "producer", "mixing", "mastering"],
    text: "Explore the artist and service directory, review provider profiles and service details, then choose the option that matches your sound. Check the scope, delivery expectations and displayed price before booking.",
    actions: [{ label: "Explore artists", path: "/#artists" }],
  },
  {
    label: "My projects and deliveries",
    words: ["my project", "project status", "order status", "delivery", "download", "finished song", "production brief"],
    text: "Sign in and open your customer dashboard to review your project requests and their latest status. When a final master is marked ready, use the private download provided in your project workspace. A sample preview is not the final recording.",
    actions: [{ label: "Customer dashboard", path: "/dashboard/client" }],
  },
  {
    label: "Artist workspace",
    words: ["artist dashboard", "artist profile", "artist workspace", "my artist"],
    text: "Your artist workspace is where you manage your profile, services, booking activity and delivery work. Keep your profile, availability and service descriptions accurate so customers know what you offer.",
    actions: [{ label: "Artist dashboard", path: "/dashboard/artist" }],
  },
  {
    label: "Vendor workspace",
    words: ["vendor", "provider", "listing", "my services", "service provider"],
    text: "Use your provider dashboard to manage business details, service listings, customer enquiries and bookings. Keep prices and delivery expectations up to date. Only mark work complete after the agreed deliverables have been supplied.",
    actions: [{ label: "Provider dashboard", path: "/dashboard/vendor" }],
  },
  {
    label: "Payments and wallet",
    words: ["payment", "pay", "wallet", "deposit", "fund", "money", "transaction", "escrow", "refund"],
    text: "Open Payments & Wallet in your dashboard to review balances and transaction history. Booking payments may be held in escrow until the agreed completion process is satisfied. Production-project requests are not charged until a quote and its payment terms are confirmed.",
    actions: [{ label: "Open my wallet", path: "/dashboard/client?tab=wallet" }],
  },
  {
    label: "Messages and support",
    words: ["message", "chat", "inbox", "contact", "support", "talk to"],
    text: "Use the Messages area in your dashboard to communicate about a booking or project. Keep project details in the relevant conversation and never share passwords, one-time codes or full payment-card details.",
    actions: [{ label: "Open messages", path: "/dashboard/client?tab=messages" }],
  },
  {
    label: "Production queue",
    words: ["admin", "production queue", "assign project", "upload master", "manage projects"],
    text: "The admin workspace contains the production queue. Authorized administrators can review submitted briefs, assign work, update project status and upload final audio masters. Only upload the correct customer's final deliverable.",
    actions: [{ label: "Admin workspace", path: "/dashboard/admin" }],
  },
  {
    label: "Account and sign-in",
    words: ["login", "sign in", "password", "register", "account", "forgot password", "create account"],
    text: "Use Sign in for an existing account or Create account to register. If your password is not accepted, check your email address and use the password-reset option. Never share your password or reset link.",
    actions: [{ label: "Sign in", path: "/auth/signin" }, { label: "Create account", path: "/auth/signup" }],
  },
];

function currentRole(): Role | null {
  try {
    const user = JSON.parse(localStorage.getItem("ess_user") || "null");
    return user?.role && user.role in roleNames ? user.role as Role : null;
  } catch {
    return null;
  }
}

export default function DubluVeHelpAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [draft, setDraft] = useState("");
  const [role, setRole] = useState<Role | null>(currentRole);
  const [messages, setMessages] = useState<GuideMessage[]>([
    { id: 1, from: "assistant", text: "Welcome to Dublu Vé Guide. Tell me what you want to do, or choose a topic. I can point you to the right place in the app." },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);

  useEffect(() => { setRole(currentRole()); }, [location.pathname]);
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  const suggestions = useMemo(() => {
    if (role === "ARTIST") return ["Artist workspace", "My projects and deliveries", "Payments and wallet", "Messages and support"];
    if (role === "VENDOR") return ["Vendor workspace", "Browse artists and services", "Payments and wallet", "Messages and support"];
    if (role === "ADMIN") return ["Production queue", "My projects and deliveries", "Payments and wallet", "Account and sign-in"];
    if (role === "CLIENT") return ["Create a custom song", "Browse artists and services", "My projects and deliveries", "Payments and wallet"];
    return ["Create a custom song", "Browse artists and services", "Payments and wallet", "Account and sign-in"];
  }, [role]);

  function respond(input: string) {
    const normalized = input.toLowerCase().trim();
    const topic = topics.find((item) =>
      item.words.some((word) => normalized.includes(word)) || normalized === item.label.toLowerCase(),
    );
    const answer: Omit<GuideMessage, "id" | "from"> = topic
      ? { text: topic.text, actions: topic.actions }
      : {
          text: "I can help with custom songs, sample previews, artists and services, project tracking, wallet payments, messages and account access. Try one of the suggested topics or describe what you are trying to do.",
          actions: topics.slice(0, 4).map((item) => ({ label: item.label, path: item.actions[0]?.path || "/" })),
        };
    setMessages((current) => [
      ...current,
      { id: nextId.current++, from: "user", text: input },
      { id: nextId.current++, from: "assistant", ...answer },
    ]);
    setDraft("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft.trim()) respond(draft.trim());
  }

  function follow(path: string) {
    const dashboardPath = path.match(/^\/dashboard\/client(.*)$/);
    const destination = dashboardPath && role && role !== "CLIENT"
      ? `/dashboard/${role.toLowerCase()}${dashboardPath[1]}`
      : path;
    navigate(destination);
    setOpen(false);
    setMaximized(false);
  }

  return (
    <div className={`dv-guide-root ${open ? "is-open" : ""} ${maximized ? "is-maximized" : ""}`}>
      {!open ? (
        <button className="dv-guide-launcher" type="button" onClick={() => setOpen(true)} aria-label="Open Dublu Vé Guide" title="Need help? Chat with Dublu Vé Guide">
          <span aria-hidden="true">✦</span><span>Help</span>
        </button>
      ) : (
        <section className="dv-guide-panel" aria-label="Dublu Vé Guide chat">
          <header className="dv-guide-header">
            <div className="dv-guide-avatar" aria-hidden="true">DV</div>
            <div className="dv-guide-heading"><strong>Dublu Vé Guide</strong><small>{role ? roleNames[role] + " support" : "Your in-app assistant"}</small></div>
            <button type="button" onClick={() => setMaximized((value) => !value)} aria-label={maximized ? "Restore chat size" : "Maximize chat"} title={maximized ? "Restore" : "Maximize"}>{maximized ? "↙" : "↗"}</button>
            <button type="button" onClick={() => { setOpen(false); setMaximized(false); }} aria-label="Minimize chat" title="Minimize">—</button>
          </header>
          <div className="dv-guide-messages" aria-live="polite">
            {messages.map((message) => (
              <div className={`dv-guide-message dv-guide-${message.from}`} key={message.id}>
                <p>{message.text}</p>
                {message.actions?.length ? (
                  <div className="dv-guide-actions">
                    {message.actions.map((action) => (
                      <button type="button" key={action.label} onClick={() => follow(action.path)}>{action.label}<span aria-hidden="true"> →</span></button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="dv-guide-suggestions" aria-label="Suggested help topics">
            {suggestions.map((item) => <button type="button" key={item} onClick={() => respond(item)}>{item}</button>)}
          </div>
          <form className="dv-guide-form" onSubmit={submit}>
            <label className="dv-guide-sr-only" htmlFor="dv-guide-input">Ask Dublu Vé Guide</label>
            <input id="dv-guide-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask how to do something…" maxLength={500} />
            <button type="submit" disabled={!draft.trim()} aria-label="Send message">➤</button>
          </form>
          <p className="dv-guide-disclaimer">In-app guidance · Never share passwords or verification codes.</p>
        </section>
      )}
    </div>
  );
}
