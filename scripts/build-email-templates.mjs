// Builds the Supabase auth email templates (and a preview of the trip invite email) from
// src/lib/email/templates.ts, so every email shares one design.
//   node --experimental-strip-types scripts/build-email-templates.mjs
// Then paste each emails/supabase/*.html into Supabase → Authentication → Emails → Templates.
import { mkdirSync, writeFileSync } from "node:fs";
import { supabaseTemplates, tripInviteEmail } from "../src/lib/email/templates.ts";

mkdirSync("emails/supabase", { recursive: true });
const subjects = [];
for (const [name, t] of Object.entries(supabaseTemplates())) {
  writeFileSync(`emails/supabase/${name}.html`, t.html);
  subjects.push(`${name}: ${t.subject}`);
}
writeFileSync("emails/supabase/SUBJECTS.txt", subjects.join("\n") + "\n");

const preview = tripInviteEmail({
  inviter: "Adam",
  tripName: "Vienna & Budapest",
  dates: "20 – 27 Dec 2026",
  places: ["Vienna", "Budapest"],
  url: "https://wheretonext.vercel.app/invite/example",
  siteUrl: process.argv[2] ?? "https://wheretonext.vercel.app",
});
writeFileSync("emails/trip-invite-preview.html", preview.html);
console.log("Wrote emails/supabase/*.html and emails/trip-invite-preview.html");
