import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { DepartmentModel } from '../modules/departments/department.model.js';
import { ClassModel } from '../modules/classes/class.model.js';
import { CourseModel } from '../modules/courses/course.model.js';
import { UserModel } from '../modules/users/user.model.js';
import { NoticeModel } from '../modules/notices/notice.model.js';
import { RoutineEntryModel } from '../modules/routine/routine.model.js';
import { EventModel } from '../modules/events/event.model.js';
import { NotificationModel } from '../modules/notifications/notification.model.js';
import { logger } from './logger.js';

async function seedDevelopmentData() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Development seed script must never be run in production.');
  }

  await connectDatabase();
  logger.info('Seeding CampusFlow AI development database for class CSE 60E...');

  await Promise.all([
    DepartmentModel.deleteMany({}),
    ClassModel.deleteMany({}),
    CourseModel.deleteMany({}),
    UserModel.deleteMany({}),
    NoticeModel.deleteMany({}),
    RoutineEntryModel.deleteMany({}),
    EventModel.deleteMany({}),
    NotificationModel.deleteMany({}),
  ]);

  const cseDept = await DepartmentModel.create({
    name: 'Department of Computer Science & Engineering',
    code: 'CSE',
    description: 'Undergraduate & Graduate programs in Computer Science, AI, and Software Systems.',
  });

  const cse60E = await ClassModel.create({
    name: 'CSE 60th Batch — Section E',
    code: 'CSE-60E',
    departmentId: cseDept._id,
    semester: 'Autumn 2026 (6th Semester)',
    academicYear: '2026',
    memberIds: [],
  });

  const cse60F = await ClassModel.create({
    name: 'CSE 60th Batch — Section F',
    code: 'CSE-60F',
    departmentId: cseDept._id,
    semester: 'Autumn 2026 (6th Semester)',
    academicYear: '2026',
    memberIds: [],
  });

  const passwordHash = await bcrypt.hash('CampusFlow#2026', 10);

  const adminUser = await UserModel.create({
    name: process.env.INITIAL_ADMIN_NAME || 'Dr. Mahmudul Hasan (System Admin)',
    email: process.env.INITIAL_ADMIN_EMAIL || 'admin@univ.edu.bd',
    passwordHash,
    role: 'admin',
    departmentId: cseDept._id,
    classMemberships: [cse60E._id, cse60F._id],
    assignedCourseIds: [],
    canPublishDirectly: true,
    publicContactApproved: true,
    isActive: true,
  });

  const teacher1 = await UserModel.create({
    name: 'Dr. Farhana Rahman',
    email: 'farhana.cse@univ.edu.bd',
    passwordHash,
    designation: 'Associate Professor',
    officeRoom: 'Academic Building B, Room 404',
    publicContactApproved: true,
    role: 'teacher',
    departmentId: cseDept._id,
    classMemberships: [cse60E._id],
    assignedCourseIds: [],
    canPublishDirectly: true,
    isActive: true,
  });

  const teacher2 = await UserModel.create({
    name: 'Prof. Tanvir Ahmed',
    email: 'tanvir.cse@univ.edu.bd',
    passwordHash,
    designation: 'Professor',
    officeRoom: 'Academic Building B, Room 512',
    publicContactApproved: true,
    role: 'teacher',
    departmentId: cseDept._id,
    classMemberships: [cse60E._id],
    assignedCourseIds: [],
    canPublishDirectly: true,
    isActive: true,
  });

  const teacher3 = await UserModel.create({
    name: 'Nusrat Jahan',
    email: 'nusrat.cse@univ.edu.bd',
    passwordHash,
    designation: 'Senior Lecturer',
    officeRoom: 'Academic Building B, Room 309',
    publicContactApproved: false, // Private contact test case
    role: 'teacher',
    departmentId: cseDept._id,
    classMemberships: [cse60E._id],
    assignedCourseIds: [],
    canPublishDirectly: true,
    isActive: true,
  });

  const crUser = await UserModel.create({
    name: 'Rafsan Jani (CR - CSE 60E)',
    email: 'rafsan.cr60e@univ.edu.bd',
    passwordHash,
    studentId: '231-115-182',
    role: 'cr',
    departmentId: cseDept._id,
    classMemberships: [cse60E._id],
    assignedCourseIds: [],
    canPublishDirectly: true,
    isActive: true,
  });

  const studentUser = await UserModel.create({
    name: 'Tasnia Kabir',
    email: 'tasnia.60e@univ.edu.bd',
    passwordHash,
    studentId: '231-115-194',
    role: 'student',
    departmentId: cseDept._id,
    classMemberships: [cse60E._id],
    assignedCourseIds: [],
    canPublishDirectly: false,
    isActive: true,
  });

  const courses = await CourseModel.insertMany([
    {
      code: 'CSE-321',
      title: 'Operating Systems & System Programming',
      credits: 3.0,
      departmentId: cseDept._id,
      assignedTeacherIds: [teacher1._id],
      classIds: [cse60E._id],
    },
    {
      code: 'CSE-323',
      title: 'Computer Networks & Distributed Security',
      credits: 3.0,
      departmentId: cseDept._id,
      assignedTeacherIds: [teacher2._id],
      classIds: [cse60E._id],
    },
    {
      code: 'CSE-325',
      title: 'Artificial Intelligence & Machine Learning',
      credits: 3.0,
      departmentId: cseDept._id,
      assignedTeacherIds: [teacher1._id],
      classIds: [cse60E._id],
    },
    {
      code: 'CSE-327',
      title: 'Software Engineering & System Architecture',
      credits: 3.0,
      departmentId: cseDept._id,
      assignedTeacherIds: [teacher3._id],
      classIds: [cse60E._id],
    },
  ]);

  teacher1.assignedCourseIds = [courses[0]._id, courses[2]._id];
  teacher2.assignedCourseIds = [courses[1]._id];
  teacher3.assignedCourseIds = [courses[3]._id];
  await Promise.all([teacher1.save(), teacher2.save(), teacher3.save()]);

  cse60E.memberIds = [crUser._id, studentUser._id];
  await cse60E.save();

  await NoticeModel.insertMany([
    {
      title: 'CSE-321 Class Test 2 (CT-2) Syllabus & Seating Plan for CSE 60E',
      body: 'Class Test 2 for CSE-321 (Operating Systems) will be held on Wednesday, October 21, 2026 from 10:30 AM to 11:20 AM in Room AB-402. Syllabus covers Deadlock Prevention, Banker Algorithm, Paging, and Virtual Memory Replacement Policies. Students must bring their university ID card and non-programmable calculator. No makeup CT will be arranged without prior medical approval.',
      category: 'Examination',
      targetClassIds: [cse60E._id],
      targetCourseIds: [courses[0]._id],
      attachments: [
        {
          name: 'CSE321_CT2_Syllabus_Seating.pdf',
          url: 'https://campusflow.univ.edu.bd/files/CSE321_CT2_Syllabus_Seating.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 245120,
        },
      ],
      authorId: teacher1._id,
      status: 'published',
      isPinned: true,
      publishedAt: new Date('2026-10-15T09:00:00+06:00'),
      eventDate: new Date('2026-10-21T10:30:00+06:00'),
      version: 1,
      readCount: 38,
    },
    {
      title: 'CSE-325 AI Term Project Proposal & GitHub Repository Submission Deadline',
      body: 'All project groups of CSE 60E must submit their CSE-325 (Artificial Intelligence) Term Project Proposal PDF and GitHub repository link by Sunday, October 25, 2026 at 11:59 PM BST. Each group must have 3-4 members from CSE 60E. Late submissions will incur a 15% penalty per day.',
      category: 'Assignment',
      targetClassIds: [cse60E._id],
      targetCourseIds: [courses[2]._id],
      attachments: [],
      authorId: teacher1._id,
      status: 'published',
      isPinned: true,
      publishedAt: new Date('2026-10-14T14:30:00+06:00'),
      eventDate: new Date('2026-10-25T23:59:00+06:00'),
      version: 1,
      readCount: 41,
    },
    {
      title: 'Thursday CSE-323 Lab Room Rescheduled to Networking Lab 2 (AB-305)',
      body: 'Please note that the CSE-323 Computer Networks Lab session for CSE 60E scheduled on Thursdays from 02:00 PM to 04:30 PM has been shifted from Room AB-301 to Networking Lab 2 (Room AB-305) effective from October 22, 2026 due to router hardware upgrades.',
      category: 'Class Routine',
      targetClassIds: [cse60E._id],
      targetCourseIds: [courses[1]._id],
      attachments: [],
      authorId: crUser._id,
      status: 'published',
      isPinned: false,
      publishedAt: new Date('2026-10-16T08:15:00+06:00'),
      version: 1,
      readCount: 29,
    },
  ]);

  await RoutineEntryModel.insertMany([
    {
      classId: cse60E._id,
      courseId: courses[0]._id,
      teacherId: teacher1._id,
      dayOfWeek: 'Sunday',
      startTime: '09:00',
      endTime: '10:20',
      room: 'AB-402',
      recurrence: 'weekly',
      effectiveFrom: new Date('2026-09-01T00:00:00+06:00'),
      status: 'published',
    },
    {
      classId: cse60E._id,
      courseId: courses[1]._id,
      teacherId: teacher2._id,
      dayOfWeek: 'Sunday',
      startTime: '10:30',
      endTime: '11:50',
      room: 'AB-402',
      recurrence: 'weekly',
      effectiveFrom: new Date('2026-09-01T00:00:00+06:00'),
      status: 'published',
    },
    {
      classId: cse60E._id,
      courseId: courses[2]._id,
      teacherId: teacher1._id,
      dayOfWeek: 'Monday',
      startTime: '09:00',
      endTime: '10:20',
      room: 'AB-405',
      recurrence: 'weekly',
      effectiveFrom: new Date('2026-09-01T00:00:00+06:00'),
      status: 'published',
    },
    {
      classId: cse60E._id,
      courseId: courses[0]._id,
      teacherId: teacher1._id,
      dayOfWeek: 'Wednesday',
      startTime: '10:30',
      endTime: '11:50',
      room: 'AB-402',
      recurrence: 'weekly',
      effectiveFrom: new Date('2026-09-01T00:00:00+06:00'),
      status: 'published',
    },
    {
      classId: cse60E._id,
      courseId: courses[1]._id,
      teacherId: teacher2._id,
      dayOfWeek: 'Thursday',
      startTime: '14:00',
      endTime: '16:30',
      room: 'AB-305 (Networking Lab 2)',
      recurrence: 'weekly',
      effectiveFrom: new Date('2026-09-01T00:00:00+06:00'),
      status: 'published',
      changeNote: 'Moved from AB-301 to AB-305 starting Oct 22',
    },
  ]);

  await EventModel.insertMany([
    {
      title: 'CSE-321 Class Test 2 (Operating Systems)',
      description: 'Covers Deadlock, Banker Algorithm, Paging & Virtual Memory in Room AB-402.',
      type: 'CT Examination',
      classIds: [cse60E._id],
      courseIds: [courses[0]._id],
      location: 'Room AB-402',
      startAt: new Date('2026-10-21T10:30:00+06:00'),
      endAt: new Date('2026-10-21T11:20:00+06:00'),
      createdBy: teacher1._id,
      approvalStatus: 'approved',
      hasConflictFlag: false,
    },
    {
      title: 'CSE-325 AI Project Proposal Submission',
      description: 'Submit PDF proposal and GitHub repository link via portal.',
      type: 'Assignment Deadline',
      classIds: [cse60E._id],
      courseIds: [courses[2]._id],
      location: 'Online Portal',
      startAt: new Date('2026-10-25T23:59:00+06:00'),
      createdBy: teacher1._id,
      approvalStatus: 'approved',
      hasConflictFlag: false,
    },
  ]);

  logger.info('Seed completed successfully!', {
    adminEmail: adminUser.email,
    teacherEmail: teacher1.email,
    crEmail: crUser.email,
    studentEmail: studentUser.email,
  });

  await disconnectDatabase();
}

seedDevelopmentData().catch((err) => {
  console.error(err);
  process.exit(1);
});
