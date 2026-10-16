export type UserRole = 'student' | 'cr' | 'teacher' | 'admin';

export type NoticeCategory =
  | 'General'
  | 'Examination'
  | 'Assignment'
  | 'Class Routine'
  | 'Department'
  | 'Event'
  | 'Emergency';

export type NoticeStatus = 'draft' | 'pending_approval' | 'published' | 'rejected' | 'archived';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string;
  designation?: string;
  officeRoom?: string;
  departmentCode: string;
  classCode: string;
  classMemberships: string[];
  assignedCourseIds: string[];
  canPublishDirectly: boolean;
  isActive: boolean;
}

export interface AISummary {
  mainAnnouncement: string;
  importantDateAndTime: string | null;
  requiredAction: string | null;
  relevantCourseOrClass: string;
  conditions: string[];
  language: 'en' | 'bn';
  generatedAt: string;
}

export interface ExtractedNoticeInfo {
  eventDates: Array<{ label: string; isoDate: string | null; rawText: string; isAmbiguous: boolean }>;
  deadlines: Array<{ task: string; dueAt: string | null; rawText: string; isAmbiguous: boolean }>;
  courseCodes: string[];
  examinationTypes: string[];
  requiredActions: string[];
  relevantAudience: string;
  validatedByHuman: boolean;
}

export interface NoticeItem {
  id: string;
  title: string;
  body: string;
  category: NoticeCategory;
  targetClassCodes: string[];
  targetCourseCodes: string[];
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  status: NoticeStatus;
  rejectionReason?: string;
  isPinned: boolean;
  publishedAt?: string;
  expiresAt?: string;
  eventDate?: string;
  attachments: Array<{ name: string; url: string; mimeType: string; sizeBytes: number }>;
  version: number;
  readCount: number;
  aiSummary?: { en?: AISummary; bn?: AISummary };
  aiSummaryVersion?: number;
  extractedInformation?: ExtractedNoticeInfo;
}
