import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { TimeseriesQueryDto } from './dto/timeseries-query.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('stats/timeseries')
  timeseries(@Query() query: TimeseriesQueryDto) {
    return this.admin.timeseries(query.metric, query.granularity ?? 'day', query.count ?? 14);
  }

  @Get('reports')
  listReports() {
    return this.admin.listReports();
  }

  @Patch('reports/:id')
  resolveReport(@CurrentUser() adminId: string, @Param('id') id: string, @Body() dto: ResolveReportDto) {
    return this.admin.resolveReport(id, adminId, dto.status, dto.resolutionNote);
  }

  @Patch('comments/:id/hide')
  hideComment(@Param('id') id: string) {
    return this.admin.hideComment(id);
  }

  @Get('users')
  listUsers() {
    return this.admin.listUsers();
  }

  @Patch('users/:id/ban')
  banUser(@Param('id') id: string) {
    return this.admin.setUserBanned(id, true);
  }

  @Patch('users/:id/unban')
  unbanUser(@Param('id') id: string) {
    return this.admin.setUserBanned(id, false);
  }
}
