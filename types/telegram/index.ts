// Telegram Bot Types

export interface TelegramTopic {
  id: number;
  name: string;
  icon: string;
  reports: ('morning' | 'evening' | 'realtime')[];
  description?: string;
}

export interface ConversationContext {
  userId: string;
  chatId: string;
  history: ConversationMessage[];
  data?: DashboardContextData;
  lastActivity: Date;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface DashboardContextData {
  trips?: {
    total: number;
    byStatus: Record<string, number>;
  };
  fuel?: {
    current: number;
    percentage: number;
    capacity: number;
  };
  revenue?: {
    today: number;
    monthly: number;
  };
}

export interface Intent {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
}

export interface BotResponse {
  text: string;
  keyboard?: any;
  photo?: string;
  document?: {
    filename: string;
    buffer: Buffer;
  };
}

export interface ScheduledReport {
  topicId: number;
  reportType: 'morning' | 'evening';
  schedule: string; // Cron expression
}

export interface AlertRule {
  name: string;
  topicId: number;
  condition: (data: any) => boolean;
  message: (data: any) => string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}
