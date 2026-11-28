/** Shapes shared by the trip assistant's API route and its chat UI. */

/** A place shown as a card in the chat. Name, area, price etc. come from our data, never the model's text. */
export interface AssistantCard {
  /** Curated place id, or "g:<Google place id>" for a general suggestion. */
  id: string;
  source: "curated" | "general";
  name: string;
  tagline: string;
  area: string;
  /** 1–4 when known. */
  price: number | null;
  /** The model's 1–2 sentence summary, written from our write-up. */
  summary: string;
  lat: number | null;
  lng: number | null;
  /** Activity category used when it's added to the trip. */
  category: string;
  /** Curated only: the City Guide it belongs to. */
  guide?: string;
  /** Google search text for its photo (general suggestions). */
  mapsQuery?: string;
  rating?: number | null;
}

export interface ChatContent {
  text: string;
  /** Clarifying question: tappable answers. */
  options?: string[];
  cards?: AssistantCard[];
}

export interface ChatMessage {
  id: number | string;
  role: "user" | "assistant";
  content: ChatContent;
  created_at: string;
  /** Who sent it (user messages on shared trips). */
  user_id?: string | null;
}

export interface AssistantReply {
  messages: ChatMessage[];
  /** Messages left today for this user (null = no limit, e.g. admins). */
  remaining: number | null;
  limit: number;
}
