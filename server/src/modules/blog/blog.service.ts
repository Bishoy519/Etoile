import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 80) || `post-${Date.now().toString(36)}`;
}
function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: any) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '12', 10)));
    const where: any = {};
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    } else if (query.status !== 'all' && query.all !== 'true' && query.all !== true) {
      where.status = 'published';
    }
    if (query.category && query.category !== 'all') where.category = query.category;
    if (query.search) {
      const s = String(query.search);
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { titleAr: { contains: s } },
        { excerpt: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (query.tag) where.tags = { has: String(query.tag) };
    const [total, items] = await Promise.all([
      (this.prisma as any).blogPost.count({ where }),
      (this.prisma as any).blogPost.findMany({ where, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getBySlug(slug: string) {
    const post = await (this.prisma as any).blogPost.findFirst({
      where: { OR: [{ slug }, { slugAr: slug }] },
    });
    if (!post || post.status !== 'published') throw new NotFoundException('Post not found');
    await (this.prisma as any).blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(() => null);
    const related = await (this.prisma as any).blogPost.findMany({
      where: { status: 'published', category: post.category, id: { not: post.id } },
      orderBy: { publishedAt: 'desc' },
      take: 3,
    });
    return { post: { ...post, views: post.views + 1 }, related };
  }

  async create(data: any) {
    const slug = data.slug?.trim() || slugify(data.title || 'post');
    const exists = await (this.prisma as any).blogPost.findUnique({ where: { slug } }).catch(() => null);
    if (exists) throw new BadRequestException('Slug already exists');
    const status = data.status || 'draft';
    const gallery = Array.isArray(data.galleryImages)
      ? data.galleryImages.filter(Boolean)
      : typeof data.galleryImages === 'string'
      ? data.galleryImages.split('\n').map((s: string) => s.trim()).filter(Boolean)
      : [];
    const tags = Array.isArray(data.tags)
      ? data.tags.filter(Boolean)
      : typeof data.tags === 'string'
      ? data.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    return (this.prisma as any).blogPost.create({
      data: {
        slug,
        slugAr: data.slugAr || null,
        title: data.title,
        titleAr: data.titleAr,
        excerpt: data.excerpt,
        excerptAr: data.excerptAr,
        content: data.content,
        contentAr: data.contentAr,
        coverImageUrl: data.coverImageUrl || null,
        videoUrl: data.videoUrl || null,
        videoEmbedCode: data.videoEmbedCode || null,
        galleryImages: gallery,
        authorName: data.authorName || 'Étoile Editorial',
        authorNameAr: data.authorNameAr || null,
        tags,
        category: data.category || 'journal',
        status,
        featured: !!data.featured,
        readingMinutes: data.readingMinutes || readingTime(`${data.content || ''} ${data.contentAr || ''}`),
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        publishedAt: status === 'published' ? new Date() : null,
      },
    });
  }

  async update(id: string, data: any) {
    const existing = await (this.prisma as any).blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');
    if (data.slug && data.slug !== existing.slug) {
      const clash = await (this.prisma as any).blogPost.findUnique({ where: { slug: data.slug } }).catch(() => null);
      if (clash) throw new BadRequestException('Slug already exists — slugs are immutable after publish');
    }
    const patch: any = {};
    for (const k of [
      'slug', 'slugAr', 'title', 'titleAr', 'excerpt', 'excerptAr', 'content', 'contentAr',
      'coverImageUrl', 'videoUrl', 'videoEmbedCode', 'authorName', 'authorNameAr', 'category',
      'featured', 'readingMinutes', 'metaTitle', 'metaDescription',
    ]) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    if (data.galleryImages !== undefined) {
      patch.galleryImages = Array.isArray(data.galleryImages)
        ? data.galleryImages.filter(Boolean)
        : typeof data.galleryImages === 'string'
        ? data.galleryImages.split('\n').map((s: string) => s.trim()).filter(Boolean)
        : [];
    }
    if (data.tags !== undefined) {
      patch.tags = Array.isArray(data.tags)
        ? data.tags.filter(Boolean)
        : typeof data.tags === 'string'
        ? data.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
    }
    if (data.status) {
      patch.status = data.status;
      if (data.status === 'published' && !existing.publishedAt) patch.publishedAt = new Date();
    }
    return (this.prisma as any).blogPost.update({ where: { id }, data: patch });
  }

  async publish(id: string) {
    return (this.prisma as any).blogPost.update({ where: { id }, data: { status: 'published', publishedAt: new Date() } });
  }

  async remove(id: string, hard?: boolean | string) {
    if (hard === true || hard === 'true') return (this.prisma as any).blogPost.delete({ where: { id } });
    return (this.prisma as any).blogPost.update({ where: { id }, data: { status: 'archived' } });
  }

  async sitemap(): Promise<string> {
    const posts = await (this.prisma as any).blogPost.findMany({ where: { status: 'published' }, select: { slug: true, updatedAt: true } }).catch(() => []);
    const urls = posts.map((p: any) => `  <url><loc>/blog/${p.slug}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>/blog</loc></url>\n${urls}\n</urlset>`;
  }
}
