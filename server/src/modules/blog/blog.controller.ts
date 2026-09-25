import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Header } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('blog')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get()
  list(@Query() q: any) {
    return this.blog.list(q);
  }

  @Header('Content-Type', 'application/xml')
  @Get('sitemap.xml')
  sitemap() {
    return this.blog.sitemap();
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.blog.getBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post()
  create(@Body() dto: CreateBlogPostDto) {
    return this.blog.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.blog.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.blog.publish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner', 'receptionist')
  @Delete(':id')
  remove(@Param('id') id: string, @Query('hard') hard?: string) {
    return this.blog.remove(id, hard as any);
  }
}
