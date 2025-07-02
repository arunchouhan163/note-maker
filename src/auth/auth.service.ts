import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserModel, User } from '../user/user.model';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ access_token: string; user: any }> {
    const { email, password } = registerDto;

    console.log(`Registration attempt for email: ${email}`);

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log(`Password hashed successfully`);

    // Create user
    const user = new UserModel({
      email,
      password: hashedPassword,
    });

    await user.save();
    console.log(`User saved successfully with ID: ${user._id}`);

    // Generate JWT token
    const payload = { email: user.email, sub: user._id };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: { id: user._id, email: user.email },
    };
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string; user: any }> {
    const { email, password } = loginDto;

    console.log(`Login attempt for email: ${email}`);

    // Find user
    const user = await UserModel.findOne({ email });
    console.log(`User found:`, user ? 'Yes' : 'No');
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log(`Comparing password with hash...`);
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`Password valid:`, isPasswordValid);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { email: user.email, sub: user._id };
    const access_token = this.jwtService.sign(payload);

    console.log(`Login successful for: ${email}`);
    return {
      access_token,
      user: { id: user._id, email: user.email },
    };
  }

  async getProfile(userId: string): Promise<any> {
    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { id: user._id, email: user.email };
  }

  async validateUser(payload: any): Promise<any> {
    const user = await UserModel.findById(payload.sub).select('-password');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async testDatabaseConnection(): Promise<any> {
    try {
      // Test if we can connect to the database and count users
      const userCount = await UserModel.countDocuments();
      const allUsers = await UserModel.find().select('email createdAt').limit(5);
      return {
        connected: true,
        userCount,
        sampleUsers: allUsers.map(user => ({ email: user.email, createdAt: user.createdAt }))
      };
    } catch (error) {
      console.error('Database connection test failed:', error);
      throw error;
    }
  }
} 