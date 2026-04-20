export type UserRole = 'admin' | 'leader' | 'tech' | 'user';
export type TechnicalSkill = 'eletricista' | 'encanador' | 'hvac' | 'pintor' | 'pedreiro' | 'limpeza' | 'geral';

export interface NotificationPrefs {
  app: boolean;
  email: boolean;
  sms: boolean;
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  skills?: TechnicalSkill[];
  notificationPrefs?: NotificationPrefs;
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  skills: TechnicalSkill[];
  description?: string;
}

export interface Environment {
  id: string;
  name: string;
  building: string;
  floor: string;
  description?: string;
  assets?: string[]; // IDs of inventory items associated with this environment
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  unitCost?: number;
}

export interface FixedAsset {
  id: string;
  tagCode: string; // Código da placa / Patrimônio
  name: string;
  category: string;
  environmentId: string;
  status: 'operational' | 'maintenance' | 'broken' | 'disposed';
  acquisitionDate: string;
  description?: string;
  imageUrl?: string;
  manualUrl?: string;
}

export type TicketType = 'corrective' | 'preventive';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  environmentId: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: string;
  assignedToId?: string;
  assignedTeamId?: string;
  createdAt: string;
  updatedAt: string;
  completionDate?: string;
  requiredSkill?: TechnicalSkill;
  cost?: number;
  imageUrl?: string;
  assetId?: string;
  beforeImages?: string[];
  afterImages?: string[];
  signatureUrl?: string;
  usedItems?: { itemId: string; name: string; quantity: number; cost: number }[];
  completionNote?: string;
}

export interface PreventiveSchedule {
  id: string;
  assetId?: string;
  environmentId: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  lastRun?: string;
  nextRun: string;
  priority: TicketPriority;
  isActive: boolean;
}

export interface MaintenanceLog {
  id: string;
  ticketId: string;
  technicianId: string;
  message: string;
  timestamp: string;
}

export interface AppSettings {
  companyName: string;
  companyLogo?: string;
  primaryColor?: string;
  accentColor?: string;
  supportEmail?: string;
  allowSelfRegistration: boolean;
}
