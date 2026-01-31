
export enum UserRole {
  ADMIN = 'ADMIN',
  TECHNICIAN = 'TECHNICIAN',
  VIEWER = 'VIEWER'
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  active: boolean;
  password?: string;
  mustChangePassword?: boolean;
  suspended?: boolean;
  sendCredentials?: boolean;
}

export enum TagColor {
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  WHITE = 'WHITE',
  RED = 'RED'
}

export type RemovalReason = 'TIME' | 'FAILURE' | 'CONDITION' | 'STORAGE' | 'TROUBLESHOOTING' | 'ASSISTANCE' | 'OTHER';

export type MovementEventType = 'CREATION' | 'LOCATION_CHANGE' | 'STATUS_CHANGE' | 'DATA_UPDATE';

export interface MovementEvent {
  id: string;
  timestamp: string;
  type: MovementEventType;
  description: string;
  previousLocation?: string;
  newLocation: string;
  userId: string;
  userName: string;
}

export interface AviationPart {
  id: string;
  tagColor: TagColor;
  partName: string;
  brand: string;
  model: string;
  pn: string;
  sn: string;
  ttTat: string;
  tso: string;
  trem: string;
  tc: string;
  cso: string;
  crem: string;
  registrationDate: string;
  location: string;
  photo?: string;

  // Contact Info (Company/Workshop Context)
  organization?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;

  // Validation
  technicianName: string;
  technicianLicense: string;
  technicianSignature?: string;
  technicianSignatureMetadata?: any;
  inspectorName: string;
  inspectorLicense: string;
  inspectorSignature?: string;
  inspectorSignatureMetadata?: any;
  signedByTechnician: boolean;
  signedByInspector: boolean;

  // Specific attributes
  shelfLife?: string; // Yellow & White
  removalReason?: RemovalReason; // Green / White
  technicalReport?: string; // Green
  removedFromAC?: string; // Green / White / Red
  position?: string; // Green / White
  physicalStorageLocation?: string; // White
  rejectionReason?: string; // Red
  finalDisposition?: string; // Red
  observations?: string;

  // History
  history: MovementEvent[];
}

export type Language = 'ES' | 'EN';