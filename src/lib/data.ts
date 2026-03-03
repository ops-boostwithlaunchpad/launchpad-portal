import { Deal, Agency, Agent, Client, Task } from "./types";

export const deals: Deal[] = [
  { id: 1, client: "Dream Team Law", industry: "Personal Injury Law", agent: "Direct", services: ["Local SEO"], mrr: 750, stage: "Won", close: "2025-01-15" },
  { id: 2, client: "GMTTI", industry: "Healthcare / Medical", agent: "Direct", services: ["Local SEO", "AI SEO"], mrr: 1200, stage: "Won", close: "2025-02-01" },
  { id: 3, client: "Apex Roofing", industry: "Construction", agent: "SunState Agency", services: ["Local SEO", "Google Ads"], mrr: 850, stage: "Won", close: "2025-02-10" },
  { id: 4, client: "Palm Beach Medical Group", industry: "Healthcare / Medical", agent: "Direct", services: ["Automation", "Local SEO"], mrr: 20000, stage: "Negotiation", close: "2025-03-15" },
  { id: 5, client: "Fix-It Pros", industry: "Home Services", agent: "SunState Agency", services: ["Local SEO"], mrr: 500, stage: "Proposal", close: "2025-03-20" },
  { id: 6, client: "Coastal Builders LLC", industry: "Construction", agent: "FloriPro Agency", services: ["Google Ads", "Meta Ads"], mrr: 700, stage: "Prospect", close: "2025-04-01" },
  { id: 7, client: "Hernandez & Associates", industry: "Criminal Defense Law", agent: "NovaSales", services: ["Local SEO", "LSA"], mrr: 1800, stage: "Won", close: "2025-01-28" },
  { id: 8, client: "Boca Dental Studio", industry: "Dental", agent: "Direct", services: ["Local SEO", "Google Ads"], mrr: 1100, stage: "Won", close: "2025-02-14" },
  { id: 9, client: "SunCoast Plumbing", industry: "Home Services", agent: "SunState Agency", services: ["Local SEO", "Meta Ads"], mrr: 650, stage: "Won", close: "2025-02-20" },
  { id: 10, client: "Venture Realty Group", industry: "Real Estate", agent: "FloriPro Agency", services: ["AI SEO", "Google Ads"], mrr: 2200, stage: "Proposal", close: "2025-03-28" },
  { id: 11, client: "Atlantic Insurance Partners", industry: "Insurance", agent: "Direct", services: ["LSA", "Google Ads"], mrr: 3000, stage: "Negotiation", close: "2025-04-05" },
  { id: 12, client: "Moreno Family Law", industry: "Family Law", agent: "NovaSales", services: ["Local SEO"], mrr: 900, stage: "Won", close: "2025-01-10" },
  { id: 13, client: "Elite Concrete & Masonry", industry: "Construction", agent: "SunState Agency", services: ["Local SEO", "Meta Ads"], mrr: 600, stage: "Proposal", close: "2025-04-10" },
  { id: 14, client: "Bright Smiles Pediatric Dentistry", industry: "Dental", agent: "Direct", services: ["Local SEO", "AI SEO", "Google Ads"], mrr: 1600, stage: "Won", close: "2025-02-25" },
  { id: 15, client: "GreenThumb Lawn Care", industry: "Home Services", agent: "FloriPro Agency", services: ["Local SEO"], mrr: 400, stage: "Prospect", close: "2025-04-20" },
];

export const agencies: Agency[] = [
  { id: 1, name: "Marcus Rivera", agency: "SunState Agency", agents: 6, clients: 11, mrr: 5400, commission: 15, status: "Active" },
  { id: 2, name: "Laura Chen", agency: "FloriPro Agency", agents: 4, clients: 7, mrr: 3800, commission: 12, status: "Active" },
  { id: 3, name: "Derek Johnson", agency: "NovaSales", agents: 3, clients: 4, mrr: 2700, commission: 10, status: "Active" },
  { id: 4, name: "Priya Patel", agency: "Elevate Partners", agents: 2, clients: 3, mrr: 1900, commission: 12, status: "Onboarding" },
  { id: 5, name: "Tony Marchetti", agency: "South FL Growth Co.", agents: 5, clients: 9, mrr: 4100, commission: 14, status: "Active" },
];

export const agents: Agent[] = [
  { id: 1, name: "Carlos Mendez", agency: "SunState Agency", closed: 9, mrr: 4200, commission: 10, month: 1100, status: "Active" },
  { id: 2, name: "Jessica Torres", agency: "SunState Agency", closed: 6, mrr: 2800, commission: 10, month: 700, status: "Active" },
  { id: 3, name: "Amy Kim", agency: "FloriPro Agency", closed: 5, mrr: 2400, commission: 12, month: 850, status: "Active" },
  { id: 4, name: "Samuel Rodriguez", agency: "NovaSales", closed: 3, mrr: 1500, commission: 8, month: 400, status: "Active" },
  { id: 5, name: "Brittany Walsh", agency: "South FL Growth Co.", closed: 7, mrr: 3100, commission: 11, month: 900, status: "Active" },
  { id: 6, name: "Marco Delgado", agency: "South FL Growth Co.", closed: 4, mrr: 1900, commission: 11, month: 550, status: "Active" },
  { id: 7, name: "Nina Johansson", agency: "Elevate Partners", closed: 2, mrr: 900, commission: 10, month: 300, status: "Active" },
  { id: 8, name: "Ryan O'Brien", agency: "FloriPro Agency", closed: 1, mrr: 400, commission: 10, month: 0, status: "Onboarding" },
];

export const clients: Client[] = [
  { id: 1, name: "Dream Team Law", industry: "Personal Injury Law", contact: "Ana Rivera", email: "ana@dreamteamlaw.com", services: ["Local SEO"], mrr: 750, start: "2025-01-15", rep: "Launchpad", website: "dreamteamlaw.com", status: "Active" },
  { id: 2, name: "GMTTI", industry: "Healthcare / Medical", contact: "Dr. Carlos Martinez", email: "info@gmtti.com", services: ["Local SEO", "AI SEO"], mrr: 1200, start: "2025-02-01", rep: "Launchpad", website: "gmtti.com", status: "Active" },
  { id: 3, name: "Apex Roofing", industry: "Construction", contact: "James Cole", email: "james@apexroofing.com", services: ["Local SEO", "Google Ads"], mrr: 850, start: "2025-02-10", rep: "Launchpad", website: "apexroofing.com", status: "Active" },
  { id: 4, name: "Hernandez & Associates", industry: "Criminal Defense Law", contact: "Roberto Hernandez", email: "rob@hernandezlaw.com", services: ["Local SEO", "LSA"], mrr: 1800, start: "2025-01-28", rep: "Launchpad", website: "hernandezlaw.com", status: "Active" },
  { id: 5, name: "Boca Dental Studio", industry: "Dental", contact: "Dr. Sarah Lin", email: "sarah@bocadental.com", services: ["Local SEO", "Google Ads"], mrr: 1100, start: "2025-02-14", rep: "Launchpad", website: "bocadentalstudio.com", status: "Active" },
  { id: 6, name: "SunCoast Plumbing", industry: "Home Services", contact: "Mike Dunn", email: "mike@suncoastplumbing.com", services: ["Local SEO", "Meta Ads"], mrr: 650, start: "2025-02-20", rep: "Launchpad", website: "suncoastplumbing.com", status: "Active" },
  { id: 7, name: "Moreno Family Law", industry: "Family Law", contact: "Diana Moreno", email: "diana@morenofamilylaw.com", services: ["Local SEO"], mrr: 900, start: "2025-01-10", rep: "Launchpad", website: "morenofamilylaw.com", status: "Active" },
  { id: 8, name: "Bright Smiles Pediatric Dentistry", industry: "Dental", contact: "Dr. Kevin Park", email: "kpark@brightsmiles.com", services: ["Local SEO", "AI SEO", "Google Ads"], mrr: 1600, start: "2025-02-25", rep: "Launchpad", website: "brightsmilesdentistry.com", status: "Active" },
];

export const tasks: Task[] = [
  { id: 1, client: "Dream Team Law", service: "Local SEO", team: "SEO & GBP Team", priority: "High", due: "2025-02-05", notes: "Focus on Hialeah service area. Optimize GBP listing. Respond to all pending reviews. Add January photos to profile. Target keywords: personal injury lawyer Hialeah, car accident attorney Miami.", status: "In Progress", logs: ["Jan 28 — GBP photos updated, 3 new posts published. Starting review response campaign."] },
  { id: 2, client: "GMTTI", service: "AI SEO", team: "AI SEO Team", priority: "Normal", due: "2025-02-10", notes: "Submit business info to ChatGPT plugin directories. Optimize entity data for Perplexity knowledge graph. Monitor Gemini mentions. Build authoritative content for medical training queries.", status: "Queued", logs: [] },
  { id: 3, client: "Apex Roofing", service: "Google Ads", team: "Paid Ads Team", priority: "Normal", due: "2025-02-12", notes: "Launch storm damage campaign targeting Broward and Palm Beach counties. Budget $850/mo. Ad copy focus: emergency roof repair, storm damage assessment.", status: "Review", logs: ["Feb 1 — Campaign structure drafted. Awaiting client approval on ad copy before going live."] },
  { id: 4, client: "Dream Team Law", service: "Local SEO", team: "SEO & GBP Team", priority: "Urgent", due: "2025-01-31", notes: "Keyword research expansion for Broward county. Identify gaps vs. top 3 competitors. Deliver full report with 90-day action plan.", status: "Done", logs: ["Jan 30 — Full keyword report delivered. 47 new targets identified. Broward county gap analysis complete. Shared via Google Drive."] },
  { id: 5, client: "GMTTI", service: "Local SEO", team: "SEO & GBP Team", priority: "Normal", due: "2025-02-15", notes: "Respond to 12 pending Google reviews with branded, professional responses. Follow up on 4 negative reviews with resolution-focused messaging.", status: "Queued", logs: [] },
  { id: 6, client: "Hernandez & Associates", service: "LSA", team: "Paid Ads Team", priority: "High", due: "2025-02-08", notes: "Set up Google Local Service Ads account. Complete background check verification. Configure service categories: criminal defense, DUI attorney. Budget $600/mo.", status: "In Progress", logs: ["Feb 2 — Account created, background check submitted. Service area configured for Dade and Broward counties."] },
  { id: 7, client: "Boca Dental Studio", service: "Google Ads", team: "Paid Ads Team", priority: "Normal", due: "2025-02-18", notes: "Optimize existing campaigns. Pause low-performing ad groups. Expand negative keyword list. Test new ad extensions for appointment booking.", status: "In Progress", logs: ["Jan 31 — Audit complete. Identified 3 underperforming ad groups. Pausing and reallocating budget to top performers."] },
  { id: 8, client: "SunCoast Plumbing", service: "Meta Ads", team: "Paid Ads Team", priority: "Normal", due: "2025-02-20", notes: "Create Facebook lead gen campaign targeting homeowners 30-65 in Palm Beach Gardens, Jupiter, and Tequesta. Offer: free drain inspection. Budget $400/mo.", status: "Queued", logs: [] },
  { id: 9, client: "Moreno Family Law", service: "Local SEO", team: "SEO & GBP Team", priority: "Normal", due: "2025-02-22", notes: "Build 20 new citations on top legal directories: Avvo, Justia, FindLaw, Lawyers.com. Ensure NAP consistency across all platforms.", status: "Queued", logs: [] },
  { id: 10, client: "Bright Smiles Pediatric Dentistry", service: "AI SEO", team: "AI SEO Team", priority: "Normal", due: "2025-02-28", notes: "Create authoritative FAQ content optimized for voice search and AI engine queries. Target: pediatric dentist Boca Raton, children dentist near me, sedation dentistry for kids.", status: "Queued", logs: [] },
  { id: 11, client: "Apex Roofing", service: "Local SEO", team: "SEO & GBP Team", priority: "Normal", due: "2025-02-25", notes: "On-page SEO update for 5 service pages. Add schema markup for roofing contractor. Update meta descriptions for click-through rate optimization.", status: "Done", logs: ["Jan 25 — All 5 pages updated. Schema markup implemented. Meta descriptions A/B tested.", "Jan 27 — Rankings improved: roofing contractor Fort Lauderdale moved from #8 to #4."] },
  { id: 12, client: "Hernandez & Associates", service: "Local SEO", team: "SEO & GBP Team", priority: "High", due: "2025-02-10", notes: "Create dedicated landing pages for: DUI attorney Miami, criminal defense lawyer Miami, drug charges attorney. Each page needs 800+ words, local schema, internal links.", status: "Review", logs: ["Feb 3 — All 3 landing pages drafted and submitted for review. Awaiting client content sign-off."] },
];
