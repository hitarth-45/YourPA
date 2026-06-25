export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface Subtask {
  id: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  userPriority: Priority; // User chosen priority
  deadline: string; // ISO String or Date
  createdAt: string;
  completed: boolean;
  actualDurationMinutes?: number; // Logged when completed

  // AI predicted info
  aiBenchmarkMinutes?: number; // AI completion time (e.g. 2 mins)
  humanEstimatedMinutes?: number; // Predicted human completion time (e.g. 120 mins)
  proactiveBufferMinutes?: number; // Safety buffer
  urgencyScore?: number; // Calculated dynamic urgency 1-100
  subtasks?: Subtask[];
  schedulingAdvice?: string;
  category?: string; // 'assignment', 'bill', 'meeting', 'custom', etc.
  startByTime?: string; // Calculated time user must start (ISO string)
}

export interface Habit {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  lastCompleted?: string; // YYYY-MM-DD
  category: string;
}

export interface HistoryLog {
  id: string;
  taskId: string;
  taskTitle: string;
  predictedMinutes: number;
  actualMinutes: number;
  completedAt: string;
  efficiencyIndex: number; // predicted / actual
}

export interface AIAnalysisResponse {
  priority: Priority;
  aiBenchmarkMinutes: number;
  humanEstimatedMinutes: number;
  proactiveBufferMinutes: number;
  category: string;
  schedulingAdvice: string;
  subtasks: { title: string; estimatedMinutes: number }[];
}

export interface VoiceExtractionResponse {
  title: string;
  description: string;
  priority: Priority;
  rawDeadline: string; // E.g., "tomorrow at 5 PM" or formatted date
  estimatedCategory: string;
}
