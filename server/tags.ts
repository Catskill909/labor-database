/**
 * Tag System for Labor Arts & Culture Database
 *
 * Canonical taxonomy informed by Library of Congress labor subject headings,
 * Tamiment/Wagner Labor Archives, and the Labor Film Database.
 * Designed for labor historians and broadcasters.
 */

// ─── Canonical Tag Taxonomy ──────────────────────────────────────────────────

export const TAG_GROUPS = {
  'Theme': [
    'Strikes & Lockouts',
    'Organizing',
    'Collective Bargaining',
    'Labor Law & Legislation',
    'Wages & Benefits',
    'Working Conditions',
    'Worker Safety & Health',
    'Child Labor',
    'Unemployment',
    'Automation & Technology',
    'Globalization & Outsourcing',
    'Labor Culture & Arts',
    'International Solidarity',
  ],
  'Industry': [
    'Mining',
    'Steel & Manufacturing',
    'Textiles & Garment',
    'Agriculture & Farm Work',
    'Auto & Transportation',
    'Construction',
    'Public Sector',
    'Education & Teachers',
    'Healthcare',
    'Entertainment & Media',
    'Service & Retail',
    'Maritime & Dockworkers',
    'Domestic Workers',
  ],
  'Social Dimension': [
    'Civil Rights & Race',
    'Women & Gender',
    'Immigration',
    'War & Military',
    'Socialism & Left Politics',
    'Environment',
    'Working Class',
    'Politics & Elections',
  ],
} as const;

// Flat list of all canonical tags
export const CANONICAL_TAGS: string[] = Object.values(TAG_GROUPS).flat();

// ─── Normalization Map ───────────────────────────────────────────────────────
// Maps old WordPress/Labor Film Database tags → canonical tag (or null to drop)

export const TAG_NORMALIZATION: Record<string, string | null> = {
  // === THEME MAPPINGS ===
  'Strikes-Strikebreaking-Lockouts': 'Strikes & Lockouts',
  'Strikebreaking': 'Strikes & Lockouts',
  'strike': 'Strikes & Lockouts',
  'Organizing': 'Organizing',
  'organize': 'Organizing',
  'Collective Bargaining': 'Collective Bargaining',
  'Legal System': 'Labor Law & Legislation',
  'Wages': 'Wages & Benefits',
  'Unemployment-Wages': 'Wages & Benefits',
  'Safety & Health': 'Worker Safety & Health',
  'Health care': 'Worker Safety & Health',
  'health': 'Worker Safety & Health',
  'Children': 'Child Labor',
  'working conditions': 'Working Conditions',
  'Automation': 'Automation & Technology',
  'Technology': 'Automation & Technology',
  'Global Economy': 'Globalization & Outsourcing',
  'Outsourcing': 'Globalization & Outsourcing',
  'Arts/Culture': 'Labor Culture & Arts',
  'Labor History': null, // too generic — everything is labor history
  'Philosophy': null, // too vague
  'Consumerism': null, // too vague
  'Whistleblowers': null, // too niche for canonical set
  'Zero hours work': 'Working Conditions',

  // === INDUSTRY MAPPINGS ===
  'Mining': 'Mining',
  'Industrial/Mine/Manufacturing': 'Steel & Manufacturing',
  'Manufacturing': 'Steel & Manufacturing',
  'Steel Industry': 'Steel & Manufacturing',
  'Textile Industry': 'Textiles & Garment',
  'Textile': 'Textiles & Garment',
  'Farm & Food': 'Agriculture & Farm Work',
  'Food Service Industry': 'Service & Retail',
  'Transportation': 'Auto & Transportation',
  'Trucking': 'Auto & Transportation',
  'Railroads': 'Auto & Transportation',
  'Construction Trades': 'Construction',
  'Public Sector': 'Public Sector',
  'Government': 'Public Sector',
  'Education': 'Education & Teachers',
  'Healthcare': 'Healthcare',
  'Entertainment Industry': 'Entertainment & Media',
  'Communications': 'Entertainment & Media',
  'Journalism': 'Entertainment & Media',
  'Service Workers': 'Service & Retail',
  'Retail': 'Service & Retail',
  'Boating and Shipping': 'Maritime & Dockworkers',
  'White Collar': null, // too vague — not a clear industry
  'Self-Employed/Freelance': null, // too vague
  'Temp/Precarious work': 'Working Conditions',
  'Power Generation Industries': 'Steel & Manufacturing',
  'Police/Fire': 'Public Sector',
  'Finance': null, // too vague
  'Housing': null, // too niche

  // === SOCIAL DIMENSION MAPPINGS ===
  'Blacks': 'Civil Rights & Race',
  'black-history': 'Civil Rights & Race',
  'race tension': 'Civil Rights & Race',
  'Discrimination: Racism': 'Civil Rights & Race',
  'Sexism': 'Women & Gender',
  'etc': null, // artifact from "Discrimination: Racism, Sexism, etc"
  'Women': 'Women & Gender',
  'women': 'Women & Gender',
  'womens rights': 'Women & Gender',
  'rosie': 'Women & Gender',
  'riveter': 'Women & Gender',
  'Immigrants/Immigration': 'Immigration',
  'immigration': 'Immigration',
  'Migrant workers': 'Immigration',
  'migrant worker': 'Immigration',
  'War': 'War & Military',
  'World War II': 'War & Military',
  'Communism/Socialism': 'Socialism & Left Politics',
  'Environment': 'Environment',
  'Working Class': 'Working Class',
  'blue collar': 'Working Class',
  'Class': 'Working Class',
  'Politics': 'Politics & Elections',
  'Voting/Elections': 'Politics & Elections',
  'Sports': null, // too niche
  'Slavery': 'Civil Rights & Race',
  'Sex Industry/Sexuality': null, // too niche
  'Sex/Sexuality': null, // too niche
  'sex workers': null,
  'Cities-Urban': null, // too vague — most labor history is urban
  'Biography': null, // format, not topic

  // === DROP: Meta/platform/festival tags ===
  '2026 Shortlist': null,
  'A: Highly Recommended Labor Films': null,
  'A: Labor Film Festivals': null,
  'A: Labor Film Festivals (Inactive)': null,
  'AA: Global Labor Film Festival 2016': null,
  'AB: Global Labor Film Festival 2015': null,
  'AC: Global Labor Film Festival 2014': null,
  'AD: Global Labor Film Festival 2013': null,
  'Netflix Watch Instantly': null,
  'Streaming Online (Youtube': null,
  'Vimeo)': null,
  'Available Online': null,
  'DCLFF LIBRARY': null,
  'Distributors': null,
  'Resources': null,
  'Video': null,
  'Film': null,
  'Music': null,

  // === DROP: Genre tags (belong in metadata, not tags) ===
  'Genre': null,
  'Themes': null,
  'Occupation/Type of Work': null,
  'Short': null,
  'Classic': null,
  'SciFi': null,
  'Kids': null,
  'Crime-Action': null,

  // === DROP: Geographic (too specific, not universal) ===
  'Afghanistan': null,
  'Africa': null,
  'Bangladesh': null,
  'Canada': null,
  'Middle East': null,
  'Montreal': null,
  'NYC': null,
  'Pakistan': null,
  'Turkey': null,
  'USA': null,
  'china': null,
  'iraq': null,
  'mexico': null,
  'spain': null,
  'wisconsin': null,
  'united-states': null,

  // === DROP: Miscellaneous WordPress noise ===
  'Anti-Union': null, // context-dependent, not a tag
  'Big Business/Corporations': 'Globalization & Outsourcing',
  'Disability Employment': null,
  'HIV': null,
  'TWU': null,
  'Noël Burch Film website': null,
  'Allan Sekula': null,
  'american dream': 'Working Class',
  'apple': null,
  'art': 'Labor Culture & Arts',
  'baseball': null,
  'books': null,
  'car wash': null,
  'labor': null, // everything is labor
  'light': null,
  'mark-wahlberg': null,
  'movies': null,
  'netflix': null,
  'news': null,
  'night shift': null,
  'occupy': null,
  'poverty': 'Wages & Benefits',
  'reform': null,
  'revolution': null,
  'school bus': 'Education & Teachers',
  'solidarity': 'International Solidarity',
  'soup kitchen': null,
  'streetvendor': null,
  'the-union': null,
  'union': null, // too generic
  'unions': null,
  'unite': null,
  'workers': null, // too generic
  "worker's rights": null, // too generic
  'history': null,
};

// Tags that are already canonical — pass through unchanged
for (const tag of CANONICAL_TAGS) {
  if (!(tag in TAG_NORMALIZATION)) {
    TAG_NORMALIZATION[tag] = tag;
  }
}

// ─── Normalization Function ──────────────────────────────────────────────────

/**
 * Normalize a comma-separated tag string to canonical tags.
 * Returns deduplicated, sorted canonical tags or null if none remain.
 */
export function normalizeTags(rawTags: string | null): string | null {
  if (!rawTags) return null;

  const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
  const canonical = new Set<string>();

  for (const tag of tags) {
    // Check direct mapping first
    if (tag in TAG_NORMALIZATION) {
      const mapped = TAG_NORMALIZATION[tag];
      if (mapped) canonical.add(mapped);
      continue;
    }
    // Check case-insensitive
    const lower = tag.toLowerCase();
    const match = Object.entries(TAG_NORMALIZATION).find(
      ([k]) => k.toLowerCase() === lower
    );
    if (match) {
      if (match[1]) canonical.add(match[1]);
    }
    // Unknown tags are dropped (conservative — only canonical tags allowed)
  }

  if (canonical.size === 0) return null;
  return Array.from(canonical).sort().join(', ');
}

// ─── Auto-Tagging Keyword Engine ─────────────────────────────────────────────

interface TagRule {
  tag: string;
  patterns: RegExp[];
}

/**
 * Keyword patterns for auto-tagging entries.
 * Each rule has a canonical tag and regex patterns to match against
 * title + description + creator + metadata text.
 *
 * Patterns are designed to be conservative — better to miss a tag
 * than to apply a wrong one.
 */
export const TAG_RULES: TagRule[] = [
  // ─── THEME: Strikes & Lockouts ───
  {
    tag: 'Strikes & Lockouts',
    patterns: [
      /\bstrike[sd]?\b/i,
      /\bstrik(ing|ers?)\b/i,
      /\blockout[s]?\b/i,
      /\bwalkout[s]?\b/i,
      /\bwork stoppage/i,
      /\bpicket(ed|ing|s|ers?)?\b/i,
      /\bwildcat strike/i,
      /\bgeneral strike/i,
      /\bsit-down strike/i,
      /\bsitdown strike/i,
    ],
  },
  // ─── THEME: Organizing ───
  {
    tag: 'Organizing',
    patterns: [
      /\bunion(iz|is)(e[ds]?|ing|ation)\b/i,
      /\borganiz(e[ds]?|ing|ers?)\b/i,
      /\bunion drive/i,
      /\bunion election/i,
      /\bcollective action/i,
      /\bunion recognition/i,
      /\bcard check/i,
      /\bunion campaign/i,
      /\bNLRB\b/,
      /\bshop steward/i,
    ],
  },
  // ─── THEME: Collective Bargaining ───
  {
    tag: 'Collective Bargaining',
    patterns: [
      /\bcollective bargain/i,
      /\bcontract negoti/i,
      /\blabor negoti/i,
      /\bbargaining (unit|agreement|table|session)/i,
      /\bwage negoti/i,
    ],
  },
  // ─── THEME: Labor Law & Legislation ───
  {
    tag: 'Labor Law & Legislation',
    patterns: [
      /\b(Wagner|Taft.Hartley|Norris.LaGuardia|NLRA|FLSA|OSHA|ERISA)\b/i,
      /\blabor (law|legislation|bill|act|statute)/i,
      /\bright.to.work\b/i,
      /\bminimum wage (law|bill|act|legislation)/i,
      /\beight.hour (day|law|movement)/i,
      /\bfair labor standards/i,
      /\boccupational safety/i,
      /\bworkers.? comp(ensation)?\b/i,
      /\bchild labor law/i,
      /\bSupreme Court.*\b(labor|union|worker|wage)/i,
      /\b(labor|union|worker|wage).*\bSupreme Court/i,
    ],
  },
  // ─── THEME: Wages & Benefits ───
  {
    tag: 'Wages & Benefits',
    patterns: [
      /\bminimum wage\b/i,
      /\bwage (cut|increase|raise|theft|gap|disparity)/i,
      /\bpay (cut|raise|equity|gap|disparity)/i,
      /\bpension[s]?\b/i,
      /\bequal pay\b/i,
      /\bliving wage/i,
      /\bovertime (pay|rule|law)/i,
    ],
  },
  // ─── THEME: Working Conditions ───
  {
    tag: 'Working Conditions',
    patterns: [
      /\bworking condition/i,
      /\bsweatshop/i,
      /\bexploit(ed|ation|ing)\b/i,
      /\bforced labor/i,
      /\boverwork/i,
      /\b(long|excessive) hours/i,
    ],
  },
  // ─── THEME: Worker Safety & Health ───
  {
    tag: 'Worker Safety & Health',
    patterns: [
      /\b(mine|mining|factory|workplace|industrial) (disaster|explosion|accident|fire|collapse|tragedy)/i,
      /\b(disaster|explosion|accident|fire|collapse|tragedy).{0,30}(mine|mining|factory|workplace|mill|plant)/i,
      /\bblack lung/i,
      /\basbestosis/i,
      /\boccupational (disease|health|illness|hazard)/i,
      /\bworkplace (safety|death|injur|fatality)/i,
      /\bkill(s|ed)?\s+\d+\s+(miners?|workers?|employees?)/i,
      /\d+\s+(miners?|workers?|employees?)\s+(killed|died|dead|perish)/i,
      /\bOSHA\b/,
      /\bsafety (violation|infraction|regulation|standard)/i,
    ],
  },
  // ─── THEME: Child Labor ───
  {
    tag: 'Child Labor',
    patterns: [
      /\bchild labor/i,
      /\bchild worker/i,
      /\bchild(ren)?.{0,20}(factor|mill|mine|sweatshop)/i,
      /\b(newsboy|newsie|breaker boy)/i,
    ],
  },
  // ─── THEME: Unemployment ───
  {
    tag: 'Unemployment',
    patterns: [
      /\bunemploy(ed|ment)\b/i,
      /\bjobless/i,
      /\blayoff[s]?\b/i,
      /\blaid off\b/i,
      /\bplant clos(e[ds]?|ing|ure)/i,
      /\bfactory clos(e[ds]?|ing|ure)/i,
    ],
  },
  // ─── THEME: Automation & Technology ───
  {
    tag: 'Automation & Technology',
    patterns: [
      /\bautomati(on|ed|ze|zing)\b/i,
      /\bmechaniz(e[ds]?|ation|ing)\b/i,
      /\brobot(s|ics|ization)?\b/i,
      /\bartificial intelligence\b/i,
      /\bgig economy/i,
      /\bapp.based (work|driver|deliver)/i,
    ],
  },
  // ─── THEME: Globalization & Outsourcing ───
  {
    tag: 'Globalization & Outsourcing',
    patterns: [
      /\bglobaliz(e[ds]?|ation|ing)\b/i,
      /\boutsourc(e[ds]?|ing)\b/i,
      /\boffshore|offshoring/i,
      /\bfree trade\b/i,
      /\bNAFTA\b/,
      /\bTPP\b/,
      /\btrade (agreement|deal|pact|treaty)/i,
      /\bsweatshop.{0,20}(overseas|abroad|foreign)/i,
    ],
  },
  // ─── THEME: Labor Culture & Arts ───
  {
    tag: 'Labor Culture & Arts',
    patterns: [
      /\blabor (song|music|poem|poetry|art|theater|theatre|mural|poster|cartoon)/i,
      /\b(song|music|poem|poetry|art|theater|theatre|mural|poster|cartoon).{0,20}(labor|union|worker|working class)/i,
      /\bprotest song/i,
      /\blabor (chorus|choir|band)/i,
      /\bfolk (song|music|singer).{0,30}(labor|union|worker|strike)/i,
    ],
  },
  // ─── THEME: International Solidarity ───
  {
    tag: 'International Solidarity',
    patterns: [
      /\binternational (solidarity|brotherhood|worker|labor day)/i,
      /\bsolidarity.{0,20}(international|global|worldwide|across borders)/i,
      /\bMay Day\b/i,
      /\bILO\b/,
      /\bInternational Labour/i,
    ],
  },

  // ─── INDUSTRY: Mining ───
  {
    tag: 'Mining',
    patterns: [
      /\bmin(e[ds]?|ing|ers?)\b/i,
      /\bcoal\b/i,
      /\bUMW(A)?\b/,
      /\bUnited Mine Workers/i,
      /\banthracite/i,
      /\bbituminous/i,
      /\bgold (mine|rush|miners)/i,
      /\bcopper mine/i,
      /\bzinc/i,
      /\bLudlow\b/i,
      /\bMother Jones\b/i,
      /\bJohn L\.?\s*Lewis\b/i,
    ],
  },
  // ─── INDUSTRY: Steel & Manufacturing ───
  {
    tag: 'Steel & Manufacturing',
    patterns: [
      /\bsteel(worker)?s?\b/i,
      /\bironwork(er)?s?\b/i,
      /\bfactor(y|ies)\b/i,
      /\bmanufactur(e[ds]?|ing|ers?)\b/i,
      /\bmill(s|workers?)?\b(?!ion)/i,
      /\bassembly line/i,
      /\bUSW(A)?\b/,
      /\bUnited Steelworkers/i,
      /\bHomestead (Strike|Steel)/i,
      /\bCarnegie Steel/i,
    ],
  },
  // ─── INDUSTRY: Textiles & Garment ───
  {
    tag: 'Textiles & Garment',
    patterns: [
      /\btextile/i,
      /\bgarment/i,
      /\bclothing workers/i,
      /\bneedle trade/i,
      /\bILGWU\b/,
      /\bACTWU\b/,
      /\bUNITE HERE\b/i,
      /\bTriangle (Shirtwaist|Factory|Fire)/i,
      /\bBread and Roses/i,
      /\bLawrence.{0,20}(strike|textile|mill)/i,
      /\bLowell.{0,20}(mill|factory|girl)/i,
    ],
  },
  // ─── INDUSTRY: Agriculture & Farm Work ───
  {
    tag: 'Agriculture & Farm Work',
    patterns: [
      /\bfarmworker/i,
      /\bfarm worker/i,
      /\bagricult(ure|ural)\b/i,
      /\bharvest(er|ing|s)?\b/i,
      /\bUFW\b/,
      /\bUnited Farm Workers/i,
      /\bCesar\s+Chavez/i,
      /\bDolores\s+Huerta/i,
      /\bgrape (boycott|strike)/i,
      /\bDelano/i,
      /\bsharecropper/i,
      /\btenant farmer/i,
      /\bSouthern Tenant Farmers/i,
      /\bmigrant (farm|field|labor)/i,
    ],
  },
  // ─── INDUSTRY: Auto & Transportation ───
  {
    tag: 'Auto & Transportation',
    patterns: [
      /\bUAW\b/,
      /\bUnited Auto(mobile)? Workers/i,
      /\bauto(mobile)? (worker|plant|factory|industry)/i,
      /\brailroad/i,
      /\brailway/i,
      /\bBrotherhood of (Railroad|Locomotive|Railway)/i,
      /\bteamster/i,
      /\btruck(er|ing|driver)/i,
      /\btransit (worker|union|strike)/i,
      /\bPullman/i,
      /\bFlint sit.down/i,
      /\bGeneral Motors.{0,20}(strike|Flint|UAW)/i,
    ],
  },
  // ─── INDUSTRY: Construction ───
  {
    tag: 'Construction',
    patterns: [
      /\bconstruction (worker|trade|union|site|industry)/i,
      /\bbuilding trades/i,
      /\bcarpenter[s]?\b/i,
      /\belectrician[s]?\b/i,
      /\bplumber[s]?\b/i,
      /\bironworker[s]?\b/i,
      /\bbricklayer/i,
      /\bIBEW\b/,
      /\bhard hat/i,
    ],
  },
  // ─── INDUSTRY: Public Sector ───
  {
    tag: 'Public Sector',
    patterns: [
      /\bpublic (sector|employee|worker|servant)/i,
      /\bgovernment (worker|employee|union)/i,
      /\bcivil serv(ant|ice)/i,
      /\bAFSCME\b/,
      /\bAFGE\b/,
      /\bpostal (worker|union|strike|service)/i,
      /\bfirefighter/i,
      /\bpolic(e|ing).{0,20}(union|strike|officer)/i,
      /\bsanitation (worker|strike)/i,
      /\bMemphis.{0,20}(sanitation|strike|1968)/i,
    ],
  },
  // ─── INDUSTRY: Education & Teachers ───
  {
    tag: 'Education & Teachers',
    patterns: [
      /\bteacher[s]?\b/i,
      /\beducator[s]?\b/i,
      /\bschool (strike|teacher|worker|board|bus)/i,
      /\bAFT\b/,
      /\bNEA\b/,
      /\b(teachers?|education).{0,20}union/i,
      /\bunion.{0,20}(teachers?|education)/i,
      /\bprofessor[s]?\b/i,
      /\bgraduate (student|assistant|worker)/i,
    ],
  },
  // ─── INDUSTRY: Healthcare ───
  {
    tag: 'Healthcare',
    patterns: [
      /\bnurs(e[s]?|ing)\b/i,
      /\bhospital (worker|strike|union|employee)/i,
      /\bhealthcare (worker|union|strike)/i,
      /\bhealth care (worker|union|strike)/i,
      /\b(doctor|physician|medical).{0,20}(union|strike|organiz)/i,
      /\bSEIU.{0,20}(health|hospital|nurs)/i,
      /\bNational Nurses/i,
    ],
  },
  // ─── INDUSTRY: Entertainment & Media ───
  {
    tag: 'Entertainment & Media',
    patterns: [
      /\bSAG\b/,
      /\bAFTRA\b/,
      /\bSAG.AFTRA/i,
      /\bWGA\b/,
      /\bWriters Guild/i,
      /\bScreen Actors/i,
      /\bDGA\b/,
      /\bIATSE\b/,
      /\bHollywood.{0,20}(strike|union|labor)/i,
      /\bbroadcast(er|ing)?.{0,20}(union|strike|worker)/i,
      /\bnewspaper (guild|union|strike|worker)/i,
      /\bjournalist[s]?.{0,20}(union|strike|guild)/i,
    ],
  },
  // ─── INDUSTRY: Service & Retail ───
  {
    tag: 'Service & Retail',
    patterns: [
      /\bservice (worker|employee|industry|sector|union)/i,
      /\bretail (worker|employee|clerk|union)/i,
      /\bwaiter|waitress|waitstaff/i,
      /\bjanitor/i,
      /\bcustodian/i,
      /\bhousekeep(er|ing)/i,
      /\bhotel (worker|union|strike|employee)/i,
      /\brestaurant (worker|union|strike|employee)/i,
      /\bfast food/i,
      /\bFight for \$?15/i,
    ],
  },
  // ─── INDUSTRY: Maritime & Dockworkers ───
  {
    tag: 'Maritime & Dockworkers',
    patterns: [
      /\bdockworker/i,
      /\blongshoreman|longshoremen/i,
      /\bILWU\b/,
      /\bILA\b/,
      /\bmaritim(e|er)/i,
      /\bseaman|seamen/i,
      /\bsailor[s]?\b/i,
      /\bmerchant marin/i,
      /\bwaterfront/i,
      /\bHarry Bridges/i,
    ],
  },
  // ─── INDUSTRY: Domestic Workers ───
  {
    tag: 'Domestic Workers',
    patterns: [
      /\bdomestic (worker|servant|service|labor|employee)/i,
      /\bmaid[s]?\b/i,
      /\bnanny|nannies/i,
      /\bhome (care|health) (worker|aide)/i,
    ],
  },

  // ─── SOCIAL: Civil Rights & Race ───
  {
    tag: 'Civil Rights & Race',
    patterns: [
      /\bcivil rights/i,
      /\bracial (justice|equality|discrimination|segregation)/i,
      /\bsegregat(e[ds]?|ion|ing)\b/i,
      /\bJim Crow/i,
      /\bAfrican.American/i,
      /\bBlack (worker|union|labor|freedom|lives)/i,
      /\bA\.?\s*Philip\s+Randolph/i,
      /\bBrotherhood of Sleeping Car/i,
      /\bMarch on Washington/i,
      /\bMLK\b/i,
      /\bMartin Luther King/i,
      /\bCoretta Scott King/i,
      /\bNAACP\b/,
      /\brace\s+and\s+(labor|work)/i,
    ],
  },
  // ─── SOCIAL: Women & Gender ───
  {
    tag: 'Women & Gender',
    patterns: [
      /\bwomen (worker|in the|labor|and|strike|organiz)/i,
      /\b(female|woman) (worker|labor|organiz)/i,
      /\bsuffrag(e|ist|ette)/i,
      /\bfeminis(t|m)/i,
      /\bequal pay/i,
      /\bgender (gap|equity|equality|discrimination)/i,
      /\bRosie the Riveter/i,
      /\bClara Lemlich/i,
      /\bRose Schneiderman/i,
      /\bMary Harris Jones/i,
      /\bFrances Perkins/i,
      /\bDolores Huerta/i,
      /\bsexual harassment/i,
      /\b(Title IX|Title 7|Title VII)\b/i,
    ],
  },
  // ─── SOCIAL: Immigration ───
  {
    tag: 'Immigration',
    patterns: [
      /\bimmigra(nt|tion|nts)\b/i,
      /\bmigrant (worker|labor|farm)/i,
      /\bundocumented (worker|immigrant|laborer)/i,
      /\bforeign.born (worker|labor)/i,
      /\bguest worker/i,
      /\bdeport(ed|ation|ing)\b/i,
      /\bbracero/i,
      /\bChinese Exclusion/i,
    ],
  },
  // ─── SOCIAL: War & Military ───
  {
    tag: 'War & Military',
    patterns: [
      /\bworld war/i,
      /\bwar (effort|industry|production|time|bond)/i,
      /\bwartime (labor|worker|production|industr)/i,
      /\b(WWI|WWII|WW1|WW2)\b/,
      /\bVietnam.{0,15}(war|era|protest|veteran)/i,
      /\bmilitary.{0,15}(labor|union|worker)/i,
      /\bdefense (plant|industry|worker|production)/i,
      /\barsenal/i,
    ],
  },
  // ─── SOCIAL: Socialism & Left Politics ───
  {
    tag: 'Socialism & Left Politics',
    patterns: [
      /\bsocialis(t|m|ts)\b/i,
      /\bcommuni(st|sm|sts)\b/i,
      /\banarchis(t|m|ts)\b/i,
      /\bIWW\b/,
      /\bIndustrial Workers of the World/i,
      /\bWobbl(y|ies)\b/i,
      /\bEugene\s+(V\.?\s+)?Debs/i,
      /\bBig Bill Haywood/i,
      /\bEmma Goldman/i,
      /\bJoe Hill\b/i,
      /\bRed Scare/i,
      /\bMcCarthy(ism)?\b/i,
      /\bblacklist(ed|ing)?\b/i,
      /\bMarx(ist|ism)?\b/i,
    ],
  },
  // ─── SOCIAL: Environment ───
  {
    tag: 'Environment',
    patterns: [
      /\benvironment(al)?\s+(justice|movement|protect|regulat|law)/i,
      /\bgreen (jobs|new deal|economy)/i,
      /\bjust transition/i,
      /\bclimate.{0,15}(change|justice|worker|job)/i,
      /\bpollut(ion|ed|ing).{0,20}(worker|factory|plant|community)/i,
      /\btoxic (exposure|waste|chemical).{0,20}(worker|factory|plant)/i,
    ],
  },
  // ─── SOCIAL: Working Class ───
  {
    tag: 'Working Class',
    patterns: [
      /\bworking class/i,
      /\bworking.class/i,
      /\bblue.collar/i,
      /\bclass (struggle|consciousness|conflict|warfare|solidarity)/i,
      /\bproletaria(t|n)/i,
    ],
  },
  // ─── SOCIAL: Politics & Elections ───
  {
    tag: 'Politics & Elections',
    patterns: [
      /\b(labor|union).{0,20}(endors|candidate|election|campaign|vote|ballot|politic)/i,
      /\b(election|vote|ballot|campaign|politic).{0,20}(labor|union|worker)/i,
      /\blabor (party|movement|platform)/i,
      /\bpolitical (action|committee|campaign).{0,15}(labor|union)/i,
      /\bCOPE\b/,
      /\bPAC\b.*\b(union|labor)/i,
    ],
  },

  // ─── Notable People → Multiple Tags ───
  // These are handled by the people mapping below, not here
];

// ─── Notable People Mapping ──────────────────────────────────────────────────
// Maps labor figures to their associated tags

export const PEOPLE_TAGS: Record<string, string[]> = {
  'Samuel Gompers': ['Organizing'],
  'Eugene Debs': ['Socialism & Left Politics'],
  'Eugene V. Debs': ['Socialism & Left Politics'],
  'Mother Jones': ['Mining', 'Organizing', 'Child Labor'],
  'Mary Harris Jones': ['Mining', 'Organizing', 'Child Labor'],
  'Joe Hill': ['Socialism & Left Politics', 'Labor Culture & Arts'],
  'Big Bill Haywood': ['Socialism & Left Politics', 'Mining'],
  'Cesar Chavez': ['Agriculture & Farm Work', 'Immigration', 'Organizing'],
  'Dolores Huerta': ['Agriculture & Farm Work', 'Immigration', 'Women & Gender', 'Organizing'],
  'A. Philip Randolph': ['Civil Rights & Race', 'Auto & Transportation', 'Organizing'],
  'Walter Reuther': ['Auto & Transportation', 'Organizing'],
  'John L. Lewis': ['Mining', 'Organizing'],
  'Frances Perkins': ['Labor Law & Legislation', 'Women & Gender'],
  'Harry Bridges': ['Maritime & Dockworkers', 'Organizing'],
  'Emma Goldman': ['Socialism & Left Politics'],
  'Clara Lemlich': ['Textiles & Garment', 'Women & Gender', 'Strikes & Lockouts'],
  'Rose Schneiderman': ['Textiles & Garment', 'Women & Gender', 'Worker Safety & Health'],
  'Lucy Parsons': ['Socialism & Left Politics', 'Civil Rights & Race'],
  'Elizabeth Gurley Flynn': ['Socialism & Left Politics', 'Women & Gender'],
  'Pete Seeger': ['Labor Culture & Arts'],
  'Woody Guthrie': ['Labor Culture & Arts'],
  'Florence Reece': ['Mining', 'Labor Culture & Arts', 'Women & Gender'],
  'Sarah Bagley': ['Textiles & Garment', 'Women & Gender'],
  'Mary McLeod Bethune': ['Civil Rights & Race', 'Education & Teachers'],
  'Martin Luther King': ['Civil Rights & Race'],
  'Coretta Scott King': ['Civil Rights & Race', 'Women & Gender'],
  'Bayard Rustin': ['Civil Rights & Race'],
  'Sidney Hillman': ['Textiles & Garment', 'Politics & Elections'],
  'George Meany': ['Organizing'],
  'Lane Kirkland': ['Organizing', 'International Solidarity'],
  'John Sweeney': ['Organizing', 'Service & Retail'],
  'Richard Trumka': ['Mining', 'Organizing'],
  'Liz Shuler': ['Organizing', 'Women & Gender'],
  'Mary Kay Henry': ['Healthcare', 'Organizing', 'Women & Gender'],
  'Karen Lewis': ['Education & Teachers', 'Civil Rights & Race'],
  'Randi Weingarten': ['Education & Teachers', 'Organizing'],
  'Sara Nelson': ['Organizing', 'Auto & Transportation'],
  'Anne Feeney': ['Labor Culture & Arts'],
  'Utah Phillips': ['Labor Culture & Arts', 'Socialism & Left Politics'],
  'Si Kahn': ['Labor Culture & Arts', 'Organizing'],
  'Larry Penn': ['Labor Culture & Arts'],
};

// ─── Notable Events Mapping ─────────────────────────────────────────────────

export const EVENT_TAGS: Record<string, string[]> = {
  'Haymarket': ['Strikes & Lockouts', 'Socialism & Left Politics'],
  'Triangle': ['Textiles & Garment', 'Women & Gender', 'Worker Safety & Health'],
  'Triangle Shirtwaist': ['Textiles & Garment', 'Women & Gender', 'Worker Safety & Health'],
  'Pullman Strike': ['Auto & Transportation', 'Strikes & Lockouts'],
  'Homestead': ['Steel & Manufacturing', 'Strikes & Lockouts'],
  'Ludlow Massacre': ['Mining', 'Strikes & Lockouts'],
  'Ludlow': ['Mining', 'Strikes & Lockouts'],
  'Bread and Roses': ['Textiles & Garment', 'Women & Gender', 'Strikes & Lockouts'],
  'Lawrence Strike': ['Textiles & Garment', 'Strikes & Lockouts'],
  'Flint Sit-Down': ['Auto & Transportation', 'Strikes & Lockouts'],
  'Memphis Sanitation': ['Public Sector', 'Civil Rights & Race', 'Strikes & Lockouts'],
  'PATCO': ['Strikes & Lockouts', 'Auto & Transportation'],
  'Taft-Hartley': ['Labor Law & Legislation'],
  'Wagner Act': ['Labor Law & Legislation'],
  'New Deal': ['Labor Law & Legislation', 'Politics & Elections'],
  'Lowell Mill': ['Textiles & Garment', 'Women & Gender'],
  'Matewan': ['Mining', 'Strikes & Lockouts'],
  'Battle of Blair Mountain': ['Mining', 'Strikes & Lockouts'],
  'Blair Mountain': ['Mining', 'Strikes & Lockouts'],
  'Lattimer Massacre': ['Mining', 'Immigration'],
  'Harlan County': ['Mining', 'Strikes & Lockouts'],
  'Delano Grape': ['Agriculture & Farm Work', 'Strikes & Lockouts', 'Immigration'],
  'March on Washington': ['Civil Rights & Race'],
  'May Day': ['International Solidarity'],
  'Cripple Creek': ['Mining', 'Strikes & Lockouts'],
  'Everett Massacre': ['Socialism & Left Politics'],
  'Republic Steel': ['Steel & Manufacturing', 'Strikes & Lockouts'],
  'Little Steel': ['Steel & Manufacturing', 'Strikes & Lockouts'],
  'Great Railroad Strike': ['Auto & Transportation', 'Strikes & Lockouts'],
  'Uprising of the 20,000': ['Textiles & Garment', 'Women & Gender', 'Strikes & Lockouts'],
};

// ─── Union/Org Name Mapping ─────────────────────────────────────────────────

export const ORG_TAGS: Record<string, string[]> = {
  'AFL-CIO': ['Organizing'],
  'AFL': ['Organizing'],
  'CIO': ['Organizing'],
  'IWW': ['Socialism & Left Politics'],
  'UMWA': ['Mining'],
  'UMW': ['Mining'],
  'United Mine Workers': ['Mining'],
  'UAW': ['Auto & Transportation'],
  'United Auto Workers': ['Auto & Transportation'],
  'ILGWU': ['Textiles & Garment', 'Women & Gender'],
  'UFW': ['Agriculture & Farm Work', 'Immigration'],
  'United Farm Workers': ['Agriculture & Farm Work', 'Immigration'],
  'SEIU': ['Service & Retail', 'Healthcare'],
  'AFSCME': ['Public Sector'],
  'AFT': ['Education & Teachers'],
  'NEA': ['Education & Teachers'],
  'IBEW': ['Construction'],
  'Teamsters': ['Auto & Transportation'],
  'IBT': ['Auto & Transportation'],
  'ILWU': ['Maritime & Dockworkers'],
  'ILA': ['Maritime & Dockworkers'],
  'SAG-AFTRA': ['Entertainment & Media'],
  'WGA': ['Entertainment & Media'],
  'IATSE': ['Entertainment & Media'],
  'UNITE HERE': ['Service & Retail', 'Textiles & Garment'],
  'NLRB': ['Labor Law & Legislation'],
  'OSHA': ['Worker Safety & Health'],
};

// ─── Auto-Tag Function ──────────────────────────────────────────────────────

/**
 * Auto-tag an entry based on its text content.
 * Returns an array of canonical tag strings (max 5).
 */
export function autoTagEntry(entry: {
  title: string | null;
  description: string | null;
  creator: string | null;
  metadata: string | null;
  tags: string | null;
}): string[] {
  // Combine all text fields for matching
  const text = [
    entry.title || '',
    entry.description || '',
    entry.creator || '',
    entry.metadata || '',
  ].join(' ');

  if (!text.trim()) return [];

  const matched = new Set<string>();

  // 1. Check keyword patterns
  for (const rule of TAG_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        matched.add(rule.tag);
        break; // one match per rule is enough
      }
    }
  }

  // 2. Check notable people
  for (const [person, tags] of Object.entries(PEOPLE_TAGS)) {
    if (text.includes(person) || new RegExp(`\\b${person.replace(/\./g, '\\.')}\\b`, 'i').test(text)) {
      for (const tag of tags) matched.add(tag);
    }
  }

  // 3. Check notable events
  for (const [event, tags] of Object.entries(EVENT_TAGS)) {
    if (new RegExp(`\\b${event.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) {
      for (const tag of tags) matched.add(tag);
    }
  }

  // 4. Check organizations
  for (const [org, tags] of Object.entries(ORG_TAGS)) {
    if (new RegExp(`\\b${org.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) {
      for (const tag of tags) matched.add(tag);
    }
  }

  // Cap at 5 tags to prevent over-tagging
  // Prioritize: keep theme tags first, then industry, then social
  const themeOrder = CANONICAL_TAGS;
  const sorted = Array.from(matched).sort(
    (a, b) => themeOrder.indexOf(a) - themeOrder.indexOf(b)
  );

  return sorted.slice(0, 5);
}

/**
 * Merge auto-generated tags with existing tags.
 * Existing tags take priority; new tags are appended up to the max.
 */
export function mergeTagsWithExisting(
  existingTags: string | null,
  newTags: string[],
  maxTags = 5
): string | null {
  const existing = existingTags
    ? existingTags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const merged = new Set<string>(existing);
  for (const tag of newTags) {
    if (merged.size >= maxTags) break;
    merged.add(tag);
  }

  if (merged.size === 0) return null;
  return Array.from(merged).sort().join(', ');
}
