export interface AdminVerifiedEmail {
  email: string;
  verified: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  name: string | null;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  verified_emails: AdminVerifiedEmail[];
}

export interface CurrentUser {
  id: number;
  username: string;
  name: string | null;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}
