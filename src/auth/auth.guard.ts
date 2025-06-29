import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';

@Injectable()
export class AuthGuard extends NestAuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Add custom logic if needed
    return super.canActivate(context);
  }
} 