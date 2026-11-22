/**
 * Tag groups offered by the admin tag picker (TagSelector).
 *
 * Must match TAG_GROUPS in server/tags.ts tag for tag (the server's 'Social Dimension'
 * is 'Social' here); server/tags.test.ts fails if the two drift apart. Plain data,
 * no React, so the server tests can import it.
 */

export interface TagGroup {
  name: string;
  tags: string[];
  /** Offered only when editing a Labor Radio/Podcast show. */
  podcastOnly?: boolean;
}

export const TAG_GROUPS: TagGroup[] = [
  {
    name: 'Theme',
    tags: [
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
  },
  {
    name: 'Industry',
    tags: [
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
  },
  {
    name: 'Curation',
    tags: [
      'Festival Watchlist',
      'Labor Awards Watchlist',
    ],
  },
  {
    name: 'Social',
    tags: [
      'Civil Rights & Race',
      'Women & Gender',
      'Immigration',
      'War & Military',
      'Socialism & Left Politics',
      'Environment',
      'Working Class',
      'Politics & Elections',
    ],
  },
  {
    name: 'Union/Org',
    podcastOnly: true,
    tags: [
      'AAUP',
      'AFT',
      'BCTGM',
      'CFMEU',
      'History Associations',
      'IAM',
      'IATSE',
      'Ironworkers',
      'LCLAA',
      'LHF',
      'NALC',
      'SAG-AFTRA',
      'State/Local AFL-CIO',
      'Teamsters',
      'USW',
    ],
  },
  {
    name: 'Region',
    podcastOnly: true,
    tags: [
      'Eastern US',
      'Western US',
      'Midwest US',
      'Southwest US',
      'Mountain West US',
      'Canada',
      'Europe',
      'Latin America',
      'Oceania',
      'Africa',
      'North Africa/Middle East',
      'Asia',
      'National',
      'International',
    ],
  },
];
