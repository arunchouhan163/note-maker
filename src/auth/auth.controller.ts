import { Controller, Post, Get, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);
    try {
      const result = await this.authService.register(registerDto);
      this.logger.log(`User registered successfully: ${registerDto.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Registration failed for ${registerDto.email}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    try {
      const result = await this.authService.login(loginDto);
      this.logger.log(`User logged in successfully: ${loginDto.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Login failed for ${loginDto.email}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    this.logger.log(`Profile requested for user: ${req.user.userId}`);
    return this.authService.getProfile(req.user.userId);
  }

  @Get('test-db')
  async testDatabase() {
    this.logger.log('Testing database connection...');
    try {
      const testResult = await this.authService.testDatabaseConnection();
      return { success: true, message: 'Database connection working', result: testResult };
    } catch (error) {
      this.logger.error('Database test failed:', error);
      return { success: false, message: 'Database connection failed', error: error instanceof Error ? error.message : String(error) };
    }
  }
} 