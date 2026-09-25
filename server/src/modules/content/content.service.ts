import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import {
  PortalContentTreeDto,
  AcademyBrandingDto,
  HeroContentDto,
  ProgramContentDto,
  FacultyMemberDto,
  PerformanceEventDto,
  PortalNoticeDto,
} from './dto/portal-content.dto';

const DEFAULT_PORTAL_CONTENT: PortalContentTreeDto = {
  branding: {
    name: 'Étoile Ballet Academy',
    nameAr: 'أكاديمية إيتوال للباليه',
    tagline: 'Excellence in Classical and Contemporary Dance',
    taglineAr: 'الريادة والتميز في فنون الباليه الكلاسيكي والرقص المعاصر',
    phone: '+20 2 2736 0000',
    email: 'contact@etoile.eg',
    website: 'https://etoile.eg',
    address: 'Zamalek Main Campus & New Cairo Studio, Cairo, Egypt',
    addressAr: 'فرع الزمالك الرئيسي وأستوديو التجمع الخامس، القاهرة، مصر',
    logoUrl: '/favicon.png',
    socials: {
      x: 'https://x.com/etoileacademy',
      facebook: 'https://facebook.com/etoileacademy',
      instagram: 'https://instagram.com/etoileacademy',
      youtube: 'https://youtube.com/etoileacademy',
    },
  },
  hero: {
    headlineLine1: 'ÉTOILE',
    headlineLine2: 'BALLET',
    headlineLine3: 'ACADEMY',
    headlineLine1Ar: 'أكاديمية',
    headlineLine2Ar: 'إيتوال',
    headlineLine3Ar: 'للباليه',
    subtitleLine1: 'Excellence in Classical and',
    subtitleLine2: 'Contemporary Dance',
    subtitleLine1Ar: 'الريادة والتميز في فنون',
    subtitleLine2Ar: 'الباليه الكلاسيكي والرقص المعاصر',
    ctaText: 'Discover Our Academy',
    ctaTextAr: 'اكتشف برامج الأكاديمية',
    bgImageUrl: '/hero-ballerina.jpg',
  },
  programs: [
    {
      id: 'PROG-CLASSICAL',
      key: 'classical',
      title: 'Classical Ballet',
      titleAr: 'الباليه الكلاسيكي',
      description: 'Classical ballet is designed to cultivate professional poise, high discipline and classical technique.',
      descriptionAr: 'تدريب تأسيسي كلاسيكي يبني أعلى درجات الانضباط الحركي والرشاقة الخالدة وفق المعايير العالمية.',
      bgImageUrl: '/hero-ballerina.jpg',
      ageGroup: 'Ages 8 - 18+',
      schedule: 'Mon, Wed, Fri (4:00 PM - 7:30 PM)',
      pricePerTerm: 480,
      features: [
        'Vaganova & Paris Opéra syllabus alignment',
        'Pointe work & Pas de Deux partnering',
        'Annual Grand Théâtre repertoire performance',
      ],
      featuresAr: [
        'منهج فاجانوفا ومدرسة أوبرا باريس',
        'تدريب البوانت والشراكة الثنائية',
        'المشاركة في العرض السنوي على المسرح الكبير',
      ],
    },
    {
      id: 'PROG-CONTEMPORARY',
      key: 'contemporary',
      title: 'Contemporary Dance',
      titleAr: 'الرقص المعاصر',
      description: 'Contemporary dance fosters modern innovation and artistic excellence alongside classical tradition.',
      descriptionAr: 'يوازن الرقص المعاصر بين التعبير الحر والأساليب الكلاسيكية التقليدية الصارمة لخلق فنان متكامل.',
      bgImageUrl: '/hero-ballerina.jpg',
      ageGroup: 'Ages 12 - 20+',
      schedule: 'Tue, Thu, Sat (5:00 PM - 8:00 PM)',
      pricePerTerm: 520,
      features: [
        'Gaga movement & Cunningham technique',
        'Fluid floorwork and choreographic creation',
        'Guest residencies with European soloist directors',
      ],
      featuresAr: [
        'تقنيات حركة غاغا وكانينغهام',
        'العمل الأرضي السلس والتأليف الحركي',
        'ورش تدريبية مع مديري فرق أوروبية زائرين',
      ],
    },
    {
      id: 'PROG-YOUTH',
      key: 'youth',
      title: 'Youth Program',
      titleAr: 'برنامج الناشئين',
      description: 'Youth Program is designed to inspire young dancers with creative technique and early classical training.',
      descriptionAr: 'يقدم للراقصين الصغار مهارات حركية أساسية وتدريباً هيكلياً آمناً بروح مرحة وغرس حب المسرح.',
      bgImageUrl: '/hero-ballerina.jpg',
      ageGroup: 'Ages 4 - 11',
      schedule: 'Sat, Sun (10:00 AM - 1:00 PM)',
      pricePerTerm: 260,
      features: [
        'Creative musicality and anatomical posture safety',
        'Early turnout conditioning without joint strain',
        'Winter Revelry Nutcracker company participation',
      ],
      featuresAr: [
        'تطوير الحس الإيقاعي وسلامة المحاذاة الجسدية',
        'تأسيس المرونة السليمة دون إجهاد المفاصل',
        'المشاركة في عرض كسارة البندق الشتوي للناشئين',
      ],
    },
  ],
  faculty: [
    {
      id: 'FAC-001',
      name: 'Madame Elena Rostova',
      nameAr: 'مدام إيلينا روستوفا',
      role: 'Artistic Director & Paris Opéra Soliste',
      roleAr: 'المديرة الفنية وسوليست سابقة في أوبرا باريس',
      badge: 'Étoile',
      bio: '25 years of stage mastery interpreting Petipa, Balanchine, and MacMillan repertoire across Europe.',
      bioAr: '25 عاماً من الإبداع المسرحي في تجسيد روائع بيتيبا وبلانشين وماكميلان على أكبر مسارح أوروبا.',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      active: true,
    },
    {
      id: 'FAC-002',
      name: 'Julian Moreau',
      nameAr: 'جوليان مورو',
      role: 'Head of Contemporary Movement',
      roleAr: 'رئيس قسم الرقص والحركة المعاصرة',
      badge: 'Soliste',
      bio: 'Former Principal Soloist at Nederlands Dans Theater. Blends fluid floorwork with architectural alignment.',
      bioAr: 'راقص أول سابق في مسرح الرقص الهولندي، يجمع بين انسيابية الحركة الأرضية ودقة البناء التعبيري.',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      active: true,
    },
    {
      id: 'FAC-003',
      name: 'Sofia Chen',
      nameAr: 'صوفيا تشن',
      role: 'Director of Youth Pedagogy',
      roleAr: 'مديرة برامج تدريب وبيداغوجيا الناشئين',
      badge: 'Youth Head',
      bio: 'Royal Ballet Upper School alumna, specializing in child kinesiology and anatomical safety.',
      bioAr: 'خريجة مدرسة الباليه الملكي العليا، متخصصة في علم حركة الأطفال وسلامة المحاذاة الجسدية.',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      active: true,
    },
  ],
  performances: [
    {
      id: 'PERF-001',
      dates: 'May 14–17, 2026',
      datesAr: '14–17 مايو 2026',
      venue: 'Grand Théâtre',
      venueAr: 'المسرح الكبير',
      title: 'Swan Lake // Acts II & IV',
      titleAr: 'بحيرة البجع // الفصلان الثاني والرابع',
      description: "Tchaikovsky's legendary score with authentic Petipa Ivanov staging and luminescent golden corps de ballet choreography.",
      descriptionAr: 'موسيقى تشايكوفسكي الخالدة برؤية بيتيبا وإيفانوف الأصلية وأداء كور دي باليه مذهب ينبض بالروعة.',
      ctaText: 'Inquire About Box Seats',
      ctaTextAr: 'حجز مقاعد كبار الزوار',
      status: 'upcoming',
    },
    {
      id: 'PERF-002',
      dates: 'July 22–25, 2026',
      datesAr: '22–25 يوليو 2026',
      venue: 'Palais des Arts',
      venueAr: 'قصر الفنون',
      title: 'Chroma & Cadence Contemporary Gala',
      titleAr: 'حفل كروما وكادانس للرقص المعاصر',
      description: 'World premiere contemporary choreography pairing neoclassical geometry with minimalist chamber ensemble.',
      descriptionAr: 'عرض أول عالمي يجمع بين هندسة الكلاسيكية الحديثة ومقطوعات موسيقية حية لفرقة الحجرة.',
      ctaText: 'Inquire About Box Seats',
      ctaTextAr: 'حجز مقاعد كبار الزوار',
      status: 'upcoming',
    },
    {
      id: 'PERF-003',
      dates: 'Dec 18–23, 2026',
      datesAr: '18–23 ديسمبر 2026',
      venue: 'Metropolitan Opera',
      venueAr: 'دار أوبرا المتروبوليتان',
      title: 'The Nutcracker: Winter Revelry',
      titleAr: 'كسارة البندق: احتفالية الشتاء',
      description: 'Featuring celebrated Youth and Pre-Professional companies in a breathtaking holiday spectacle of golden snow.',
      descriptionAr: 'بمشاركة نجوم برامج الناشئين والمستوى قبل الاحترافي في استعراض عطلات ساحر يبهر الأنظار.',
      ctaText: 'Inquire About Box Seats',
      ctaTextAr: 'حجز مقاعد كبار الزوار',
      status: 'upcoming',
    },
  ],
  notice: {
    enabled: true,
    title: 'Spring Term Repertoire Auditions Open',
    titleAr: 'بدء اختبارات أداء الموسم الربيعي',
    message: 'Pre-Professional students may register for soloist audition slots at the front desk or via WhatsApp.',
    messageAr: 'يمكن لطلاب المستوى قبل الاحترافي التسجيل لتجارب أداء الأدوار الفردية لدى الاستقبال أو عبر واتساب.',
    severity: 'gold',
  },
  footerLinks: [
    { id: 'FL-001', label: 'Privacy Policy', labelAr: 'سياسة الخصوصية', url: '/privacy', icon: 'fa-shield-halved', openInNewTab: false, enabled: true, sortOrder: 1 },
    { id: 'FL-002', label: 'Terms & Conditions', labelAr: 'الشروط والأحكام', url: '/terms', icon: 'fa-file-contract', openInNewTab: false, enabled: true, sortOrder: 2 },
    { id: 'FL-003', label: 'FAQs', labelAr: 'الأسئلة الشائعة', url: '/faq', icon: 'fa-circle-question', openInNewTab: false, enabled: true, sortOrder: 3 },
    { id: 'FL-004', label: 'Careers', labelAr: 'فرص العمل', url: '/careers', icon: 'fa-briefcase', openInNewTab: false, enabled: true, sortOrder: 4 },
    { id: 'FL-005', label: 'Press & Media', labelAr: 'الإعلام والصحافة', url: '/media', icon: 'fa-newspaper', openInNewTab: false, enabled: true, sortOrder: 5 },
  ],
  lastUpdated: new Date().toISOString(),
};

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private content: PortalContentTreeDto = JSON.parse(JSON.stringify(DEFAULT_PORTAL_CONTENT));

  constructor(private readonly prisma: PrismaService) {
    this.initContent();
  }

  private async initContent() {
    try {
      const store = await this.prisma.portalContentStore.findUnique({
        where: { id: 'portal-root' },
      });

      if (store && store.contentJson && store.contentJson.length > 10) {
        const parsed = JSON.parse(store.contentJson);
        this.content = {
          ...DEFAULT_PORTAL_CONTENT,
          ...parsed,
          branding: { ...DEFAULT_PORTAL_CONTENT.branding, ...(parsed.branding || {}) },
          hero: { ...DEFAULT_PORTAL_CONTENT.hero, ...(parsed.hero || {}) },
          notice: { ...DEFAULT_PORTAL_CONTENT.notice, ...(parsed.notice || {}) },
        };
        this.logger.log('Portal content successfully initialized from PostgreSQL.');
        return;
      }

      // If empty in DB, check disk
      const storagePath = path.resolve(process.cwd(), 'data', 'portal-content.json');
      if (fs.existsSync(storagePath)) {
        const raw = fs.readFileSync(storagePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.content = { ...DEFAULT_PORTAL_CONTENT, ...parsed };
        await this.persistToDb();
      }
    } catch (err) {
      this.logger.error(`Failed to load content from DB: ${(err as Error).message}`);
    }
  }

  private async persistToDb() {
    try {
      this.content.lastUpdated = new Date().toISOString();
      const contentJson = JSON.stringify(this.content);

      await this.prisma.portalContentStore.upsert({
        where: { id: 'portal-root' },
        update: { contentJson, lastUpdated: new Date() },
        create: { id: 'portal-root', contentJson, lastUpdated: new Date() },
      });

      // Also mirror to disk for backup
      const dir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.resolve(dir, 'portal-content.json'), JSON.stringify(this.content, null, 2), 'utf8');
    } catch (err) {
      this.logger.error(`Error persisting portal content: ${(err as Error).message}`);
    }
  }

  async getContent(): Promise<PortalContentTreeDto> {
    const store = await this.prisma.portalContentStore.findUnique({
      where: { id: 'portal-root' },
    });
    if (store && store.contentJson && store.contentJson.length > 10) {
      try {
        const parsed = JSON.parse(store.contentJson);
        this.content = {
          ...DEFAULT_PORTAL_CONTENT,
          ...parsed,
          branding: { ...DEFAULT_PORTAL_CONTENT.branding, ...(parsed.branding || {}) },
          hero: { ...DEFAULT_PORTAL_CONTENT.hero, ...(parsed.hero || {}) },
          notice: { ...DEFAULT_PORTAL_CONTENT.notice, ...(parsed.notice || {}) },
        };
      } catch {}
    }
    return this.content;
  }

  private async snapshotVersion(label: string, createdBy?: string) {
    // Keep the last 30 snapshots; best-effort — versioning must never block CMS saves.
    try {
      const store = await this.prisma.portalContentStore.findUnique({ where: { id: 'portal-root' } });
      const contentJson = store?.contentJson || JSON.stringify(this.content);
      await (this.prisma as any).portalContentVersion.create({
        data: { label, contentJson, createdBy: createdBy || null },
      }).catch(() => null);
      const old = await (this.prisma as any).portalContentVersion.findMany({
        orderBy: { createdAt: 'desc' },
        skip: 30,
        select: { id: true },
      }).catch(() => []);
      if (Array.isArray(old) && old.length > 0) {
        await (this.prisma as any).portalContentVersion.deleteMany({
          where: { id: { in: old.map((o: { id: string }) => o.id) } },
        }).catch(() => null);
      }
    } catch {
      // ignore
    }
  }

  async listVersions() {
    const rows = await (this.prisma as any).portalContentVersion.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, label: true, createdBy: true, createdAt: true },
    }).catch(() => []);
    return Array.isArray(rows) ? rows : [];
  }

  async restoreVersion(id: string) {
    const row = await (this.prisma as any).portalContentVersion.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`CMS version ${id} not found`);
    await this.snapshotVersion('auto: before restore');
    try {
      this.content = JSON.parse(row.contentJson);
    } catch {
      throw new NotFoundException(`CMS version ${id} is corrupted`);
    }
    await this.persistToDb();
    return this.content;
  }

  async updateContent(update: Partial<PortalContentTreeDto>): Promise<PortalContentTreeDto> {
    await this.snapshotVersion('PUT /portal-content');
    this.content = {
      ...this.content,
      ...update,
      branding: { ...this.content.branding, ...(update.branding || {}) },
      hero: { ...this.content.hero, ...(update.hero || {}) },
      programs: update.programs || this.content.programs,
      faculty: update.faculty || this.content.faculty,
      performances: update.performances || this.content.performances,
      notice: { ...this.content.notice, ...(update.notice || {}) },
      lastUpdated: new Date().toISOString(),
    };
    await this.persistToDb();
    return this.content;
  }

  async updateHero(heroDto: Partial<HeroContentDto>): Promise<HeroContentDto> {
    await this.snapshotVersion('PATCH /portal-content/hero');
    this.content.hero = { ...this.content.hero, ...heroDto };
    await this.persistToDb();
    return this.content.hero;
  }

  async updateBranding(brandingDto: Partial<AcademyBrandingDto>): Promise<AcademyBrandingDto> {
    await this.snapshotVersion('PATCH /portal-content/branding');
    this.content.branding = { ...this.content.branding, ...brandingDto };
    await this.persistToDb();
    return this.content.branding;
  }

  async updateNotice(noticeDto: Partial<PortalNoticeDto>): Promise<PortalNoticeDto> {
    await this.snapshotVersion('PATCH /portal-content/notice');
    this.content.notice = { ...this.content.notice, ...noticeDto };
    await this.persistToDb();
    return this.content.notice;
  }

  async saveProgram(program: ProgramContentDto): Promise<ProgramContentDto> {
    await this.snapshotVersion('POST /portal-content/programs');
    const idx = this.content.programs.findIndex((p) => p.id === program.id || p.key === program.key);
    if (idx >= 0) {
      this.content.programs[idx] = { ...this.content.programs[idx], ...program };
    } else {
      this.content.programs.push(program);
    }
    await this.persistToDb();
    return program;
  }

  async saveFaculty(member: FacultyMemberDto): Promise<FacultyMemberDto> {
    await this.snapshotVersion('POST /portal-content/faculty');
    if (!member.id) {
      member.id = `FAC-${Date.now().toString(36).toUpperCase()}`;
    }
    const idx = this.content.faculty.findIndex((f) => f.id === member.id);
    if (idx >= 0) {
      this.content.faculty[idx] = { ...this.content.faculty[idx], ...member };
    } else {
      this.content.faculty.push(member);
    }
    await this.persistToDb();
    return member;
  }

  async deleteFaculty(id: string): Promise<boolean> {
    await this.snapshotVersion(`DELETE /portal-content/faculty/${id}`);
    const initialLen = this.content.faculty.length;
    this.content.faculty = this.content.faculty.filter((f) => f.id !== id);
    if (this.content.faculty.length === initialLen) {
      throw new NotFoundException(`Faculty member with ID ${id} not found`);
    }
    await this.persistToDb();
    return true;
  }

  async savePerformance(event: PerformanceEventDto): Promise<PerformanceEventDto> {
    await this.snapshotVersion('POST /portal-content/performances');
    if (!event.id) {
      event.id = `PERF-${Date.now().toString(36).toUpperCase()}`;
    }
    const idx = this.content.performances.findIndex((p) => p.id === event.id);
    if (idx >= 0) {
      this.content.performances[idx] = { ...this.content.performances[idx], ...event };
    } else {
      this.content.performances.push(event);
    }
    await this.persistToDb();
    return event;
  }

  async deletePerformance(id: string): Promise<boolean> {
    await this.snapshotVersion(`DELETE /portal-content/performances/${id}`);
    const initialLen = this.content.performances.length;
    this.content.performances = this.content.performances.filter((p) => p.id !== id);
    if (this.content.performances.length === initialLen) {
      throw new NotFoundException(`Performance event with ID ${id} not found`);
    }
    await this.persistToDb();
    return true;
  }

  async resetToDefaults(): Promise<PortalContentTreeDto> {
    await this.snapshotVersion('POST /portal-content/reset');
    this.content = JSON.parse(JSON.stringify(DEFAULT_PORTAL_CONTENT));
    await this.persistToDb();
    return this.content;
  }
}
