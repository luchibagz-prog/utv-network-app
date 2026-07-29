export type UTVPlanId =
  | "free"
  | "creator_plus"
  | "pro"
  | "business";

export type UTVBoostId =
  | "local"
  | "reach"
  | "world"
  | "feature";

export const UTV_PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: 0,
    description: "Watch, post, connect and explore UTV.",
    features: [
      "Watch UTV",
      "Feed & Stories",
      "UTV World",
      "Messages & profiles",
      "Basic creator posting",
    ],
  },
  {
    id: "creator_plus" as const,
    name: "Creator+",
    price: 9.99,
    description: "For creators ready to grow.",
    features: [
      "Everything in Free",
      "Creator+ badge",
      "Advanced creator tools",
      "Enhanced analytics",
      "Priority creator features",
      "Boost-ready content",
    ],
  },
  {
    id: "pro" as const,
    name: "UTV Pro",
    price: 19.99,
    popular: true,
    description: "Built for serious creators and hosts.",
    features: [
      "Everything in Creator+",
      "Pro creator badge",
      "Advanced Live tools",
      "Business & booking tools",
      "Priority promotion tools",
      "Premium analytics",
    ],
  },
  {
    id: "business" as const,
    name: "UTV Business",
    price: 39.99,
    description: "Put your business inside UTV World.",
    features: [
      "Everything in Pro",
      "Business badge",
      "Business listing tools",
      "World promotion access",
      "Lead & booking tools",
      "Campaign-ready profile",
    ],
  },
];

export const UTV_BOOSTS = [
  {
    id: "local" as const,
    name: "Local Push",
    price: 5,
    description: "Give a post, event or creator signal an extra local push.",
  },
  {
    id: "reach" as const,
    name: "Bigger Reach",
    price: 10,
    description: "Push your signal harder across UTV discovery.",
  },
  {
    id: "world" as const,
    name: "Featured in World",
    price: 25,
    description: "Promote your signal as a featured UTV World opportunity.",
  },
  {
    id: "feature" as const,
    name: "UTV Feature",
    price: 50,
    description: "Premium campaign placement for launches, events and businesses.",
  },
];

export const FOUNDER_EMAIL =
  "luchibagz@gmail.com";

export function founderPlan(email?: string | null) {
  return String(email || "").toLowerCase() ===
    FOUNDER_EMAIL.toLowerCase();
}
