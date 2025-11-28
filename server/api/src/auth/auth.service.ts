import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  async register(dto: RegisterDto) {
    const { data, error } = await this.supabase.getClient().auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new UnauthorizedException('Email already exists');
      }
      throw new UnauthorizedException(error.message);
    }

    if (!data.session) {
      throw new UnauthorizedException('Registration failed');
    }

    return {
      access_token: data.session.access_token,
      user: data.user,
    };
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.getClient().auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!data.session) {
      throw new UnauthorizedException('Login failed');
    }

    return {
      access_token: data.session.access_token,
      user: data.user,
    };
  }
}
