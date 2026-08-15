export interface SavedAddress {
  id: string;
  label: string; // e.g., 'Home', 'Office', 'Gift for Mom'
  recipientName: string;
  phoneNumber: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'admin' | 'customer';
  addresses: SavedAddress[];
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  initialAddress?: Omit<SavedAddress, 'id'>;
}