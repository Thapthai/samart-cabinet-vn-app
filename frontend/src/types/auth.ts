// Auth & User Types

export interface User {
  id: number;
  email: string;
  name: string;
  fname?: string;
  lname?: string;
  is_admin?: boolean;
  role_id?: number | null;
  role?: string | null;
  department_id?: number | null;
  client_id?: string;
  profile_image?: string;
  profile_picture?: string;
  twoFactorEnabled: boolean;
  preferredAuthMethod?: string; // 'jwt' | 'oauth2' | 'firebase' | 'api_key'
  hasPassword?: boolean; // true if user has password (for JWT users)
  createdAt?: string;
  updatedAt?: string;
  accessToken?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  accessToken?: string;
  tempToken?: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  profile_image?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

