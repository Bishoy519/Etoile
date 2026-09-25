export interface AcademyBrandingDto {
  name: string;
  nameAr: string;
  tagline: string;
  taglineAr: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  addressAr: string;
  logoUrl: string;
  socials: {
    x?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    snapchat?: string;
  };
}

export interface HeroContentDto {
  headlineLine1: string;
  headlineLine2: string;
  headlineLine3: string;
  headlineLine1Ar: string;
  headlineLine2Ar: string;
  headlineLine3Ar: string;
  subtitleLine1: string;
  subtitleLine2: string;
  subtitleLine1Ar: string;
  subtitleLine2Ar: string;
  ctaText: string;
  ctaTextAr: string;
  bgImageUrl: string;
}

export interface ProgramContentDto {
  id: string;
  key: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  bgImageUrl: string;
  ageGroup: string;
  schedule: string;
  pricePerTerm: number;
  features: string[];
  featuresAr: string[];
}

export interface FacultyMemberDto {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  roleAr: string;
  badge: string;
  bio: string;
  bioAr: string;
  photoUrl: string;
  active: boolean;
}

export interface PerformanceEventDto {
  id: string;
  dates: string;
  datesAr: string;
  venue: string;
  venueAr: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  ctaText: string;
  ctaTextAr: string;
  status: 'upcoming' | 'sold_out' | 'box_office';
}

export interface PortalNoticeDto {
  enabled: boolean;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  severity: 'info' | 'gold' | 'warning';
}

export interface FooterLinkDto {
  id: string;
  label: string;
  labelAr: string;
  url: string;
  icon?: string;
  openInNewTab: boolean;
  enabled: boolean;
  sortOrder: number;
}

export interface PortalContentTreeDto {
  branding: AcademyBrandingDto;
  hero: HeroContentDto;
  programs: ProgramContentDto[];
  faculty: FacultyMemberDto[];
  performances: PerformanceEventDto[];
  notice: PortalNoticeDto;
  footerLinks: FooterLinkDto[];
  lastUpdated: string;
}
