// Shared TypeScript types for the frontend, aligned with the Node backend models.

export type Role = 'ADMIN' | 'PET_OWNER' | 'VET' | 'NGO' | 'PUBLIC_USER' | 'FARMER';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  birthdate?: string | null;
}

// Pets & medical records
export interface Pet {
  id: number;
  name: string;
  breed: string;
  age: number;
  birthdate?: string | null;
  // URL path served by the Node backend (e.g. /uploads/xyz.jpg)
  photoUrl: string | null;
}

export interface MedicalRecord {
  id: number;
  petId: number;
  vaccinations: string[];
  treatments: string[];
  healthLogs: string[];
}

// Stray reports
export type ReportStatus = 'REPORTED' | 'VERIFIED' | 'RESCUED' | 'RESOLVED';
export type NgoReportStatus = 'PENDING' | 'RESCUED' | 'HOUSED' | 'RESOLVED';
export type VetReportStatus = 'PENDING' | 'FIRST_AID_PROVIDED' | 'HOUSED_AT_VET' | 'RESOLVED';

export interface StrayReport {
  id: number;
  location: string;
  description: string;
  photoUrl: string | null;
  status: ReportStatus;
  ngoStatus?: NgoReportStatus;
  vetStatus?: VetReportStatus;
  sharedVetBaseLocation?: {
    responderId: string;
    responderName?: string | null;
    latitude: number;
    longitude: number;
  } | null;
  sharedNgoBaseLocation?: {
    responderId: string;
    responderName?: string | null;
    latitude: number;
    longitude: number;
  } | null;
  createdAt: string;
  reporterName?: string;
}

// Shop / e-commerce
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
}

export type OrderStatus = 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderProduct {
  id: number;
  name: string;
  description: string;
  price: number;
}

export interface Order {
  id: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  products: OrderProduct[];
}

// Adoptions
export type AdoptionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface AdoptionRecord {
  id: number;
  petId: number;
  applicantId?: string;
  status: AdoptionStatus;
  createdAt?: string;
  pet?: Pet;
  applicant?: UserProfile;
}

