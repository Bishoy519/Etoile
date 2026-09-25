import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  PortalContentTreeDto,
  HeroContentDto,
  AcademyBrandingDto,
  ProgramContentDto,
  FacultyMemberDto,
  PerformanceEventDto,
  PortalNoticeDto,
} from './dto/portal-content.dto';

@Controller('portal-content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // Public endpoint for Academy landing page
  @Get()
  async getContent(): Promise<PortalContentTreeDto> {
    return this.contentService.getContent();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Put()
  async updateAllContent(@Body() body: Partial<PortalContentTreeDto>): Promise<PortalContentTreeDto> {
    return this.contentService.updateContent(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('hero')
  async updateHero(@Body() body: Partial<HeroContentDto>): Promise<HeroContentDto> {
    return this.contentService.updateHero(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('branding')
  async updateBranding(@Body() body: Partial<AcademyBrandingDto>): Promise<AcademyBrandingDto> {
    return this.contentService.updateBranding(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Patch('notice')
  async updateNotice(@Body() body: Partial<PortalNoticeDto>): Promise<PortalNoticeDto> {
    return this.contentService.updateNotice(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('programs')
  async saveProgram(@Body() body: ProgramContentDto): Promise<ProgramContentDto> {
    return this.contentService.saveProgram(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('faculty')
  async createFaculty(@Body() body: FacultyMemberDto): Promise<FacultyMemberDto> {
    return this.contentService.saveFaculty(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Put('faculty/:id')
  async updateFaculty(
    @Param('id') id: string,
    @Body() body: FacultyMemberDto,
  ): Promise<FacultyMemberDto> {
    return this.contentService.saveFaculty({ ...body, id });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Delete('faculty/:id')
  async deleteFaculty(@Param('id') id: string) {
    await this.contentService.deleteFaculty(id);
    return { success: true, message: `Faculty member ${id} deleted` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('performances')
  async createPerformance(@Body() body: PerformanceEventDto): Promise<PerformanceEventDto> {
    return this.contentService.savePerformance(eventSanitized(body));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Put('performances/:id')
  async updatePerformance(
    @Param('id') id: string,
    @Body() body: PerformanceEventDto,
  ): Promise<PerformanceEventDto> {
    return this.contentService.savePerformance({ ...body, id });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Delete('performances/:id')
  async deletePerformance(@Param('id') id: string) {
    await this.contentService.deletePerformance(id);
    return { success: true, message: `Performance ${id} deleted` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('reset')
  async resetDefaults(): Promise<PortalContentTreeDto> {
    return this.contentService.resetToDefaults();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Get('versions')
  async listVersions() {
    return this.contentService.listVersions();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'owner')
  @Post('versions/:id/restore')
  async restoreVersion(@Param('id') id: string): Promise<PortalContentTreeDto> {
    return this.contentService.restoreVersion(id);
  }
}

function eventSanitized(event: PerformanceEventDto): PerformanceEventDto {
  return {
    ...event,
    status: event.status || 'upcoming',
  };
}
