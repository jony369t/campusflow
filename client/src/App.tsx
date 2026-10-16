import React, { useState, useMemo } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Moon,
  Pin,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  User,
  Users,
  X,
  AlertTriangle,
  ChevronRight,
  Languages,
  ExternalLink,
  Edit3,
  Eye,
  CheckCircle2,
} from 'lucide-react';

// ============================================================================
// Types & Domain Models (2-Role Architecture: Class Representative & Student)
// ============================================================================

type UserRole = 'cr' | 'student';

type NoticeCategory =
  | 'General'
  | 'Examination'
  | 'Assignment'
  | 'Class Routine'
  | 'Department'
  | 'Event'
  | 'Emergency';

type NoticeStatus = 'draft' | 'published' | 'archived';

type DayOfWeek =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

type AcademicEventType =
  | 'CT Examination'
  | 'Midterm Examination'
  | 'Final Examination'
  | 'Assignment Deadline'
  | 'Presentation'
  | 'Lab Assessment'
  | 'University Event'
  | 'Holiday';

interface UserAccount {
  id: string;
  name: string;
  email: string;
  studentId: string;
  designation?: string;
  role: UserRole;
  departmentCode: string;
  classMemberships: string[];
   enrolledCourseCodes: string[];
  isActive: boolean;
}

interface CourseInstructorRecord {
  id: string;
  name: string;
  designation: string;
  departmentCode: string;
  assignedCourseCodes: string[];
  officeRoom: string;
  email: string;
  publicContactApproved: boolean;
}

interface AISummaryRecord {
  mainAnnouncement: string;
  importantDateAndTime: string | null;
  requiredAction: string | null;
  relevantCourseOrClass: string;
  conditions: string[];
  language: 'en' | 'bn';
  generatedAt: string;
}

interface ExtractedNoticeInfo {
  eventDates: Array<{ label: string; isoDate: string | null; rawText: string; isAmbiguous: boolean }>;
  deadlines: Array<{ task: string; dueAt: string | null; rawText: string; isAmbiguous: boolean }>;
  courseCodes: string[];
  examinationTypes: string[];
  requiredActions: string[];
  relevantAudience: string;
  validatedByCR: boolean;
}

interface NoticeRecord {
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
  isPinned: boolean;
  publishedAt?: string;
  expiresAt?: string;
  eventDate?: string;
  attachments: Array<{ name: string; url: string; mimeType: string; sizeBytes: number }>;
  version: number;
  readCount: number;
  aiSummary?: {
    en?: AISummaryRecord;
    bn?: AISummaryRecord;
  };
  aiSummaryVersion?: number;
  extractedInformation?: ExtractedNoticeInfo;
}

interface RoutineSlot {
  id: string;
  classCode: string;
  courseCode: string;
  courseTitle: string;
  instructorName: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string;
  recurrence: 'weekly' | 'biweekly' | 'makeup';
  status: 'published' | 'cancelled';
  changeNote?: string;
}

interface AcademicEventRecord {
  id: string;
  title: string;
  description: string;
  type: AcademicEventType;
  classCodes: string[];
  courseCode?: string;
  location: string;
  startAt: string;
  endAt?: string;
  createdBy: string;
  createdByName: string;
  hasConflictFlag: boolean;
  conflictReason?: string;
  sourceNoticeId?: string;
}

interface NotificationItem {
  id: string;
  userId: string;
  noticeId?: string;
  eventId?: string;
  dedupeKey: string;
  type:
    | 'NEW_NOTICE'
    | 'PINNED_ANNOUNCEMENT'
    | 'ROUTINE_CHANGE'
    | 'UPCOMING_EXAM'
    | 'ASSIGNMENT_DEADLINE'
    | 'ACADEMIC_EVENT';
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  resourceType: 'notice' | 'routine' | 'event' | 'user' | 'auth' | 'ai';
  resourceId: string;
  timestamp: string;
  details: string;
}

// ============================================================================
// Seeded University Data (CR-Managed CSE 60E System)
// ============================================================================

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-cr-1',
    name: 'Rafsan Jani',
    email: 'rafsan.cr60e@univ.edu.bd',
    studentId: '231-115-182',
    designation: 'Class Representative (CR) — CSE 60E System Manager',
    role: 'cr',
    departmentCode: 'CSE',
    classMemberships: ['CSE-60E'],
    enrolledCourseCodes: ['CSE-321', 'CSE-323', 'CSE-325', 'CSE-327'],
    isActive: true,
  },
  {
    id: 'usr-student-1',
    name: 'Tasnia Kabir',
    email: 'tasnia.60e@univ.edu.bd',
    studentId: '231-115-194',
    designation: 'Student — CSE 60E',
    role: 'student',
    departmentCode: 'CSE',
    classMemberships: ['CSE-60E'],
    enrolledCourseCodes: ['CSE-321', 'CSE-323', 'CSE-325', 'CSE-327'],
    isActive: true,
  },
  {
    id: 'usr-student-2',
    name: 'Mehedi Hasan',
    email: 'mehedi.60e@univ.edu.bd',
    studentId: '231-115-201',
    designation: 'Student — CSE 60E',
    role: 'student',
    departmentCode: 'CSE',
    classMemberships: ['CSE-60E'],
    enrolledCourseCodes: ['CSE-321', 'CSE-323', 'CSE-325', 'CSE-327'],
    isActive: true,
  },
  {
    id: 'usr-student-3',
    name: 'Sadia Afrin',
    email: 'sadia.60e@univ.edu.bd',
    studentId: '231-115-209',
    designation: 'Student — CSE 60E',
    role: 'student',
    departmentCode: 'CSE',
    classMemberships: ['CSE-60E'],
    enrolledCourseCodes: ['CSE-321', 'CSE-323', 'CSE-325', 'CSE-327'],
    isActive: true,
  },
];

const INITIAL_INSTRUCTORS: CourseInstructorRecord[] = [
  {
    id: 'inst-1',
    name: 'Dr. Farhana Rahman',
    designation: 'Associate Professor',
    departmentCode: 'CSE',
    assignedCourseCodes: ['CSE-321', 'CSE-325'],
    officeRoom: 'Academic Building B, Room 404',
    email: 'farhana.cse@univ.edu.bd',
    publicContactApproved: true,
  },
  {
    id: 'inst-2',
    name: 'Prof. Tanvir Ahmed',
    designation: 'Professor & Lab Coordinator',
    departmentCode: 'CSE',
    assignedCourseCodes: ['CSE-323'],
    officeRoom: 'Academic Building B, Room 512',
    email: 'tanvir.cse@univ.edu.bd',
    publicContactApproved: true,
  },
  {
    id: 'inst-3',
    name: 'Nusrat Jahan',
    designation: 'Senior Lecturer',
    departmentCode: 'CSE',
    assignedCourseCodes: ['CSE-327'],
    officeRoom: 'Academic Building B, Room 309',
    email: 'nusrat.cse@univ.edu.bd',
    publicContactApproved: false,
  },
];

const INITIAL_NOTICES: NoticeRecord[] = [
  {
    id: 'ntc-101',
    title: 'CSE-321 Class Test 2 (CT-2) Syllabus & Seating Plan for CSE 60E',
    body: 'Class Test 2 for CSE-321 (Operating Systems & System Programming) will be held on Wednesday, October 21, 2026 from 10:30 AM to 11:20 AM BST in Room AB-402. Syllabus includes Deadlock Prevention, Banker Algorithm, Paging, and Virtual Memory Page Replacement Policies. Students must bring their university ID card and a non-programmable scientific calculator. No makeup CT will be arranged without prior medical approval.',
    category: 'Examination',
    targetClassCodes: ['CSE-60E'],
    targetCourseCodes: ['CSE-321'],
    authorId: 'usr-cr-1',
    authorName: 'Rafsan Jani (CR)',
    authorRole: 'cr',
    status: 'published',
    isPinned: true,
    publishedAt: '2026-10-15T09:00:00+06:00',
    eventDate: '2026-10-21T10:30:00+06:00',
    attachments: [
      {
        name: 'CSE321_CT2_Syllabus_Seating.pdf',
        url: 'https://campusflow.univ.edu.bd/files/CSE321_CT2_Syllabus_Seating.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 245120,
      },
    ],
    version: 1,
    readCount: 42,
  },
  {
    id: 'ntc-102',
    title: 'CSE-325 AI Term Project Proposal & GitHub Repository Submission Deadline',
    body: 'All project groups of CSE 60E must submit their CSE-325 (Artificial Intelligence & Machine Learning) Term Project Proposal PDF and GitHub repository URL by Sunday, October 25, 2026 at 11:59 PM BST. Each group must comprise 3 to 4 students enrolled in CSE 60E. Late submissions will incur a 15% mark deduction per day.',
    category: 'Assignment',
    targetClassCodes: ['CSE-60E'],
    targetCourseCodes: ['CSE-325'],
    authorId: 'usr-cr-1',
    authorName: 'Rafsan Jani (CR)',
    authorRole: 'cr',
    status: 'published',
    isPinned: true,
    publishedAt: '2026-10-14T14:30:00+06:00',
    eventDate: '2026-10-25T23:59:00+06:00',
    attachments: [],
    version: 1,
    readCount: 39,
  },
  {
    id: 'ntc-103',
    title: 'Thursday CSE-323 Lab Room Rescheduled to Networking Lab 2 (AB-305)',
    body: 'Please note that the CSE-323 Computer Networks Lab session for CSE 60E scheduled on Thursdays from 02:00 PM to 04:30 PM BST has been moved from Room AB-301 to Networking Lab 2 (Room AB-305) effective October 22, 2026 due to Cisco router rack upgrades.',
    category: 'Class Routine',
    targetClassCodes: ['CSE-60E'],
    targetCourseCodes: ['CSE-323'],
    authorId: 'usr-cr-1',
    authorName: 'Rafsan Jani (CR)',
    authorRole: 'cr',
    status: 'published',
    isPinned: false,
    publishedAt: '2026-10-16T08:15:00+06:00',
    attachments: [],
    version: 1,
    readCount: 31,
  },
  {
    id: 'ntc-104',
    title: 'Emergency Power Maintenance Notice for Academic Building B (Oct 18)',
    body: 'Due to high-voltage transformer maintenance, backup generator testing will take place in Academic Building B on Sunday, October 18, 2026 between 01:00 PM and 02:00 PM BST. All afternoon lab groups should save work before 12:50 PM.',
    category: 'Emergency',
    targetClassCodes: ['CSE-60E'],
    targetCourseCodes: [],
    authorId: 'usr-cr-1',
    authorName: 'Rafsan Jani (CR)',
    authorRole: 'cr',
    status: 'published',
    isPinned: false,
    publishedAt: '2026-10-16T11:00:00+06:00',
    eventDate: '2026-10-18T13:00:00+06:00',
    attachments: [],
    version: 1,
    readCount: 54,
  },
  {
    id: 'ntc-105',
    title: 'CSE-327 Software Engineering Sprint-1 Architecture Review Slot Sign-Up (Draft)',
    body: 'Draft group presentation slots for CSE-327 Sprint-1 Architecture Review on Tuesday, October 27, 2026 in Room AB-402. Each team gets 12 minutes for UML and API walkthrough.',
    category: 'Event',
    targetClassCodes: ['CSE-60E'],
    targetCourseCodes: ['CSE-327'],
    authorId: 'usr-cr-1',
    authorName: 'Rafsan Jani (CR)',
    authorRole: 'cr',
    status: 'draft',
    isPinned: false,
    eventDate: '2026-10-27T11:00:00+06:00',
    attachments: [],
    version: 1,
    readCount: 4,
  },
];

const INITIAL_ROUTINE: RoutineSlot[] = [
  {
    id: 'rtn-1',
    classCode: 'CSE-60E',
    courseCode: 'CSE-321',
    courseTitle: 'Operating Systems & System Programming',
    instructorName: 'Dr. Farhana Rahman',
    dayOfWeek: 'Sunday',
    startTime: '09:00',
    endTime: '10:20',
    room: 'AB-402',
    recurrence: 'weekly',
    status: 'published',
  },
  {
    id: 'rtn-2',
    classCode: 'CSE-60E',
    courseCode: 'CSE-323',
    courseTitle: 'Computer Networks & Distributed Security',
    instructorName: 'Prof. Tanvir Ahmed',
    dayOfWeek: 'Sunday',
    startTime: '10:30',
    endTime: '11:50',
    room: 'AB-402',
    recurrence: 'weekly',
    status: 'published',
  },
  {
    id: 'rtn-3',
    classCode: 'CSE-60E',
    courseCode: 'CSE-325',
    courseTitle: 'Artificial Intelligence & Machine Learning',
    instructorName: 'Dr. Farhana Rahman',
    dayOfWeek: 'Monday',
    startTime: '09:00',
    endTime: '10:20',
    room: 'AB-405',
    recurrence: 'weekly',
    status: 'published',
  },
  {
    id: 'rtn-4',
    classCode: 'CSE-60E',
    courseCode: 'CSE-327',
    courseTitle: 'Software Engineering & System Architecture',
    instructorName: 'Nusrat Jahan',
    dayOfWeek: 'Tuesday',
    startTime: '11:00',
    endTime: '12:20',
    room: 'AB-402',
    recurrence: 'weekly',
    status: 'published',
  },
  {
    id: 'rtn-5',
    classCode: 'CSE-60E',
    courseCode: 'CSE-321',
    courseTitle: 'Operating Systems & System Programming',
    instructorName: 'Dr. Farhana Rahman',
    dayOfWeek: 'Wednesday',
    startTime: '10:30',
    endTime: '11:50',
    room: 'AB-402',
    recurrence: 'weekly',
    status: 'published',
  },
  {
    id: 'rtn-6',
    classCode: 'CSE-60E',
    courseCode: 'CSE-323',
    courseTitle: 'Computer Networks Lab (Sessional)',
    instructorName: 'Prof. Tanvir Ahmed',
    dayOfWeek: 'Thursday',
    startTime: '14:00',
    endTime: '16:30',
    room: 'AB-305 (Networking Lab 2)',
    recurrence: 'weekly',
    status: 'published',
    changeNote: 'Relocated from AB-301 to AB-305 effective Oct 22',
  },
];

const INITIAL_EVENTS: AcademicEventRecord[] = [
  {
    id: 'evt-1',
    title: 'CSE-321 Class Test 2 (Operating Systems)',
    description: 'Covers Deadlock, Banker Algorithm, Paging & Virtual Memory in Room AB-402.',
    type: 'CT Examination',
    classCodes: ['CSE-60E'],
    courseCode: 'CSE-321',
    location: 'Room AB-402',
    startAt: '2026-10-21T10:30:00+06:00',
    endAt: '2026-10-21T11:20:00+06:00',
    createdBy: 'usr-cr-1',
    createdByName: 'Rafsan Jani (CR)',
    hasConflictFlag: false,
    sourceNoticeId: 'ntc-101',
  },
  {
    id: 'evt-2',
    title: 'CSE-325 AI Project Proposal & Repo Deadline',
    description: 'Submit PDF proposal and GitHub repository link via portal.',
    type: 'Assignment Deadline',
    classCodes: ['CSE-60E'],
    courseCode: 'CSE-325',
    location: 'Online Submission Portal',
    startAt: '2026-10-25T23:59:00+06:00',
    createdBy: 'usr-cr-1',
    createdByName: 'Rafsan Jani (CR)',
    hasConflictFlag: false,
    sourceNoticeId: 'ntc-102',
  },
  {
    id: 'evt-3',
    title: 'CSE-327 Sprint-1 Architecture Presentation',
    description: '12-minute team presentation on system architecture and database schema.',
    type: 'Presentation',
    classCodes: ['CSE-60E'],
    courseCode: 'CSE-327',
    location: 'Room AB-402',
    startAt: '2026-10-27T11:00:00+06:00',
    endAt: '2026-10-27T12:20:00+06:00',
    createdBy: 'usr-cr-1',
    createdByName: 'Rafsan Jani (CR)',
    hasConflictFlag: false,
  },
  {
    id: 'evt-4',
    title: 'CSE-323 Packet Tracer & OSPF Lab Assessment',
    description: 'Hands-on router configuration and subnetting lab quiz.',
    type: 'Lab Assessment',
    classCodes: ['CSE-60E'],
    courseCode: 'CSE-323',
    location: 'AB-305 (Networking Lab 2)',
    startAt: '2026-10-29T14:00:00+06:00',
    endAt: '2026-10-29T16:00:00+06:00',
    createdBy: 'usr-cr-1',
    createdByName: 'Rafsan Jani (CR)',
    hasConflictFlag: false,
  },
  {
    id: 'evt-5',
    title: 'Autumn 2026 Midterm Examination Week Begins',
    description: 'Centralized departmental midterm examinations for 6th semester batches.',
    type: 'Midterm Examination',
    classCodes: ['CSE-60E'],
    location: 'Academic Building B Exam Halls',
    startAt: '2026-11-02T09:30:00+06:00',
    endAt: '2026-11-08T16:00:00+06:00',
    createdBy: 'usr-cr-1',
    createdByName: 'Rafsan Jani (CR)',
    hasConflictFlag: false,
  },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    userId: 'usr-student-1',
    noticeId: 'ntc-101',
    dedupeKey: 'notice-pub-ntc-101-v1',
    type: 'UPCOMING_EXAM',
    title: 'Pinned Exam Notice: CSE-321 Class Test 2 (CT-2)',
    message: 'Scheduled for Wednesday, Oct 21, 2026 at 10:30 AM in Room AB-402.',
    readAt: null,
    createdAt: '2026-10-15T09:01:00+06:00',
  },
  {
    id: 'notif-2',
    userId: 'usr-student-1',
    noticeId: 'ntc-103',
    dedupeKey: 'notice-pub-ntc-103-v1',
    type: 'ROUTINE_CHANGE',
    title: 'Routine Room Change: Thursday CSE-323 Lab',
    message: 'Moved from AB-301 to Networking Lab 2 (AB-305) starting Oct 22.',
    readAt: null,
    createdAt: '2026-10-16T08:16:00+06:00',
  },
  {
    id: 'notif-3',
    userId: 'usr-student-1',
    noticeId: 'ntc-102',
    dedupeKey: 'notice-pub-ntc-102-v1',
    type: 'ASSIGNMENT_DEADLINE',
    title: 'Deadline Reminder: CSE-325 AI Term Project Proposal',
    message: 'Due Sunday, Oct 25, 2026 at 11:59 PM BST.',
    readAt: '2026-10-16T10:00:00+06:00',
    createdAt: '2026-10-14T14:31:00+06:00',
  },
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-1',
    actorName: 'Rafsan Jani',
    actorRole: 'cr',
    action: 'NOTICE_PUBLISHED',
    resourceType: 'notice',
    resourceId: 'ntc-101',
    timestamp: '2026-10-15T09:00:00+06:00',
    details: 'CR published pinned Examination notice for CSE-60E (CSE-321 CT-2).',
  },
  {
    id: 'aud-2',
    actorName: 'Rafsan Jani',
    actorRole: 'cr',
    action: 'ROUTINE_UPDATED',
    resourceType: 'routine',
    resourceId: 'rtn-6',
    timestamp: '2026-10-16T08:15:00+06:00',
    details: 'CR updated Thursday CSE-323 lab location to AB-305 (Networking Lab 2).',
  },
  {
    id: 'aud-3',
    actorName: 'Rafsan Jani',
    actorRole: 'cr',
    action: 'CR_SYSTEM_POLICY_VERIFIED',
    resourceType: 'auth',
    resourceId: 'policy-cr-rbac-v2',
    timestamp: '2026-10-16T18:00:00+06:00',
    details: 'CR full-system management mode active (CR & Student two-role architecture).',
  },
];

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const CATEGORIES: NoticeCategory[] = [
  'General',
  'Examination',
  'Assignment',
  'Class Routine',
  'Department',
  'Event',
  'Emergency',
];

// ============================================================================
// Helper Functions (Time Overlap, Deterministic AI Summarizer & Extractor)
// ============================================================================

function timeToMinutes(hhmm: string): number {
  const parts = hhmm.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function timesOverlap(sA: string, eA: string, sB: string, eB: string): boolean {
  return timeToMinutes(sA) < timeToMinutes(eB) && timeToMinutes(sB) < timeToMinutes(eA);
}

function formatDhakaDate(iso?: string): string {
  if (!iso) return 'Not specified';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function buildAISummary(notice: NoticeRecord, language: 'en' | 'bn'): AISummaryRecord {
  const scope = [
    ...notice.targetClassCodes,
    ...notice.targetCourseCodes,
  ].join(' • ') || 'CSE 60E';

  if (language === 'bn') {
    if (notice.id === 'ntc-101') {
      return {
        mainAnnouncement:
          'CSE-321 (Operating Systems) কোর্সের ক্লাস টেস্ট ২ (CT-2) আগামী ২১ অক্টোবর ২০২৬ রোজ বুধবার সকাল ১০:৩০ মিনিটে রুম AB-402-এ অনুষ্ঠিত হবে।',
        importantDateAndTime: '২১ অক্টোবর ২০২৬, সকাল ১০:৩০ - ১১:২০ (BST)',
        requiredAction:
          'বিশ্ববিদ্যালয়ের আইডি কার্ড এবং নন-প্রোগ্রামেবল ক্যালকুলেটর সাথে আনতে হবে; Deadlock, Banker Algorithm ও Paging অধ্যায় প্রস্তুতি নিতে হবে।',
        relevantCourseOrClass: 'CSE-60E • CSE-321',
        conditions: ['পূর্ব অনুমোদিত মেডিকেল সার্টিফিকেট ছাড়া কোনো মেকআপ সিটি নেওয়া হবে না।'],
        language: 'bn',
        generatedAt: new Date().toISOString(),
      };
    }
    if (notice.id === 'ntc-102') {
      return {
        mainAnnouncement:
          'CSE-325 (Artificial Intelligence) টার্ম প্রজেক্টের প্রপোজাল পিডিএফ এবং GitHub রিপোজিটরি লিংক জমা দেওয়ার সময়সীমা ঘোষণা করা হয়েছে।',
        importantDateAndTime: '২৫ অক্টোবর ২০২৬, রাত ১১:৫৯ মিনিট (BST)',
        requiredAction:
          '৩-৪ জনের গ্রুপ গঠন করে পোর্টালে প্রপোজাল PDF ও GitHub লিংক জমা দিতে হবে।',
        relevantCourseOrClass: 'CSE-60E • CSE-325',
        conditions: ['বিলম্বে জমা দিলে প্রতিদিন ১৫% করে নম্বর কর্তন করা হবে।'],
        language: 'bn',
        generatedAt: new Date().toISOString(),
      };
    }
    return {
      mainAnnouncement: `${notice.title} — ${notice.body.slice(0, 140)}`,
      importantDateAndTime: notice.eventDate
        ? `${formatDhakaDate(notice.eventDate)} (BST)`
        : 'নির্দিষ্ট তারিখ উল্লেখ নেই',
      requiredAction: 'নোটিশের নির্দেশনা অনুযায়ী প্রয়োজনীয় পদক্ষেপ গ্রহণ করুন।',
      relevantCourseOrClass: scope,
      conditions: ['CSE 60E-এর সকল শিক্ষার্থীর জন্য প্রযোজ্য।'],
      language: 'bn',
      generatedAt: new Date().toISOString(),
    };
  }

  if (notice.id === 'ntc-101') {
    return {
      mainAnnouncement:
        'CSE-321 (Operating Systems) Class Test 2 is scheduled for Wednesday, October 21, 2026 from 10:30 AM to 11:20 AM in Room AB-402.',
      importantDateAndTime: 'Wednesday, Oct 21, 2026 • 10:30 AM – 11:20 AM BST',
      requiredAction:
        'Prepare Deadlock Prevention, Banker Algorithm, Paging & Virtual Memory; bring University ID card and non-programmable calculator.',
      relevantCourseOrClass: 'CSE-60E • CSE-321',
      conditions: ['No makeup examination without prior medical approval.'],
      language: 'en',
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    mainAnnouncement: `${notice.title}: ${notice.body.slice(0, 155)}`,
    importantDateAndTime: notice.eventDate ? `${formatDhakaDate(notice.eventDate)} BST` : null,
    requiredAction:
      notice.category === 'Assignment'
        ? 'Submit required deliverable before the stated deadline.'
        : notice.category === 'Class Routine'
        ? 'Attend the updated room/time slot as scheduled.'
        : 'Review announcement details and follow class guidelines.',
    relevantCourseOrClass: scope,
    conditions: ['Published by CSE 60E Class Representative.'],
    language: 'en',
    generatedAt: new Date().toISOString(),
  };
}

function buildExtractedInfo(notice: NoticeRecord): ExtractedNoticeInfo {
  const courseMatches = notice.body.match(/CSE-\d{3}/gi) || notice.targetCourseCodes;
  const uniqueCourses = Array.from(
    new Set([...courseMatches.map((c) => c.toUpperCase()), ...notice.targetCourseCodes])
  );

  return {
    eventDates: notice.eventDate
      ? [
          {
            label: notice.title,
            isoDate: notice.eventDate,
            rawText: formatDhakaDate(notice.eventDate),
            isAmbiguous: false,
          },
        ]
      : [
          {
            label: 'No explicit ISO timestamp found in notice metadata',
            isoDate: null,
            rawText: 'Date ambiguous or unspecified',
            isAmbiguous: true,
          },
        ],
    deadlines:
      notice.category === 'Assignment' && notice.eventDate
        ? [
            {
              task: notice.title,
              dueAt: notice.eventDate,
              rawText: formatDhakaDate(notice.eventDate),
              isAmbiguous: false,
            },
          ]
        : [],
    courseCodes: uniqueCourses,
    examinationTypes:
      notice.category === 'Examination' ? ['Class Test (CT)', 'In-Person Assessment'] : [],
    requiredActions: [
      notice.category === 'Examination'
        ? 'Bring University ID card and calculator to Room AB-402'
        : notice.category === 'Assignment'
        ? 'Upload PDF proposal and GitHub repository link before 11:59 PM BST'
        : 'Note schedule update for CSE 60E',
    ],
    relevantAudience: notice.targetClassCodes.join(', ') || 'CSE 60E Students',
    validatedByCR: false,
  };
}

// ============================================================================
// Main CampusFlow AI Component (CR-Managed System)
// ============================================================================

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [instructors, setInstructors] = useState<CourseInstructorRecord[]>(INITIAL_INSTRUCTORS);
  // Default logged in as the Class Representative (CR) so the user immediately manages the system
  const [currentUserId, setCurrentUserId] = useState<string>('usr-cr-1');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>('rafsan.cr60e@univ.edu.bd');
  const [loginPassword, setLoginPassword] = useState<string>('CampusFlow#2026');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeNav, setActiveNav] = useState<
    | 'dashboard'
    | 'notices'
    | 'routine'
    | 'calendar'
    | 'notifications'
    | 'ai-assistant'
    | 'teachers'
    | 'cr-console'
    | 'profile'
  >('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [notices, setNotices] = useState<NoticeRecord[]>(INITIAL_NOTICES);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [noticeCategoryFilter, setNoticeCategoryFilter] = useState<string>('All');
  const [noticeSearch, setNoticeSearch] = useState<string>('');
  const [noticeStatusFilter, setNoticeStatusFilter] = useState<string>('published');

  const [routine, setRoutine] = useState<RoutineSlot[]>(INITIAL_ROUTINE);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Sunday');

  const [events, setEvents] = useState<AcademicEventRecord[]>(INITIAL_EVENTS);
  const [calendarViewMode, setCalendarViewMode] = useState<'list' | 'grid'>('list');

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Modals & Interactive States
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );
  const [confirmDeleteNoticeId, setConfirmDeleteNoticeId] = useState<string | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeRecord | null>(null);

  // Notice Form State
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formCategory, setFormCategory] = useState<NoticeCategory>('General');
  const [formCourseCode, setFormCourseCode] = useState('CSE-321');
  const [formEventDate, setFormEventDate] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formStatus, setFormStatus] = useState<NoticeStatus>('published');

  // Routine Modal State
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [routineDay, setRoutineDay] = useState<DayOfWeek>('Monday');
  const [routineCourse, setRoutineCourse] = useState('CSE-321');
  const [routineStart, setRoutineStart] = useState('11:00');
  const [routineEnd, setRoutineEnd] = useState('12:20');
  const [routineRoom, setRoutineRoom] = useState('AB-402');
  const [routineError, setRoutineError] = useState<string | null>(null);

  // Event Modal State
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState<AcademicEventType>('CT Examination');
  const [eventCourse, setEventCourse] = useState('CSE-321');
  const [eventLocation, setEventLocation] = useState('Room AB-402');
  const [eventStart, setEventStart] = useState('2026-10-28T10:30');
  const [eventEnd, setEventEnd] = useState('2026-10-28T11:20');
  const [eventError, setEventError] = useState<string | null>(null);

  // AI States
  const [summaryLanguage, setSummaryLanguage] = useState<'en' | 'bn'>('en');
  const [qaQuery, setQaQuery] = useState('');
  const [qaLanguage, setQaLanguage] = useState<'en' | 'bn'>('en');
  const [qaHistory, setQaHistory] = useState<
    Array<{
      id: string;
      question: string;
      answer: string;
      language: 'en' | 'bn';
      hasSufficientInformation: boolean;
      sources: Array<{ id: string; title: string; category: string }>;
    }>
  >([
    {
      id: 'qa-init-1',
      question: 'What examinations and assignment deadlines are scheduled for CSE 60E?',
      answer:
        'Based on official published notices for CSE 60E: (1) CSE-321 Operating Systems Class Test 2 (CT-2) is scheduled for Wednesday, October 21, 2026 from 10:30 AM to 11:20 AM BST in Room AB-402. (2) The CSE-325 AI Term Project Proposal PDF & GitHub repository link deadline is Sunday, October 25, 2026 at 11:59 PM BST.',
      language: 'en',
      hasSufficientInformation: true,
      sources: [
        {
          id: 'ntc-101',
          title: 'CSE-321 Class Test 2 (CT-2) Syllabus & Seating Plan for CSE 60E',
          category: 'Examination',
        },
        {
          id: 'ntc-102',
          title: 'CSE-325 AI Term Project Proposal & GitHub Repository Submission Deadline',
          category: 'Assignment',
        },
      ],
    },
  ]);

  const [teacherSearch, setTeacherSearch] = useState('');

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || users[0],
    [users, currentUserId]
  );

  const isCR = currentUser.role === 'cr';

  const triggerToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const addAuditLog = (
    action: string,
    resourceType: AuditLogEntry['resourceType'],
    resourceId: string,
    details: string
  ) => {
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action,
        resourceType,
        resourceId,
        timestamp: new Date().toISOString(),
        details,
      },
      ...prev,
    ]);
  };

  // Authorized Notices for Current User
  const visibleNotices = useMemo(() => {
    return notices
      .filter((n) => {
        const inClassScope =
          isCR ||
          n.targetClassCodes.length === 0 ||
          n.targetClassCodes.some((c) => currentUser.classMemberships.includes(c));
        if (!inClassScope) return false;

        // Students only ever see published notices; CR can filter drafts/published/all
        if (!isCR) {
          if (n.status !== 'published') return false;
        } else if (noticeStatusFilter !== 'all') {
          if (n.status !== noticeStatusFilter) return false;
        }

        if (noticeCategoryFilter !== 'All' && n.category !== noticeCategoryFilter) {
          return false;
        }

        if (noticeSearch.trim()) {
          const q = noticeSearch.toLowerCase();
          const matchTitle = n.title.toLowerCase().includes(q);
          const matchBody = n.body.toLowerCase().includes(q);
          const matchCourse = n.targetCourseCodes.some((c) => c.toLowerCase().includes(q));
          if (!matchTitle && !matchBody && !matchCourse) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return (b.publishedAt || '').localeCompare(a.publishedAt || '');
      });
  }, [notices, currentUser, isCR, noticeCategoryFilter, noticeSearch, noticeStatusFilter]);

  const draftNotices = useMemo(
    () => notices.filter((n) => n.status === 'draft'),
    [notices]
  );

  const selectedNotice = useMemo(
    () => notices.find((n) => n.id === selectedNoticeId) || null,
    [notices, selectedNoticeId]
  );

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => n.readAt === null).length,
    [notifications]
  );

  // Handlers
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = users.find(
      (u) => u.email.toLowerCase() === loginEmail.trim().toLowerCase() && u.isActive
    );
    if (!matched || loginPassword.length < 6) {
      setLoginError('Invalid university email or password. Choose CR or Student below.');
      return;
    }
    setCurrentUserId(matched.id);
    setIsAuthenticated(true);
    setLoginError(null);
    triggerToast(`Signed in as ${matched.name} (${matched.role === 'cr' ? 'Class Representative' : 'Student'})`);
  };

  const handleRoleSwitch = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    setCurrentUserId(userId);
    setLoginEmail(target.email);
    setIsAuthenticated(true);
    if (target.role === 'student' && activeNav === 'cr-console') {
      setActiveNav('dashboard');
    }
    if (target.role === 'student') {
      setNoticeStatusFilter('published');
    }
    triggerToast(
      `Switched view to ${target.name} (${target.role === 'cr' ? 'CR System Manager' : 'Student View'})`
    );
  };

  const openCreateNoticeModal = () => {
    setEditingNotice(null);
    setFormTitle('');
    setFormBody('');
    setFormCategory('General');
    setFormCourseCode('CSE-321');
    setFormEventDate('');
    setFormIsPinned(false);
    setFormStatus('published');
    setShowNoticeModal(true);
  };

  const openEditNoticeModal = (notice: NoticeRecord) => {
    setEditingNotice(notice);
    setFormTitle(notice.title);
    setFormBody(notice.body);
    setFormCategory(notice.category);
    setFormCourseCode(notice.targetCourseCodes[0] || 'CSE-321');
    setFormEventDate(notice.eventDate ? notice.eventDate.slice(0, 16) : '');
    setFormIsPinned(notice.isPinned);
    setFormStatus(notice.status);
    setShowNoticeModal(true);
  };

  const handleSaveNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCR) {
      triggerToast('Only the Class Representative (CR) can create or modify notices.', 'error');
      return;
    }
    if (formTitle.trim().length < 4 || formBody.trim().length < 10) {
      triggerToast('Please provide a valid title (min 4 chars) and description (min 10 chars).', 'error');
      return;
    }

    if (editingNotice) {
      const contentChanged =
        editingNotice.title !== formTitle.trim() || editingNotice.body !== formBody.trim();
      const updatedVersion = contentChanged ? editingNotice.version + 1 : editingNotice.version;

      setNotices((prev) =>
        prev.map((n) =>
          n.id === editingNotice.id
            ? {
                ...n,
                title: formTitle.trim(),
                body: formBody.trim(),
                category: formCategory,
                targetCourseCodes: [formCourseCode],
                isPinned: formIsPinned,
                status: formStatus,
                publishedAt:
                  formStatus === 'published' && !n.publishedAt
                    ? new Date().toISOString()
                    : n.publishedAt,
                eventDate: formEventDate ? new Date(formEventDate).toISOString() : undefined,
                version: updatedVersion,
                aiSummary: contentChanged ? undefined : n.aiSummary,
                aiSummaryVersion: contentChanged ? undefined : n.aiSummaryVersion,
              }
            : n
        )
      );
      addAuditLog(
        'NOTICE_UPDATED',
        'notice',
        editingNotice.id,
        `CR updated notice "${formTitle.trim()}" (v${updatedVersion}, AI cache invalidated: ${contentChanged}).`
      );
      triggerToast(`Notice updated (v${updatedVersion}).`);
      setShowNoticeModal(false);
      return;
    }

    const newId = `ntc-${Date.now()}`;
    const newNotice: NoticeRecord = {
      id: newId,
      title: formTitle.trim(),
      body: formBody.trim(),
      category: formCategory,
      targetClassCodes: ['CSE-60E'],
      targetCourseCodes: formCourseCode ? [formCourseCode] : [],
      authorId: currentUser.id,
      authorName: `${currentUser.name} (CR)`,
      authorRole: 'cr',
      status: formStatus,
      isPinned: formIsPinned,
      publishedAt: formStatus === 'published' ? new Date().toISOString() : undefined,
      eventDate: formEventDate ? new Date(formEventDate).toISOString() : undefined,
      attachments: [],
      version: 1,
      readCount: 1,
    };

    setNotices((prev) => [newNotice, ...prev]);
    addAuditLog(
      formStatus === 'published' ? 'NOTICE_PUBLISHED' : 'NOTICE_DRAFT_SAVED',
      'notice',
      newId,
      `CR created ${formCategory} notice "${newNotice.title}" (${formStatus}).`
    );

    if (formStatus === 'published') {
      const dedupeKey = `notice-pub-${newId}-v1`;
      setNotifications((prev) => {
        if (prev.some((item) => item.dedupeKey === dedupeKey)) return prev;
        return [
          {
            id: `notif-${Date.now()}`,
            userId: 'usr-student-1',
            noticeId: newId,
            dedupeKey,
            type: formIsPinned ? 'PINNED_ANNOUNCEMENT' : 'NEW_NOTICE',
            title: `New ${formCategory} Notice: ${newNotice.title}`,
            message: newNotice.body.slice(0, 120),
            readAt: null,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ];
      });
      triggerToast('Notice published directly by CR and notifications dispatched to CSE 60E!');
    } else {
      triggerToast('Notice saved as draft. You can publish it anytime.');
    }

    setShowNoticeModal(false);
  };

  const handlePublishDraftNotice = (notice: NoticeRecord) => {
    if (!isCR) return;
    setNotices((prev) =>
      prev.map((n) =>
        n.id === notice.id
          ? { ...n, status: 'published', publishedAt: new Date().toISOString() }
          : n
      )
    );
    addAuditLog(
      'NOTICE_PUBLISHED',
      'notice',
      notice.id,
      `CR published draft notice "${notice.title}".`
    );
    const dedupeKey = `notice-pub-${notice.id}-v${notice.version}`;
    setNotifications((prev) => {
      if (prev.some((item) => item.dedupeKey === dedupeKey)) return prev;
      return [
        {
          id: `notif-${Date.now()}`,
          userId: 'usr-student-1',
          noticeId: notice.id,
          dedupeKey,
          type: 'NEW_NOTICE',
          title: `New Notice: ${notice.title}`,
          message: notice.body.slice(0, 120),
          readAt: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });
    triggerToast(`Published "${notice.title}" to CSE 60E board.`);
  };

  const handleDeleteNoticeConfirmed = () => {
    if (!confirmDeleteNoticeId) return;
    const target = notices.find((n) => n.id === confirmDeleteNoticeId);
    if (!target) return;
    if (!isCR) {
      triggerToast('Only the Class Representative can delete notices.', 'error');
      setConfirmDeleteNoticeId(null);
      return;
    }
    setNotices((prev) => prev.filter((n) => n.id !== confirmDeleteNoticeId));
    if (selectedNoticeId === confirmDeleteNoticeId) {
      setSelectedNoticeId(null);
    }
    addAuditLog('NOTICE_DELETED', 'notice', target.id, `CR deleted notice "${target.title}".`);
    setConfirmDeleteNoticeId(null);
    triggerToast('Notice permanently deleted by CR.');
  };

  const handleTogglePin = (notice: NoticeRecord) => {
    if (!isCR) return;
    setNotices((prev) =>
      prev.map((n) => (n.id === notice.id ? { ...n, isPinned: !n.isPinned } : n))
    );
    triggerToast(notice.isPinned ? 'Notice unpinned.' : 'Notice pinned to top of CSE 60E board.');
  };

  const handleGenerateAISummary = (notice: NoticeRecord, lang: 'en' | 'bn') => {
    setSummaryLanguage(lang);
    const cached = notice.aiSummary?.[lang];
    if (cached && notice.aiSummaryVersion === notice.version) {
      triggerToast(`Loaded cached ${lang === 'bn' ? 'Bangla' : 'English'} summary (v${notice.version}).`);
      return;
    }
    const generated = buildAISummary(notice, lang);
    setNotices((prev) =>
      prev.map((n) =>
        n.id === notice.id
          ? {
              ...n,
              aiSummary: { ...(n.aiSummary || {}), [lang]: generated },
              aiSummaryVersion: n.version,
            }
          : n
      )
    );
    addAuditLog(
      'AI_NOTICE_SUMMARIZED',
      'ai',
      notice.id,
      `Generated ${lang.toUpperCase()} AI summary for "${notice.title}" (v${notice.version}).`
    );
    triggerToast(`Generated ${lang === 'bn' ? 'বাংলা (Bangla)' : 'English'} AI summary.`);
  };

  const handleExtractStructuredInfo = (notice: NoticeRecord) => {
    const extracted = buildExtractedInfo(notice);
    setNotices((prev) =>
      prev.map((n) => (n.id === notice.id ? { ...n, extractedInformation: extracted } : n))
    );
    addAuditLog(
      'AI_STRUCTURED_EXTRACTION',
      'ai',
      notice.id,
      `Extracted structured dates, course codes, and action items from "${notice.title}".`
    );
    triggerToast('Extracted structured dates, deadlines, and action items.');
  };

  const handlePromoteExtractedToEvent = (notice: NoticeRecord) => {
    if (!isCR) {
      triggerToast('Only the Class Representative (CR) can add extracted events to the official calendar.', 'error');
      return;
    }
    const iso = notice.eventDate || '2026-10-28T10:00:00+06:00';
    const newEvt: AcademicEventRecord = {
      id: `evt-${Date.now()}`,
      title: notice.title,
      description: notice.body.slice(0, 180),
      type: notice.category === 'Examination' ? 'CT Examination' : 'Assignment Deadline',
      classCodes: notice.targetClassCodes,
      courseCode: notice.targetCourseCodes[0] || 'CSE-321',
      location: 'Room AB-402',
      startAt: iso,
      createdBy: currentUser.id,
      createdByName: `${currentUser.name} (CR)`,
      hasConflictFlag: false,
      sourceNoticeId: notice.id,
    };
    setEvents((prev) => [...prev, newEvt]);
    setNotices((prev) =>
      prev.map((n) =>
        n.id === notice.id && n.extractedInformation
          ? {
              ...n,
              extractedInformation: { ...n.extractedInformation, validatedByCR: true },
            }
          : n
      )
    );
    addAuditLog(
      'EXTRACTED_EVENT_APPROVED_BY_CR',
      'event',
      newEvt.id,
      `CR validated and published extracted event from notice "${notice.title}".`
    );
    triggerToast('CR validated and published event to the CSE 60E Academic Calendar!');
  };

  const handleAddRoutineSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setRoutineError(null);
    if (!isCR) return;
    if (timeToMinutes(routineEnd) <= timeToMinutes(routineStart)) {
      setRoutineError('End time must be later than start time.');
      return;
    }

    const conflict = routine.find(
      (r) =>
        r.classCode === 'CSE-60E' &&
        r.dayOfWeek === routineDay &&
        r.status === 'published' &&
        timesOverlap(routineStart, routineEnd, r.startTime, r.endTime)
    );

    if (conflict) {
      setRoutineError(
        `Conflict detected! ${routineDay} ${routineStart}–${routineEnd} overlaps with ${conflict.courseCode} (${conflict.startTime}–${conflict.endTime} in ${conflict.room}).`
      );
      return;
    }

    const courseDetails: Record<string, { title: string; instructor: string }> = {
      'CSE-321': { title: 'Operating Systems & System Programming', instructor: 'Dr. Farhana Rahman' },
      'CSE-323': { title: 'Computer Networks & Distributed Security', instructor: 'Prof. Tanvir Ahmed' },
      'CSE-325': { title: 'Artificial Intelligence & Machine Learning', instructor: 'Dr. Farhana Rahman' },
      'CSE-327': { title: 'Software Engineering & System Architecture', instructor: 'Nusrat Jahan' },
    };

    const info = courseDetails[routineCourse] || {
      title: 'Departmental Course',
      instructor: 'CSE Faculty',
    };

    const newSlot: RoutineSlot = {
      id: `rtn-${Date.now()}`,
      classCode: 'CSE-60E',
      courseCode: routineCourse,
      courseTitle: info.title,
      instructorName: info.instructor,
      dayOfWeek: routineDay,
      startTime: routineStart,
      endTime: routineEnd,
      room: routineRoom.trim(),
      recurrence: 'weekly',
      status: 'published',
    };

    setRoutine((prev) => [...prev, newSlot]);
    setSelectedDay(routineDay);
    setShowRoutineModal(false);
    addAuditLog(
      'ROUTINE_SLOT_CREATED',
      'routine',
      newSlot.id,
      `CR added ${routineCourse} on ${routineDay} (${routineStart}-${routineEnd}) in ${routineRoom}.`
    );
    triggerToast(`Added ${routineCourse} routine slot on ${routineDay}.`);
  };

  const handleDeleteRoutineSlot = (slotId: string) => {
    if (!isCR) return;
    setRoutine((prev) => prev.filter((r) => r.id !== slotId));
    addAuditLog('ROUTINE_SLOT_DELETED', 'routine', slotId, `CR removed routine slot ${slotId}.`);
    triggerToast('Routine slot removed.');
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setEventError(null);
    if (!isCR) return;
    const sTime = new Date(eventStart).getTime();
    const eTime = eventEnd ? new Date(eventEnd).getTime() : sTime;
    if (Number.isNaN(sTime) || eTime < sTime) {
      setEventError('Invalid date range: End time cannot be earlier than Start time.');
      return;
    }

    const startDayPrefix = eventStart.slice(0, 10);
    const sameDay = events.filter((ev) => ev.startAt.slice(0, 10) === startDayPrefix);
    const hasConflictFlag = sameDay.length > 0;

    const newEvt: AcademicEventRecord = {
      id: `evt-${Date.now()}`,
      title: eventTitle.trim(),
      description: eventDesc.trim(),
      type: eventType,
      classCodes: ['CSE-60E'],
      courseCode: eventCourse,
      location: eventLocation.trim(),
      startAt: new Date(eventStart).toISOString(),
      endAt: eventEnd ? new Date(eventEnd).toISOString() : undefined,
      createdBy: currentUser.id,
      createdByName: `${currentUser.name} (CR)`,
      hasConflictFlag,
      conflictReason: hasConflictFlag
        ? `Same-day overlap flag: shares date (${startDayPrefix}) with ${sameDay
            .map((x) => x.title)
            .join(', ')}`
        : undefined,
    };

    setEvents((prev) => [...prev, newEvt]);
    setShowEventModal(false);
    setEventTitle('');
    setEventDesc('');
    addAuditLog(
      'EVENT_CREATED',
      'event',
      newEvt.id,
      `CR created ${eventType} "${newEvt.title}" (Conflict Flag: ${hasConflictFlag}).`
    );
    triggerToast(
      hasConflictFlag
        ? 'Event added by CR with a same-day conflict review flag.'
        : 'Academic event published to CSE 60E calendar.'
    );
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!isCR) return;
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    addAuditLog('EVENT_DELETED', 'event', eventId, `CR removed academic event ${eventId}.`);
    triggerToast('Academic event removed.');
  };

  const handleAskAIQuestion = (customQuestion?: string) => {
    const qText = (customQuestion ?? qaQuery).trim();
    if (!qText) return;

    const authorizedPublished = notices.filter(
      (n) =>
        n.status === 'published' &&
        (n.targetClassCodes.length === 0 ||
          n.targetClassCodes.some((c) => currentUser.classMemberships.includes(c)))
    );

    const stopWords = new Set([
      'what',
      'when',
      'where',
      'which',
      'there',
      'about',
      'please',
      'tell',
      'next',
      'week',
      'month',
      'the',
      'for',
      'and',
      'are',
      'any',
    ]);
    const keywords = qText
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 2 && !stopWords.has(w));

    const matched = authorizedPublished.filter((n) => {
      const hay = `${n.title} ${n.body} ${n.category} ${n.targetCourseCodes.join(' ')}`.toLowerCase();
      if (
        qText.toLowerCase().includes('latest') ||
        qText.toLowerCase().includes('bangla') ||
        qText.toLowerCase().includes('summarize')
      ) {
        return true;
      }
      return keywords.some((kw) => hay.includes(kw));
    });

    let answer = '';
    const isBn = qaLanguage === 'bn' || qText.toLowerCase().includes('bangla');

    if (matched.length === 0) {
      answer = isBn
        ? 'প্রকাশিত ক্যাম্পাস নোটিশে আপনার প্রশ্নের উত্তর দেওয়ার মতো পর্যাপ্ত তথ্য পাওয়া যায়নি। অনুগ্রহ করে সিআর (CR)-এর সাথে যোগাযোগ করুন।'
        : 'The currently published notices for CSE 60E do not contain verified information to answer this question. I never fabricate dates or policies not backed by an official published notice.';
    } else if (isBn) {
      answer =
        'CSE 60E-এর প্রকাশিত নোটিশ অনুযায়ী: ' +
        matched
          .slice(0, 3)
          .map((m) => `• ${m.title}: ${buildAISummary(m, 'bn').mainAnnouncement}`)
          .join(' ');
    } else {
      answer =
        'According to official published notices for CSE 60E: ' +
        matched
          .slice(0, 3)
          .map((m) => `[${m.category}] "${m.title}" — ${m.body.slice(0, 165)}...`)
          .join(' ');
    }

    setQaHistory((prev) => [
      {
        id: `qa-${Date.now()}`,
        question: qText,
        answer,
        language: isBn ? 'bn' : 'en',
        hasSufficientInformation: matched.length > 0,
        sources: matched.slice(0, 3).map((m) => ({
          id: m.id,
          title: m.title,
          category: m.category,
        })),
      },
      ...prev,
    ]);
    setQaQuery('');
    addAuditLog(
      'AI_QUESTION_ANSWERED',
      'ai',
      currentUser.id,
      `Answered query with ${matched.slice(0, 3).length} verified notice source(s).`
    );
  };

  // ============================================================================
  // Public Login Screen View (CR & Student Only)
  // ============================================================================

  if (!isAuthenticated) {
    return (
      <div className={darkMode ? 'dark bg-slate-950 text-slate-100 min-h-screen' : 'bg-slate-50 text-slate-900 min-h-screen'}>
        <div className="max-w-md mx-auto pt-16 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">CampusFlow AI</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  CSE 60E • CR-Managed Class Information & AI Portal
                </p>
              </div>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  University Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
              >
                Sign In to CampusFlow AI
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                Quick Demo Sign-In (CR System Manager vs. Student):
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('usr-cr-1')}
                  className="text-left p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 text-xs transition bg-indigo-50/40 dark:bg-indigo-950/30"
                >
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                    Class Rep (CR)
                  </div>
                  <div className="truncate font-medium">Rafsan Jani (Full Manager)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('usr-student-1')}
                  className="text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-xs transition"
                >
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    Student
                  </div>
                  <div className="truncate font-medium">Tasnia Kabir (CSE 60E)</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Authenticated Shell (CR & Student Views Only)
  // ============================================================================

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['cr', 'student'] },
    { id: 'notices', label: 'Notices & Board', icon: FileText, roles: ['cr', 'student'] },
    { id: 'routine', label: 'Class Routine', icon: Clock, roles: ['cr', 'student'] },
    { id: 'calendar', label: 'Exams & Deadlines', icon: Calendar, roles: ['cr', 'student'] },
    { id: 'ai-assistant', label: 'AI Notice Assistant', icon: Sparkles, roles: ['cr', 'student'] },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['cr', 'student'], badge: unreadNotificationsCount },
    { id: 'teachers', label: 'Course Instructors', icon: Users, roles: ['cr', 'student'] },
    { id: 'cr-console', label: 'CR System Control', icon: ShieldCheck, roles: ['cr'] },
    { id: 'profile', label: 'My Profile', icon: User, roles: ['cr', 'student'] },
  ] as const;

  const filteredNavItems = navItems.filter((item) =>
    (item.roles as readonly string[]).includes(currentUser.role)
  );

  return (
    <div className={darkMode ? 'dark bg-slate-950 text-slate-100 min-h-screen' : 'bg-slate-50 text-slate-900 min-h-screen'}>
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-base leading-tight">CampusFlow AI</div>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  CSE 60E • CR Managed
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveNav(item.id);
                    setSelectedNoticeId(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {'badge' in item && item.badge ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        isActive ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* 2-Role Switcher Card (CR Manager vs. Student Preview) */}
          <div className="p-3 m-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Preview Mode (CR vs Student)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'usr-cr-1', label: 'CR Manager' },
                { id: 'usr-student-1', label: 'Student View' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleSwitch(r.id)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentUser.id === r.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700"
                aria-label="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base">{currentUser.name}</span>
                  <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {isCR ? 'Class Representative (Full Manager)' : 'Student'}
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    CSE 60E
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  University Timezone: Asia/Dhaka (BST, UTC+6) • Fri, Oct 16, 2026
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isCR && (
                <button
                  type="button"
                  onClick={openCreateNoticeModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Notice</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveNav('notifications')}
                className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle Theme"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsAuthenticated(false)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                {filteredNavItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveNav(item.id);
                      setSelectedNoticeId(null);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      activeNav === item.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-xs text-slate-500">Mode:</span>
                {[
                  { id: 'usr-cr-1', label: 'CR Manager' },
                  { id: 'usr-student-1', label: 'Student View' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      handleRoleSwitch(r.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      currentUser.id === r.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Toast Feedback Banner */}
          {toastMessage && (
            <div className="mx-4 lg:mx-6 mt-3 px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs font-medium shadow-sm bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/70 dark:border-indigo-800 dark:text-indigo-200">
              <span>{toastMessage.text}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="ml-3 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Page Container */}
          <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto space-y-6">
            {/* ==============================================================
                VIEW 1: DASHBOARD (CR SYSTEM MANAGER & STUDENT)
               ============================================================== */}
            {activeNav === 'dashboard' && (
              <div className="space-y-6">
                {/* Hero Banner */}
                <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white p-6 shadow-md">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur mb-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        {isCR
                          ? 'CR Full System Management Mode • CSE 60E'
                          : 'Student Portal • CSE 60E • Autumn 2026'}
                      </span>
                      <h1 className="text-2xl font-bold tracking-tight">
                        Welcome back, {currentUser.name}
                      </h1>
                      <p className="text-sm text-indigo-100 mt-1 max-w-2xl">
                        {isCR
                          ? 'You have full Class Representative authority to publish notices directly, manage the weekly routine, schedule exams and deadlines, and oversee CSE 60E.'
                          : 'Centralized class notices, routine, examination tracker, and source-grounded AI assistant for CSE 60E.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isCR && (
                        <button
                          type="button"
                          onClick={openCreateNoticeModal}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 font-semibold text-xs shadow hover:bg-indigo-50 transition"
                        >
                          <Plus className="w-4 h-4" />
                          Publish New Notice
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveNav('ai-assistant')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/40 hover:bg-indigo-500/60 text-white font-semibold text-xs border border-white/20 transition"
                      >
                        <Sparkles className="w-4 h-4" />
                        Ask AI Notice Assistant
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick KPI Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500 font-medium">Published Notices (CSE 60E)</div>
                    <div className="text-2xl font-bold mt-1">
                      {notices.filter((n) => n.status === 'published').length}
                    </div>
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1">
                      {notices.filter((n) => n.isPinned && n.status === 'published').length} pinned announcements
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500 font-medium">Upcoming Exams & Deadlines</div>
                    <div className="text-2xl font-bold mt-1">{events.length}</div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                      Next: CSE-321 CT-2 (Oct 21)
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500 font-medium">Next Scheduled Class</div>
                    <div className="text-lg font-bold mt-1 truncate">CSE-321 (Sun 09:00)</div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                      Room AB-402 • Dr. Farhana
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500 font-medium">
                      {isCR ? 'CR Drafts & Active Students' : 'Unread Notifications'}
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      {isCR ? `${draftNotices.length} Draft(s)` : unreadNotificationsCount}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {users.filter((u) => u.isActive).length} active CSE 60E members
                    </div>
                  </div>
                </div>

                {/* Main 2-Column Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Pinned & Latest Notices */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-base flex items-center gap-2">
                        <Pin className="w-4 h-4 text-indigo-600" />
                        Pinned & Latest Announcements
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveNav('notices')}
                        className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        View all <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {notices
                        .filter((n) => n.status === 'published')
                        .slice(0, 4)
                        .map((n) => (
                          <div
                            key={n.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                {n.isPinned && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    Pinned
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  {n.category}
                                </span>
                                {n.targetCourseCodes.map((c) => (
                                  <span
                                    key={c}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {formatDhakaDate(n.publishedAt)}
                              </span>
                            </div>
                            <h3 className="font-semibold text-sm">{n.title}</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                              {n.body}
                            </p>
                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className="text-slate-500">
                                Published by {n.authorName} • {n.readCount} reads
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedNoticeId(n.id);
                                  setActiveNav('notices');
                                }}
                                className="font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Read & AI Summary
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Right Column: Upcoming Exams, Deadlines & Routine Preview */}
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-base flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-rose-500" />
                          Upcoming Exams & Deadlines
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveNav('calendar')}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Manage
                        </button>
                      </div>
                      <div className="space-y-3">
                        {events.slice(0, 4).map((ev) => (
                          <div
                            key={ev.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800"
                          >
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                              <span className="text-rose-600 dark:text-rose-400">{ev.type}</span>
                              <span className="text-slate-500">{formatDhakaDate(ev.startAt)}</span>
                            </div>
                            <div className="font-semibold text-xs mt-1">{ev.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{ev.location}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-base flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-600" />
                          Sunday Class Routine (CSE 60E)
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveNav('routine')}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Full Week
                        </button>
                      </div>
                      <div className="space-y-2.5">
                        {routine
                          .filter((r) => r.dayOfWeek === 'Sunday')
                          .map((slot) => (
                            <div
                              key={slot.id}
                              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                            >
                              <div>
                                <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                  {slot.courseCode} • {slot.startTime}–{slot.endTime}
                                </div>
                                <div className="text-xs font-medium">{slot.courseTitle}</div>
                                <div className="text-[11px] text-slate-500">{slot.instructorName}</div>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                                {slot.room}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================
                VIEW 2: NOTICE BOARD & NOTICE DETAIL WITH AI SUMMARIZER
               ============================================================== */}
            {activeNav === 'notices' && (
              <div className="space-y-5">
                {selectedNotice ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                      <button
                        type="button"
                        onClick={() => setSelectedNoticeId(null)}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        ← Back to Notice Board
                      </button>
                      {isCR && (
                        <div className="flex items-center gap-2">
                          {selectedNotice.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => handlePublishDraftNotice(selectedNotice)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Publish Now
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleTogglePin(selectedNotice)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                          >
                            <Pin className="w-3.5 h-3.5" />
                            {selectedNotice.isPinned ? 'Unpin' : 'Pin'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditNoticeModal(selectedNotice)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit Notice
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteNoticeId(selectedNotice.id)}
                            className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {selectedNotice.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                          {selectedNotice.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          Version v{selectedNotice.version} • {selectedNotice.readCount} views
                        </span>
                      </div>
                      <h1 className="text-xl font-bold">{selectedNotice.title}</h1>
                      <p className="text-xs text-slate-500 mt-1">
                        Managed by <span className="font-semibold">{selectedNotice.authorName}</span> •{' '}
                        {formatDhakaDate(selectedNotice.publishedAt)} BST
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm leading-relaxed whitespace-pre-line border border-slate-200/70 dark:border-slate-800">
                      {selectedNotice.body}
                    </div>

                    {selectedNotice.attachments.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Official Attachments
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedNotice.attachments.map((att) => (
                            <a
                              key={att.name}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:border-indigo-500"
                            >
                              <FileText className="w-4 h-4 text-indigo-600" />
                              <span>{att.name}</span>
                              <span className="text-slate-400">
                                ({Math.round(att.sizeBytes / 1024)} KB)
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Summarization & Structured Extraction Controls */}
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-indigo-600" />
                          <div>
                            <h3 className="font-bold text-sm">AI Notice Summarizer & Extractor</h3>
                            <p className="text-xs text-slate-500">
                              Cached against Notice Version v{selectedNotice.version} • Supports English & বাংলা
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleGenerateAISummary(selectedNotice, 'en')}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Summarize (English)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGenerateAISummary(selectedNotice, 'bn')}
                            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            <Languages className="w-3.5 h-3.5" />
                            বাংলায় সারসংক্ষেপ (Bangla)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExtractStructuredInfo(selectedNotice)}
                            className="px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950"
                          >
                            Extract Dates & JSON
                          </button>
                        </div>
                      </div>

                      {selectedNotice.aiSummary?.[summaryLanguage] && (
                        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold text-indigo-800 dark:text-indigo-300">
                            <span>
                              AI Summary (
                              {summaryLanguage === 'bn' ? 'বাংলা সংস্করণ' : 'English'} • Cached for v
                              {selectedNotice.aiSummaryVersion})
                            </span>
                            <span>Verified Grounded Output</span>
                          </div>
                          <div>
                            <span className="font-semibold">Main Announcement: </span>
                            {selectedNotice.aiSummary[summaryLanguage]?.mainAnnouncement}
                          </div>
                          <div>
                            <span className="font-semibold">Important Date & Time: </span>
                            {selectedNotice.aiSummary[summaryLanguage]?.importantDateAndTime ||
                              'None explicitly specified'}
                          </div>
                          <div>
                            <span className="font-semibold">Required Action: </span>
                            {selectedNotice.aiSummary[summaryLanguage]?.requiredAction || 'None'}
                          </div>
                          <div>
                            <span className="font-semibold">Relevant Course / Class: </span>
                            {selectedNotice.aiSummary[summaryLanguage]?.relevantCourseOrClass}
                          </div>
                          <div>
                            <span className="font-semibold">Stated Conditions: </span>
                            {selectedNotice.aiSummary[summaryLanguage]?.conditions.join('; ')}
                          </div>
                        </div>
                      )}

                      {selectedNotice.extractedInformation && (
                        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-emerald-900 dark:text-emerald-300">
                              Structured Extraction (Schema-Validated Suggestion)
                            </span>
                            {isCR && !selectedNotice.extractedInformation.validatedByCR && (
                              <button
                                type="button"
                                onClick={() => handlePromoteExtractedToEvent(selectedNotice)}
                                className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                              >
                                CR Confirm & Add to Academic Calendar
                              </button>
                            )}
                            {selectedNotice.extractedInformation.validatedByCR && (
                              <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                                Approved by CR
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <span className="font-semibold">Extracted Courses: </span>
                              {selectedNotice.extractedInformation.courseCodes.join(', ') || 'None'}
                            </div>
                            <div>
                              <span className="font-semibold">Audience: </span>
                              {selectedNotice.extractedInformation.relevantAudience}
                            </div>
                            <div>
                              <span className="font-semibold">Extracted Dates: </span>
                              {selectedNotice.extractedInformation.eventDates
                                .map((d) => `${d.rawText} (${d.isAmbiguous ? 'Ambiguous' : 'Exact'})`)
                                .join(', ')}
                            </div>
                            <div>
                              <span className="font-semibold">Action Items: </span>
                              {selectedNotice.extractedInformation.requiredActions.join('; ')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Search & Category Filter Bar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type="text"
                            value={noticeSearch}
                            onChange={(e) => setNoticeSearch(e.target.value)}
                            placeholder="Search notices by title, course code (e.g. CSE-321), or keyword..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                          />
                        </div>
                        {isCR && (
                          <select
                            value={noticeStatusFilter}
                            onChange={(e) => setNoticeStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                          >
                            <option value="published">Published Notices</option>
                            <option value="draft">My CR Drafts</option>
                            <option value="all">All Notices</option>
                          </select>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {['All', ...CATEGORIES].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setNoticeCategoryFilter(cat)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                              noticeCategoryFilter === cat
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notice Cards List */}
                    {visibleNotices.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
                        <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                        <div className="font-bold text-sm">No matching notices found</div>
                        <p className="text-xs text-slate-500">
                          Try clearing your search filter or switching categories.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {visibleNotices.map((n) => (
                          <div
                            key={n.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:border-indigo-400 transition"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {n.isPinned && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                                    Pinned
                                  </span>
                                )}
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  {n.category}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    n.status === 'published'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {n.status}
                                </span>
                                {n.targetCourseCodes.map((code) => (
                                  <span
                                    key={code}
                                    className="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-slate-800"
                                  >
                                    {code}
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs text-slate-400">
                                {formatDhakaDate(n.publishedAt)} • {n.readCount} reads
                              </span>
                            </div>

                            <h3 className="font-bold text-base">{n.title}</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                              {n.body}
                            </p>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="text-slate-500">
                                Published by <strong className="text-slate-700 dark:text-slate-200">{n.authorName}</strong>
                              </span>
                              <div className="flex items-center gap-2">
                                {isCR && n.status === 'draft' && (
                                  <button
                                    type="button"
                                    onClick={() => handlePublishDraftNotice(n)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                                  >
                                    Publish Now
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNotices((prev) =>
                                      prev.map((item) =>
                                        item.id === n.id
                                          ? { ...item, readCount: item.readCount + 1 }
                                          : item
                                      )
                                    );
                                    setSelectedNoticeId(n.id);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-100 inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Open Details & AI Tools
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ==============================================================
                VIEW 3: WEEKLY CLASS ROUTINE (CR MANAGED)
               ============================================================== */}
            {activeNav === 'routine' && (
              <div className="space-y-5">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-lg font-bold">Weekly Class Timetable — CSE 60E</h1>
                    <p className="text-xs text-slate-500">
                      Timezone: Asia/Dhaka (BST) • Managed directly by CR with automatic conflict detection
                    </p>
                  </div>
                  {isCR && (
                    <button
                      type="button"
                      onClick={() => {
                        setRoutineError(null);
                        setShowRoutineModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Add Routine Slot
                    </button>
                  )}
                </div>

                {/* Day Selector Pills */}
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const count = routine.filter((r) => r.dayOfWeek === day).length;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                          selectedDay === day
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <span>{day}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Schedule Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {routine
                    .filter((r) => r.dayOfWeek === selectedDay)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((slot) => (
                      <div
                        key={slot.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                            {slot.startTime} – {slot.endTime} BST
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-xs">
                              Room: {slot.room}
                            </span>
                            {isCR && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRoutineSlot(slot.id)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                                title="Delete Slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="font-bold text-base">
                          {slot.courseCode}: {slot.courseTitle}
                        </div>
                        <div className="text-xs text-slate-500">
                          Course Instructor: <strong className="text-slate-700 dark:text-slate-300">{slot.instructorName}</strong> • Recurrence: {slot.recurrence}
                        </div>
                        {slot.changeNote && (
                          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{slot.changeNote}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  {routine.filter((r) => r.dayOfWeek === selectedDay).length === 0 && (
                    <div className="col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
                      No scheduled classes for {selectedDay}. Enjoy your self-study or lab preparation day!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==============================================================
                VIEW 4: ACADEMIC CALENDAR & DEADLINES (CR MANAGED)
               ============================================================== */}
            {activeNav === 'calendar' && (
              <div className="space-y-5">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-lg font-bold">Academic Calendar, Examinations & Deadlines</h1>
                    <p className="text-xs text-slate-500">
                      Managed by CR • Track CTs, Midterms, Final Exams, Assignment Deadlines & Lab Assessments
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarViewMode(calendarViewMode === 'list' ? 'grid' : 'list')
                      }
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    >
                      Switch to {calendarViewMode === 'list' ? 'Month Grid' : 'Timeline List'}
                    </button>
                    {isCR && (
                      <button
                        type="button"
                        onClick={() => {
                          setEventError(null);
                          setShowEventModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                      >
                        <Plus className="w-4 h-4" />
                        Add Event / Deadline
                      </button>
                    )}
                  </div>
                </div>

                {calendarViewMode === 'grid' ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                    <h3 className="font-bold text-sm mb-3">October – November 2026 Academic Schedule</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      {Array.from({ length: 21 }, (_, idx) => {
                        const dayNum = 15 + idx;
                        const isOct = dayNum <= 31;
                        const displayDay = isOct ? `Oct ${dayNum}` : `Nov ${dayNum - 31}`;
                        const isoPrefix = isOct
                          ? `2026-10-${String(dayNum).padStart(2, '0')}`
                          : `2026-11-${String(dayNum - 31).padStart(2, '0')}`;
                        const dayEvents = events.filter((e) => e.startAt.startsWith(isoPrefix));
                        return (
                          <div
                            key={isoPrefix}
                            className={`p-2.5 rounded-xl border min-h-[96px] flex flex-col justify-between ${
                              dayEvents.length > 0
                                ? 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30'
                                : 'border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                              {displayDay}
                            </div>
                            <div className="space-y-1 mt-1">
                              {dayEvents.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="text-[10px] p-1 rounded bg-indigo-600 text-white font-medium truncate"
                                  title={ev.title}
                                >
                                  {ev.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              {ev.type}
                            </span>
                            {ev.courseCode && (
                              <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-slate-800">
                                {ev.courseCode}
                              </span>
                            )}
                            {ev.hasConflictFlag && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {ev.conflictReason || 'Same-day conflict flagged'}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-base">{ev.title}</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {ev.description}
                          </p>
                          <div className="text-xs text-slate-500">
                            Location: <strong>{ev.location}</strong> • Added by {ev.createdByName}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-2">
                          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {formatDhakaDate(ev.startAt)} BST
                          </div>
                          <div className="flex items-center gap-2">
                            {ev.sourceNoticeId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedNoticeId(ev.sourceNoticeId!);
                                  setActiveNav('notices');
                                }}
                                className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
                              >
                                Source Notice <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                            {isCR && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEvent(ev.id)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                                title="Delete Event"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                VIEW 5: AI NOTICE ASSISTANT (RAG Q&A WITH CITATIONS)
               ============================================================== */}
            {activeNav === 'ai-assistant' && (
              <div className="space-y-5">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h1 className="text-lg font-bold">CampusFlow AI Notice Assistant</h1>
                        <p className="text-xs text-slate-500">
                          Answers strictly from published CSE 60E notices with verifiable source citations.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQaLanguage('en')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          qaLanguage === 'en'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => setQaLanguage('bn')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          qaLanguage === 'bn'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      >
                        বাংলা (Bangla)
                      </button>
                    </div>
                  </div>

                  {/* Suggested Student Questions */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      'What examinations are scheduled next week?',
                      'When is the CSE-325 assignment deadline?',
                      'Is there any routine change for Thursday lab?',
                      'Summarize the latest announcements in Bangla.',
                      'What is the hostel cafeteria menu for next month?',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleAskAIQuestion(prompt)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 transition"
                      >
                        "{prompt}"
                      </button>
                    ))}
                  </div>

                  {/* Question Input Bar */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={qaQuery}
                      onChange={(e) => setQaQuery(e.target.value)}
                      placeholder="Ask a question about exams, deadlines, or routine changes..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleAskAIQuestion()}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                    >
                      Ask AI
                    </button>
                  </div>
                </div>

                {/* Q&A Conversation Feed */}
                <div className="space-y-4">
                  {qaHistory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          Question ({item.language.toUpperCase()}): "{item.question}"
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            item.hasSufficientInformation
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.hasSufficientInformation
                            ? 'Source-Grounded Answer'
                            : 'No Matching Published Notice'}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {item.answer}
                      </p>
                      {item.sources.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                            Verified Published Notice Sources:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.sources.map((src) => (
                              <button
                                key={src.id}
                                type="button"
                                onClick={() => {
                                  setSelectedNoticeId(src.id);
                                  setActiveNav('notices');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:underline"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>{src.title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==============================================================
                VIEW 6: NOTIFICATION CENTER
               ============================================================== */}
            {activeNav === 'notifications' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-lg font-bold">In-App Notification Center</h1>
                    <p className="text-xs text-slate-500">
                      Deduplicated alerts for newly published notices, routine changes, and exam deadlines
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifications((prev) =>
                        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
                      );
                      triggerToast('All notifications marked as read.');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Mark All as Read
                  </button>
                </div>

                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                        notif.readAt
                          ? 'border-slate-200 dark:border-slate-800 opacity-75'
                          : 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {notif.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDhakaDate(notif.createdAt)}
                          </span>
                        </div>
                        <div className="font-bold text-sm mt-1">{notif.title}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {notif.message}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {notif.noticeId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNoticeId(notif.noticeId!);
                              setActiveNav('notices');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                          >
                            View Notice
                          </button>
                        )}
                        {!notif.readAt && (
                          <button
                            type="button"
                            onClick={() =>
                              setNotifications((prev) =>
                                prev.map((item) =>
                                  item.id === notif.id
                                    ? { ...item, readAt: new Date().toISOString() }
                                    : item
                                )
                              )
                            }
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==============================================================
                VIEW 7: COURSE INSTRUCTOR DIRECTORY (CR MANAGED VISIBILITY)
               ============================================================== */}
            {activeNav === 'teachers' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h1 className="text-lg font-bold">CSE 60E Course Instructor Directory</h1>
                    <p className="text-xs text-slate-500">
                      {isCR
                        ? 'As CR, you can toggle whether an instructor’s contact info is published to students'
                        : 'Displays approved course instructor contact information for CSE 60E'}
                    </p>
                  </div>
                  <input
                    type="text"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Search instructor by name or course code..."
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {instructors
                    .filter(
                      (inst) =>
                        inst.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
                        inst.assignedCourseCodes.some((c) =>
                          c.toLowerCase().includes(teacherSearch.toLowerCase())
                        )
                    )
                    .map((inst) => (
                      <div
                        key={inst.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center">
                              {inst.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-sm">{inst.name}</div>
                              <div className="text-xs text-slate-500">{inst.designation}</div>
                            </div>
                          </div>
                          {isCR && (
                            <button
                              type="button"
                              onClick={() => {
                                setInstructors((prev) =>
                                  prev.map((item) =>
                                    item.id === inst.id
                                      ? {
                                          ...item,
                                          publicContactApproved: !item.publicContactApproved,
                                        }
                                      : item
                                  )
                                );
                                triggerToast(
                                  `Updated contact visibility for ${inst.name}.`
                                );
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                inst.publicContactApproved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {inst.publicContactApproved ? 'Public' : 'Hidden'}
                            </button>
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <div>
                            <span className="text-slate-500">Department: </span>
                            <span className="font-semibold">{inst.departmentCode}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Assigned Courses: </span>
                            <span className="font-mono font-semibold">
                              {inst.assignedCourseCodes.join(', ')}
                            </span>
                          </div>
                          {inst.publicContactApproved || isCR ? (
                            <>
                              <div>
                                <span className="text-slate-500">Official Email: </span>
                                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                                  {inst.email}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500">Office Room: </span>
                                <span>{inst.officeRoom}</span>
                              </div>
                            </>
                          ) : (
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5" />
                              Contact details hidden from student view by CR
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ==============================================================
                VIEW 8: CR SYSTEM CONTROL CENTER (FULL MANAGEMENT BY CR)
               ============================================================== */}
            {activeNav === 'cr-console' && (
              <div className="space-y-6">
                {!isCR ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 p-8 text-center space-y-2">
                    <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
                    <h2 className="font-bold text-base">403 — Class Representative Access Only</h2>
                    <p className="text-xs text-slate-500">
                      Only the Class Representative (CR) can access system management controls.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* CR Draft Notices Queue */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold text-base">
                          CR Draft Notices ({draftNotices.length})
                        </h2>
                        <button
                          type="button"
                          onClick={openCreateNoticeModal}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                        >
                          + Create Notice
                        </button>
                      </div>
                      {draftNotices.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No unpublished drafts. All your notices are live on the CSE 60E board.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {draftNotices.map((n) => (
                            <div
                              key={n.id}
                              className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            >
                              <div>
                                <div className="font-bold text-sm">{n.title}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                  {n.body}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handlePublishDraftNotice(n)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                                >
                                  Publish Now
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteNoticeId(n.id)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CSE 60E Student Roster & Co-CR Management */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                      <h2 className="font-bold text-base">
                        CSE 60E Class Roster & Role Management (Managed by CR)
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                              <th className="py-2 pr-3">Name & Email</th>
                              <th className="py-2 px-3">Student ID</th>
                              <th className="py-2 px-3">Role</th>
                              <th className="py-2 pl-3">Account Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {users.map((u) => (
                              <tr key={u.id}>
                                <td className="py-2.5 pr-3">
                                  <div className="font-semibold">{u.name}</div>
                                  <div className="text-slate-400">{u.email}</div>
                                </td>
                                <td className="py-2.5 px-3 font-mono">{u.studentId}</td>
                                <td className="py-2.5 px-3">
                                  <button
                                    type="button"
                                    disabled={u.id === currentUser.id}
                                    onClick={() => {
                                      const nextRole: UserRole = u.role === 'cr' ? 'student' : 'cr';
                                      setUsers((prev) =>
                                        prev.map((item) =>
                                          item.id === u.id ? { ...item, role: nextRole } : item
                                        )
                                      );
                                      addAuditLog(
                                        'CR_UPDATED_MEMBER_ROLE',
                                        'user',
                                        u.id,
                                        `CR changed ${u.name} role to ${nextRole.toUpperCase()}.`
                                      );
                                      triggerToast(
                                        `Updated ${u.name} role to ${nextRole.toUpperCase()}.`
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded font-bold uppercase ${
                                      u.role === 'cr'
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {u.role === 'cr' ? 'CR (Manager)' : 'Student (Click to Promote)'}
                                  </button>
                                </td>
                                <td className="py-2.5 pl-3">
                                  <button
                                    type="button"
                                    disabled={u.id === currentUser.id}
                                    onClick={() => {
                                      setUsers((prev) =>
                                        prev.map((item) =>
                                          item.id === u.id
                                            ? { ...item, isActive: !item.isActive }
                                            : item
                                        )
                                      );
                                      triggerToast(`Toggled account status for ${u.name}.`);
                                    }}
                                    className={`px-2.5 py-1 rounded font-semibold ${
                                      u.isActive
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {u.isActive ? 'Active' : 'Deactivated'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* System Activity & Audit Trail */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                      <h2 className="font-bold text-base">CR System Activity & Audit Logs</h2>
                      <div className="space-y-2">
                        {auditLogs.slice(0, 10).map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                [{log.action}]
                              </span>{' '}
                              <span className="font-semibold">{log.actorName}</span> ({log.actorRole.toUpperCase()}):{' '}
                              {log.details}
                            </div>
                            <span className="text-slate-400 shrink-0">
                              {formatDhakaDate(log.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ==============================================================
                VIEW 9: USER PROFILE
               ============================================================== */}
            {activeNav === 'profile' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">{currentUser.name}</h1>
                    <p className="text-xs text-slate-500">
                      {currentUser.email} • Role:{' '}
                      {isCR ? 'Class Representative (Full System Manager)' : 'Student'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="text-slate-400">Department</div>
                    <div className="font-bold mt-0.5">
                      {currentUser.departmentCode} (Computer Science & Engineering)
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="text-slate-400">Class Batch</div>
                    <div className="font-bold mt-0.5">{currentUser.classMemberships.join(', ')}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="text-slate-400">Student ID</div>
                    <div className="font-bold mt-0.5">{currentUser.studentId}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="text-slate-400">System Authority</div>
                    <div className="font-bold mt-0.5">
                      {isCR
                        ? 'Full CR Management (Direct Publish, Routine, Calendar & Roster)'
                        : 'Student Read & AI Query Access'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ====================================================================
          MODAL 1: CREATE / EDIT NOTICE (DIRECT CR PUBLICATION)
         ==================================================================== */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">
                {editingNotice ? 'Edit Notice (CR)' : 'Publish Campus Notice (CR — CSE 60E)'}
              </h2>
              <button
                type="button"
                onClick={() => setShowNoticeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveNotice} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Notice Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. CSE-321 Makeup Lecture & Lab Viva Schedule"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as NoticeCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Course Code</label>
                  <select
                    value={formCourseCode}
                    onChange={(e) => setFormCourseCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="CSE-321">CSE-321</option>
                    <option value="CSE-323">CSE-323</option>
                    <option value="CSE-325">CSE-325</option>
                    <option value="CSE-327">CSE-327</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Publication Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as NoticeStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="published">Publish Immediately</option>
                    <option value="draft">Save as Draft</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Notice Body / Announcement Details</label>
                <textarea
                  rows={4}
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Include exact room numbers, dates, syllabus topics, and required student actions..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-semibold mb-1">Optional Event / Deadline Date</label>
                  <input
                    type="datetime-local"
                    value={formEventDate}
                    onChange={(e) => setFormEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                  />
                  <span className="font-semibold">Pin to top of CSE 60E board</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  {editingNotice
                    ? 'Save Changes'
                    : formStatus === 'published'
                    ? 'Publish Notice Directly'
                    : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: ADD ROUTINE SLOT WITH CONFLICT VALIDATION
         ==================================================================== */}
      {showRoutineModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Add Class Routine Slot (CR — CSE 60E)</h2>
              <button
                type="button"
                onClick={() => setShowRoutineModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {routineError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {routineError}
              </div>
            )}
            <form onSubmit={handleAddRoutineSlot} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Day of Week</label>
                  <select
                    value={routineDay}
                    onChange={(e) => setRoutineDay(e.target.value as DayOfWeek)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Course</label>
                  <select
                    value={routineCourse}
                    onChange={(e) => setRoutineCourse(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="CSE-321">CSE-321</option>
                    <option value="CSE-323">CSE-323</option>
                    <option value="CSE-325">CSE-325</option>
                    <option value="CSE-327">CSE-327</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Start Time (24h)</label>
                  <input
                    type="time"
                    value={routineStart}
                    onChange={(e) => setRoutineStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">End Time (24h)</label>
                  <input
                    type="time"
                    value={routineEnd}
                    onChange={(e) => setRoutineEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Room / Lab Location</label>
                <input
                  type="text"
                  value={routineRoom}
                  onChange={(e) => setRoutineRoom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoutineModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold"
                >
                  Validate & Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: ADD ACADEMIC EVENT / DEADLINE
         ==================================================================== */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Add Academic Event or Deadline (CR)</h2>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {eventError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {eventError}
              </div>
            )}
            <form onSubmit={handleAddEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Event Title</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. CSE-325 Quiz 2 on Neural Networks"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as AcademicEventType)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="CT Examination">CT Examination</option>
                    <option value="Midterm Examination">Midterm Examination</option>
                    <option value="Final Examination">Final Examination</option>
                    <option value="Assignment Deadline">Assignment Deadline</option>
                    <option value="Presentation">Presentation</option>
                    <option value="Lab Assessment">Lab Assessment</option>
                    <option value="University Event">University Event</option>
                    <option value="Holiday">Holiday</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Course</label>
                  <select
                    value={eventCourse}
                    onChange={(e) => setEventCourse(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="CSE-321">CSE-321</option>
                    <option value="CSE-323">CSE-323</option>
                    <option value="CSE-325">CSE-325</option>
                    <option value="CSE-327">CSE-327</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Location / Submission Portal</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description / Syllabus Notes</label>
                <textarea
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 4: CONFIRM DESTRUCTIVE NOTICE DELETION
         ==================================================================== */}
      {confirmDeleteNoticeId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              Confirm Notice Deletion
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete this notice? This action cannot be undone and will be recorded in the CR audit trail.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteNoticeId(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteNoticeConfirmed}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
