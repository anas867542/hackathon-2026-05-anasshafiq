import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  submit(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviews.submit(user, dto);
  }

  /** Public-ish: returns reviews about a given user. */
  @Get()
  listForUser(
    @Query('userId') userId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.reviews.listForUser(userId, take ? +take : 20, skip ? +skip : 0);
  }

  /** Check if the calling user already reviewed a booking. */
  @Get('has-reviewed')
  hasReviewed(
    @CurrentUser() user: AuthUser,
    @Query('bookingId') bookingId: string,
  ) {
    return this.reviews.hasReviewed(user.id, bookingId).then((reviewed) => ({ reviewed }));
  }
}
