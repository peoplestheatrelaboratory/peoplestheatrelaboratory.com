export interface Artist {
  slug: string;
  name: string;
  nameDeva: string;
  roles: string[];
  era: string;
  link: string;
  photo: string;
  note: string; // html
}

export interface Reference {
  label: string;
  url: string;
}

export interface Song {
  slug: string;
  title: string;
  titleLatin: string;
  poets: string[];
  singers: string[];
  language: string[];
  genre: string[];
  geography: string[];
  raag: string;
  lyrics: string[]; // stanzas
  meaning: string;
  references: Reference[];
}

export type Series = 'Baithak' | 'Kabir Sang Ruhdaari' | 'Production' | 'Workshop' | '';

export interface Event {
  slug: string;
  title: string;
  titleDeva: string;
  series: Series;
  date: string | null;
  tithi: string;
  venue: string;
  city: string;
  summary: string;
  registerUrl: string;
  cover: string;
  setlist: string[];
  artists: string[];
  body: string; // html
}

export interface TeamMember {
  slug: string;
  name: string;
  nameDeva: string;
  role: string;
  order: number;
  photo: string;
  socials: string;
  bio: string; // html
}

export interface Post {
  slug: string;
  title: string;
  date: string | null;
  authors: string[];
  excerpt: string;
  cover: string;
  tags: string[];
  relatedEvent: string;
  body: string; // html
}

export interface Script {
  slug: string;
  title: string;
  titleDeva: string;
  playwrights: string[];
  language: string[];
  year: number | null;
  file: string;
  synopsis: string;
  productions: string[];
  body: string; // html
}

export interface Quote {
  couplet: string;
  translation: string;
  attribution: string;
  poet: string; // artist slug, may be empty
  order: number;
}
