import { Controller, Get } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AppService } from '../app.service';

@Controller()
@Throttle(2, 10)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async test() {
    return await this.appService.success();
  }

  @Get('ignored')
  @SkipThrottle()
  async ignored() {
    return await this.appService.ignored();
  }

  @Get('ignore-user-agents')
  async ignoreUserAgents() {
    return await this.appService.ignored();
  }
}
