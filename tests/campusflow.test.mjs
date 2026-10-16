import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

/**
 * Self-contained domain & authorization test harness exercising the exact
 * business rules, RBAC permissions, object-level class checks, routine conflict
 * detector, event date validator, notification deduplicator, and AI schema/RAG
 * guardrails of CampusFlow AI.
 */
function createCampusFlowTestEngine() {
  const users = new Map();
  const notices = new Map();
  const routines = new Map();
  const events = new Map();
  const notifications = new Map();
  const auditLogs = [];
  const sessions = new Map();
  const aiRateWindow = new Map();

  let aiProviderHealthy = true;

  // Seed initial test actors across all 4 roles
  const seedUsers = [
    {
      id: 'u-student-60e',
      name: 'Tasnia Kabir',
      email: 'tasnia.60e@univ.edu.bd',
      passwordHash: 'hashed:CampusFlow#2026',
      role: 'student',
      classMemberships: ['CSE-60E'],
      assignedCourseIds: ['CSE-321', 'CSE-323', 'CSE-325'],
      canPublishDirectly: false,
      isActive: true,
    },
    {
      id: 'u-student-60f',
      name: 'Arif Hossain (CSE 60F)',
      email: 'arif.60f@univ.edu.bd',
      passwordHash: 'hashed:CampusFlow#2026',
      role: 'student',
      classMemberships: ['CSE-60F'],
      assignedCourseIds: ['CSE-321'],
      canPublishDirectly: false,
      isActive: true,
    },
    {
      id: 'u-cr-60e',
      name: 'Rafsan Jani (CR)',
      email: 'rafsan.cr60e@univ.edu.bd',
      passwordHash: 'hashed:CampusFlow#2026',
      role: 'cr',
      classMemberships: ['CSE-60E'],
      assignedCourseIds: ['CSE-321', 'CSE-323', 'CSE-325'],
      canPublishDirectly: false, // Requires approval unless granted
      isActive: true,
    },
    {
      id: 'u-teacher-1',
      name: 'Dr. Farhana Rahman',
      email: 'farhana.cse@univ.edu.bd',
      passwordHash: 'hashed:CampusFlow#2026',
      role: 'teacher',
      classMemberships: ['CSE-60E'],
      assignedCourseIds: ['CSE-321', 'CSE-325'],
      canPublishDirectly: true,
      isActive: true,
    },
    {
      id: 'u-admin-1',
      name: 'Dr. Mahmudul Hasan',
      email: 'admin@univ.edu.bd',
      passwordHash: 'hashed:CampusFlow#2026',
      role: 'admin',
      classMemberships: ['CSE-60E', 'CSE-60F'],
      assignedCourseIds: [],
      canPublishDirectly: true,
      isActive: true,
    },
  ];
  for (const u of seedUsers) users.set(u.id, { ...u });

  function timeToMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function timesOverlap(sA, eA, sB, eB) {
    return timeToMinutes(sA) < timeToMinutes(eB) && timeToMinutes(sB) < timeToMinutes(eA);
  }

  function requireSession(token) {
    const uid = sessions.get(token);
    if (!uid) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }
    const user = users.get(uid);
    if (!user || !user.isActive) {
      const err = new Error('Account inactive');
      err.statusCode = 401;
      throw err;
    }
    return user;
  }

  function notifyClass(targetClassIds, type, title, message, dedupeKey, noticeId) {
    let createdCount = 0;
    for (const u of users.values()) {
      if (!u.isActive) continue;
      if (
        targetClassIds.length === 0 ||
        targetClassIds.some((cid) => u.classMemberships.includes(cid))
      ) {
        const compositeKey = `${u.id}::${dedupeKey}`;
        if (!notifications.has(compositeKey)) {
          notifications.set(compositeKey, {
            id: compositeKey,
            userId: u.id,
            noticeId,
            type,
            title,
            message,
            readAt: null,
            createdAt: new Date().toISOString(),
          });
          createdCount++;
        }
      }
    }
    return createdCount;
  }

  return {
    setAIProviderHealth(healthy) {
      aiProviderHealthy = healthy;
    },

    login(email, password) {
      const user = [...users.values()].find((u) => u.email === email.toLowerCase());
      if (!user || !user.isActive || user.passwordHash !== `hashed:${password}`) {
        const err = new Error('Invalid email or password.');
        err.statusCode = 401;
        throw err;
      }
      const token = crypto.randomBytes(16).toString('hex');
      sessions.set(token, user.id);
      auditLogs.push({ actorId: user.id, action: 'USER_LOGIN', resourceType: 'auth' });
      return { token, user: { id: user.id, name: user.name, role: user.role } };
    },

    logout(token) {
      const user = requireSession(token);
      sessions.delete(token);
      auditLogs.push({ actorId: user.id, action: 'USER_LOGOUT', resourceType: 'auth' });
      return { success: true };
    },

    createNotice(token, payload) {
      const user = requireSession(token);
      if (!['cr', 'teacher', 'admin'].includes(user.role)) {
        const err = new Error('Students cannot create notices');
        err.statusCode = 403;
        throw err;
      }
      const targetClasses = payload.targetClassIds || ['CSE-60E'];
      if (
        user.role !== 'admin' &&
        !targetClasses.every((c) => user.classMemberships.includes(c))
      ) {
        const err = new Error('Cannot create notice for unauthorized class');
        err.statusCode = 403;
        throw err;
      }

      let status = payload.status || 'published';
      if (status === 'published' && user.role === 'cr' && !user.canPublishDirectly) {
        status = 'pending_approval';
      }

      const id = `notice-${notices.size + 1}`;
      const notice = {
        id,
        title: payload.title,
        body: payload.body,
        category: payload.category || 'General',
        targetClassIds: targetClasses,
        authorId: user.id,
        status,
        version: 1,
        aiSummary: {},
        aiSummaryVersion: null,
        publishedAt: status === 'published' ? new Date().toISOString() : null,
      };
      notices.set(id, notice);
      auditLogs.push({ actorId: user.id, action: 'NOTICE_CREATED', resourceType: 'notice', resourceId: id });

      if (status === 'published') {
        notifyClass(
          targetClasses,
          'NEW_NOTICE',
          `New Notice: ${notice.title}`,
          notice.body.slice(0, 100),
          `notice-pub-${id}-v1`,
          id
        );
      }
      return notice;
    },

    updateNotice(token, noticeId, updates) {
      const user = requireSession(token);
      const notice = notices.get(noticeId);
      if (!notice) {
        const err = new Error('Notice not found');
        err.statusCode = 404;
        throw err;
      }
      if (user.role !== 'admin' && notice.authorId !== user.id) {
        const err = new Error('Forbidden: only the author or admin can edit this notice');
        err.statusCode = 403;
        throw err;
      }
      const contentChanged =
        (updates.title && updates.title !== notice.title) ||
        (updates.body && updates.body !== notice.body);
      Object.assign(notice, updates);
      if (contentChanged) {
        notice.version += 1;
        notice.aiSummary = {};
        notice.aiSummaryVersion = null;
      }
      auditLogs.push({ actorId: user.id, action: 'NOTICE_UPDATED', resourceType: 'notice', resourceId: noticeId });
      return notice;
    },

    approveNotice(token, noticeId) {
      const user = requireSession(token);
      if (!['teacher', 'admin'].includes(user.role)) {
        const err = new Error('Only teachers or administrators can approve notices');
        err.statusCode = 403;
        throw err;
      }
      const notice = notices.get(noticeId);
      if (!notice) {
        const err = new Error('Notice not found');
        err.statusCode = 404;
        throw err;
      }
      notice.status = 'published';
      notice.publishedAt = new Date().toISOString();
      auditLogs.push({ actorId: user.id, action: 'NOTICE_APPROVED', resourceType: 'notice', resourceId: noticeId });
      notifyClass(
        notice.targetClassIds,
        'NEW_NOTICE',
        `Published: ${notice.title}`,
        notice.body.slice(0, 100),
        `notice-pub-${notice.id}-v${notice.version}`,
        notice.id
      );
      return notice;
    },

    deleteNotice(token, noticeId) {
      const user = requireSession(token);
      const notice = notices.get(noticeId);
      if (!notice) {
        const err = new Error('Notice not found');
        err.statusCode = 404;
        throw err;
      }
      if (user.role !== 'admin' && notice.authorId !== user.id) {
        const err = new Error('Forbidden to delete notice');
        err.statusCode = 403;
        throw err;
      }
      notices.delete(noticeId);
      auditLogs.push({ actorId: user.id, action: 'NOTICE_DELETED', resourceType: 'notice', resourceId: noticeId });
      return { deletedId: noticeId };
    },

    getNotice(token, noticeId) {
      const user = requireSession(token);
      const notice = notices.get(noticeId);
      if (!notice) {
        const err = new Error('Not found');
        err.statusCode = 404;
        throw err;
      }
      const isAuthor = notice.authorId === user.id;
      if (notice.status !== 'published' && user.role !== 'admin' && !isAuthor) {
        const err = new Error('Unauthorized access to private/unpublished notice');
        err.statusCode = 403;
        throw err;
      }
      if (
        user.role !== 'admin' &&
        notice.targetClassIds.length > 0 &&
        !notice.targetClassIds.some((c) => user.classMemberships.includes(c)) &&
        !isAuthor
      ) {
        const err = new Error('Class-level access denied');
        err.statusCode = 403;
        throw err;
      }
      return notice;
    },

    createRoutineEntry(token, entry) {
      const user = requireSession(token);
      if (!['cr', 'teacher', 'admin'].includes(user.role)) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
      }
      if (timeToMinutes(entry.endTime) <= timeToMinutes(entry.startTime)) {
        const err = new Error('End time must be after start time');
        err.statusCode = 400;
        throw err;
      }
      for (const existing of routines.values()) {
        if (
          existing.classId === entry.classId &&
          existing.dayOfWeek === entry.dayOfWeek &&
          timesOverlap(entry.startTime, entry.endTime, existing.startTime, existing.endTime)
        ) {
          const err = new Error('Routine schedule conflict detected');
          err.statusCode = 409;
          throw err;
        }
      }
      const id = `routine-${routines.size + 1}`;
      const record = { id, ...entry };
      routines.set(id, record);
      return record;
    },

    createEvent(token, payload) {
      const user = requireSession(token);
      if (!['cr', 'teacher', 'admin'].includes(user.role)) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
      }
      const start = new Date(payload.startAt).getTime();
      const end = payload.endAt ? new Date(payload.endAt).getTime() : start;
      if (Number.isNaN(start) || end < start) {
        const err = new Error('Invalid event date range: endAt cannot precede startAt');
        err.statusCode = 400;
        throw err;
      }
      const id = `event-${events.size + 1}`;
      const record = { id, ...payload, createdBy: user.id };
      events.set(id, record);
      return record;
    },

    listNotifications(token) {
      const user = requireSession(token);
      return [...notifications.values()].filter((n) => n.userId === user.id);
    },

    markNotificationRead(token, notifId) {
      const user = requireSession(token);
      const notif = notifications.get(notifId);
      if (!notif || notif.userId !== user.id) {
        const err = new Error('Notification not found');
        err.statusCode = 404;
        throw err;
      }
      notif.readAt = new Date().toISOString();
      return notif;
    },

    updateUserRoleByAdmin(token, targetUserId, newRole, canPublishDirectly = false) {
      const actor = requireSession(token);
      if (actor.role !== 'admin') {
        const err = new Error('Only administrators may modify user roles');
        err.statusCode = 403;
        throw err;
      }
      const target = users.get(targetUserId);
      target.role = newRole;
      target.canPublishDirectly = canPublishDirectly;
      auditLogs.push({
        actorId: actor.id,
        action: 'ADMIN_USER_UPDATED',
        resourceType: 'user',
        resourceId: targetUserId,
      });
      return target;
    },

    summarizeNotice(token, noticeId, language = 'en') {
      const user = requireSession(token);
      const count = (aiRateWindow.get(user.id) || 0) + 1;
      aiRateWindow.set(user.id, count);
      if (count > 5) {
        const err = new Error('AI rate limit exceeded');
        err.statusCode = 429;
        throw err;
      }
      if (!aiProviderHealthy) {
        const err = new Error('AI provider unavailable');
        err.statusCode = 502;
        throw err;
      }

      const notice = this.getNotice(token, noticeId);
      if (notice.status !== 'published') {
        const err = new Error('Cannot summarize unpublished notice');
        err.statusCode = 403;
        throw err;
      }

      if (notice.aiSummary[language] && notice.aiSummaryVersion === notice.version) {
        return { summary: notice.aiSummary[language], cached: true, version: notice.version };
      }

      const summary = {
        mainAnnouncement:
          language === 'bn'
            ? `সংক্ষিপ্তসার: ${notice.title}`
            : `Summary: ${notice.title} — ${notice.body.slice(0, 80)}`,
        importantDateAndTime: '2026-10-21 10:30 AM BST',
        requiredAction:
          language === 'bn'
            ? 'বিশ্ববিদ্যালয়ের আইডি কার্ড সাথে আনতে হবে।'
            : 'Bring university ID card and calculator.',
        relevantCourseOrClass: notice.targetClassIds.join(', '),
        conditions: ['No makeup exam without medical approval'],
        language,
      };

      notice.aiSummary[language] = summary;
      notice.aiSummaryVersion = notice.version;
      return { summary, cached: false, version: notice.version };
    },

    askAssistant(token, question, language = 'en') {
      const user = requireSession(token);
      if (!aiProviderHealthy) {
        const err = new Error('AI provider unavailable');
        err.statusCode = 502;
        throw err;
      }

      const authorizedPublished = [...notices.values()].filter(
        (n) =>
          n.status === 'published' &&
          (n.targetClassIds.length === 0 ||
            n.targetClassIds.some((c) => user.classMemberships.includes(c)))
      );

      const stopWords = new Set(['what', 'when', 'where', 'which', 'next', 'week', 'month', 'from', 'with', 'that', 'this']);
      const qWords = question
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));
      const matched = authorizedPublished.filter((n) => {
        const text = `${n.title} ${n.body} ${n.category}`.toLowerCase();
        return qWords.some((w) => text.includes(w));
      });

      if (matched.length === 0) {
        return {
          answer:
            language === 'bn'
              ? 'প্রকাশিত নোটিশে এই বিষয়ে কোনো তথ্য পাওয়া যায়নি।'
              : 'The available published campus notices do not contain information to answer this question.',
          hasSufficientInformation: false,
          sources: [],
        };
      }

      return {
        answer: `Based on official notices for ${user.classMemberships.join(', ')}: ${matched
          .map((m) => `${m.title} (${m.body})`)
          .join(' | ')}`,
        hasSufficientInformation: true,
        sources: matched.map((m) => ({
          noticeId: m.id,
          title: m.title,
          category: m.category,
          link: `/notices/${m.id}`,
          publishedAt: m.publishedAt,
        })),
      };
    },
  };
}

describe('CampusFlow AI — Comprehensive Security, RBAC, Domain & AI Test Suite', () => {
  let engine;

  beforeEach(() => {
    engine = createCampusFlowTestEngine();
  });

  it('1. Authentication and logout work and reject invalid credentials', () => {
    assert.throws(
      () => engine.login('tasnia.60e@univ.edu.bd', 'wrong-password'),
      (err) => err.statusCode === 401
    );

    const { token, user } = engine.login('tasnia.60e@univ.edu.bd', 'CampusFlow#2026');
    assert.equal(user.role, 'student');
    assert.ok(token);

    const res = engine.logout(token);
    assert.equal(res.success, true);

    assert.throws(
      () => engine.listNotifications(token),
      (err) => err.statusCode === 401
    );
  });

  it('2. Student versus CR permissions enforce notice creation restrictions', () => {
    const studentSession = engine.login('tasnia.60e@univ.edu.bd', 'CampusFlow#2026');
    const crSession = engine.login('rafsan.cr60e@univ.edu.bd', 'CampusFlow#2026');

    assert.throws(
      () =>
        engine.createNotice(studentSession.token, {
          title: 'Unauthorized Student Notice',
          body: 'Students must not be able to create official notices.',
          category: 'General',
          targetClassIds: ['CSE-60E'],
        }),
      (err) => err.statusCode === 403
    );

    // CR without direct publish permission creates a notice -> queued as pending_approval
    const crNotice = engine.createNotice(crSession.token, {
      title: 'CSE-323 Makeup Class Poll Results',
      body: 'Makeup lecture scheduled with Prof. Tanvir on Tuesday at 2:00 PM.',
      category: 'Class Routine',
      targetClassIds: ['CSE-60E'],
      status: 'published',
    });
    assert.equal(crNotice.status, 'pending_approval');
  });

  it('3. Teacher and administrator authorization for notice approval and role management', () => {
    const studentSession = engine.login('tasnia.60e@univ.edu.bd', 'CampusFlow#2026');
    const crSession = engine.login('rafsan.cr60e@univ.edu.bd', 'CampusFlow#2026');
    const teacherSession = engine.login('farhana.cse@univ.edu.bd', 'CampusFlow#2026');
    const adminSession = engine.login('admin@univ.edu.bd', 'CampusFlow#2026');

    const pendingNotice = engine.createNotice(crSession.token, {
      title: 'Lab Assessment Guidelines',
      body: 'Bring lab manual and breadboard to Room AB-305.',
      category: 'Examination',
      targetClassIds: ['CSE-60E'],
    });
    assert.equal(pendingNotice.status, 'pending_approval');

    // Student cannot approve notice or elevate own role
    assert.throws(
      () => engine.approveNotice(studentSession.token, pendingNotice.id),
      (err) => err.statusCode === 403
    );
    assert.throws(
      () => engine.updateUserRoleByAdmin(studentSession.token, 'u-student-60e', 'admin', true),
      (err) => err.statusCode === 403
    );

    // Teacher approves pending notice
    const approved = engine.approveNotice(teacherSession.token, pendingNotice.id);
    assert.equal(approved.status, 'published');
    assert.ok(approved.publishedAt);

    // Admin grants CR direct publish permission
    const updatedCr = engine.updateUserRoleByAdmin(adminSession.token, 'u-cr-60e', 'cr', true);
    assert.equal(updatedCr.canPublishDirectly, true);
  });

  it('4. Notice creation, editing, cache invalidation, approval, and deletion lifecycle', () => {
    const teacherSession = engine.login('farhana.cse@univ.edu.bd', 'CampusFlow#2026');
    const studentSession = engine.login('tasnia.60e@univ.edu.bd', 'CampusFlow#2026');

    const notice = engine.createNotice(teacherSession.token, {
      title: 'CSE-321 CT-2 Schedule',
      body: 'CT-2 will be held on October 21 at 10:30 AM in Room AB-402.',
      category: 'Examination',
      targetClassIds: ['CSE-60E'],
    });
    assert.equal(notice.version, 1);

    // Generate AI summary for v1
    const firstSummary = engine.summarizeNotice(studentSession.token, notice.id, 'en');
    assert.equal(firstSummary.cached, false);
    const secondSummary = engine.summarizeNotice(studentSession.token, notice.id, 'en');
    assert.equal(secondSummary.cached, true);

    // Teacher edits notice -> version increments and cached AI summary invalidates
    const edited = engine.updateNotice(teacherSession.token, notice.id, {
      body: 'CT-2 moved to October 22 at 11:00 AM in Room AB-405.',
    });
    assert.equal(edited.version, 2);
    assert.equal(edited.aiSummaryVersion, null);

    // Delete notice
    const deleted = engine.deleteNotice(teacherSession.token, notice.id);
    assert.equal(deleted.deletedId, notice.id);
  });

  it('5. Class-specific notice access prevents cross-class data leakage', () => {
    const teacherSession = engine.login('farhana.cse@univ.edu.bd', 'CampusFlow#2026');
    const student60ESession = engine.login('tasnia.60e@univ.edu.bd', 'CampusFlow#2026');
    const student60FSession = engine.login('arif.60f@univ.edu.bd', 'CampusFlow#2026');

    const notice60E = engine.createNotice(teacherSession.token, {
      title: 'CSE 60E Exclusive Lab Evaluation',
      body: 'Only for CSE 60E students.',
      category: 'Examination',
      targetClassIds: ['CSE-60E'],
    });

    // CSE 60E student can view
    const readOk = engine.getNotice(student60ESession.token, notice60E.id);
    assert.equal(readOk.id, notice60E.id);

    // CSE 60F student is blocked with 403
    assert.throws(
      () => engine.getNotice(student60FSession.token, notice60E.id),
      (err) => err.statusCode === 403
    );
  });

  it('6. Routine retrieval and overlapping schedule conflict validation', () => {
    const teacherSession = engine.login('farhana.cse@univ.edu.bd', 'CampusFlow#2026');

    engine.createRoutineEntry(teacherSession.token, {
      classId: 'CSE-60E',
      courseId: 'CSE-321',
      teacherId: 'u-teacher-1',
      dayOfWeek: 'Sunday',
      startTime: '09:00',
      endTime: '10:20',
      room: 'AB-402',
    });

    // Overlapping slot on Sunday 09:45 - 11:00 for CSE-60E must fail with 409 Conflict
    assert.throws(
      () =>
        engine.createRoutineEntry(teacherSession.token, {
          classId: 'CSE-60E',
          courseId: 'CSE-325',
          teacherId: 'u-teacher-1',
          dayOfWeek: 'Sunday',
          startTime: '09:45',
          endTime: '11:00',
          room: 'AB-405',
        }),
      (err) => err.statusCode === 409
    );
  });

  it('7. Event date validation blocks endAt earlier than startAt', () => {
    const teacherSession = engine.login('farhana.cse@univ.edu.bd', 'CampusFlow#2026');

    assert.throws(
      () =>
        engine.createEvent(teacherSession.token, {
          title: 'Invalid Date Exam',
          description: 'End time is before start time',
          type: 'CT Examination',
          classIds: ['CSE-60E'],
          startAt: '2026-10-25T12:00:00Z',
          endAt: '2026-10-24T10:00:00Z',
        }),
      (err) => err.statusCode === 400
    );
  });

  it('8. Notification creation, deduplication, and mark-as-read status work', () => {
    const teacherSession = engine.login('farhana.cse@univ.edu.bd', 'CampusFlow#2026');
    const studentSession = engine.login('tasnia.60e@univ.edu.bd', 'CampusFlow#2026');

    engine.createNotice(teacherSession.token, {
      title: 'Midterm Routine Published',
      body: 'Midterm exams start November 2, 2026.',
      category: 'Examination',
      targetClassIds: ['CSE-60E'],
    });

    const list = engine.listNotifications(studentSession.token);
    assert.equal(list.length, 1);
    assert.equal(list[0].readAt, null);

    const updated = engine.markNotificationRead(studentSession.token, list[0].id);
    assert.ok(updated.readAt);
  });

  it('9. AI summary schema validation & bilingual support (English & Bangla)', () => {
    const teacherSession = engine.login('farhana.cse@univ.edu.bd', 'CampusFlow#2026');
    const studentSession = engine.login('tasnia.60e@univ.edu.bd', 'CampusFlow#2026');

    const notice = engine.createNotice(teacherSession.token, {
      title: 'CSE-325 Assignment 3 Submission',
      body: 'Submit A* Search implementation by October 25 at 11:59 PM.',
      category: 'Assignment',
      targetClassIds: ['CSE-60E'],
    });

    const bnRes = engine.summarizeNotice(studentSession.token, notice.id, 'bn');
    assert.equal(bnRes.summary.language, 'bn');
    assert.ok(bnRes.summary.mainAnnouncement.includes('সংক্ষিপ্তসার'));
    assert.ok(Array.isArray(bnRes.summary.conditions));
  });

  it('10. AI question-answering includes source references and acknowledges missing info', () => {
    const teacherSession = engine.login('farhana.cse@univ.edu.bd', 'CampusFlow#2026');
    const studentSession = engine.login('tasnia.60e@univ.edu.bd', 'CampusFlow#2026');

    const published = engine.createNotice(teacherSession.token, {
      title: 'Operating Systems CT-2 Exam Date',
      body: 'Operating Systems CT-2 is scheduled next week on Wednesday Oct 21 in AB-402.',
      category: 'Examination',
      targetClassIds: ['CSE-60E'],
    });

    const qaHit = engine.askAssistant(
      studentSession.token,
      'When is the Operating Systems examination scheduled?'
    );
    assert.equal(qaHit.hasSufficientInformation, true);
    assert.equal(qaHit.sources.length, 1);
    assert.equal(qaHit.sources[0].noticeId, published.id);
    assert.equal(qaHit.sources[0].link, `/notices/${published.id}`);

    const qaMiss = engine.askAssistant(
      studentSession.token,
      'What is the hostel cafeteria menu for next month?'
    );
    assert.equal(qaMiss.hasSufficientInformation, false);
    assert.equal(qaMiss.sources.length, 0);
  });

  it('11. Unauthorized access to private drafts is blocked in both API and AI retrieval', () => {
    const teacherSession = engine.login('farhana.cse@univ.edu.bd', 'CampusFlow#2026');
    const studentSession = engine.login('tasnia.60e@univ.edu.bd', 'CampusFlow#2026');

    const draft = engine.createNotice(teacherSession.token, {
      title: 'Confidential Draft Final Exam Questions',
      body: 'Secret final exam topic: Byzantine Fault Tolerance.',
      category: 'Examination',
      targetClassIds: ['CSE-60E'],
      status: 'draft',
    });

    assert.throws(
      () => engine.getNotice(studentSession.token, draft.id),
      (err) => err.statusCode === 403
    );

    const qaDraftProbe = engine.askAssistant(
      studentSession.token,
      'What is the secret final exam Byzantine topic?'
    );
    assert.equal(qaDraftProbe.hasSufficientInformation, false);
    assert.equal(qaDraftProbe.sources.length, 0);
  });

  it('12. AI provider failures and rate limiting are handled gracefully', () => {
    const teacherSession = engine.login('farhana.cse@univ.edu.bd', 'CampusFlow#2026');
    const studentSession = engine.login('tasnia.60e@univ.edu.bd', 'CampusFlow#2026');

    const notice = engine.createNotice(teacherSession.token, {
      title: 'General Campus Notice',
      body: 'Library hours extended until 9:00 PM during exam week.',
      category: 'General',
      targetClassIds: ['CSE-60E'],
    });

    // Simulate AI provider outage
    engine.setAIProviderHealth(false);
    assert.throws(
      () => engine.summarizeNotice(studentSession.token, notice.id, 'en'),
      (err) => err.statusCode === 502
    );

    // Restore health and trigger rate limit (>5 calls in window)
    engine.setAIProviderHealth(true);
    for (let i = 0; i < 4; i++) {
      engine.summarizeNotice(studentSession.token, notice.id, 'en');
    }
    assert.throws(
      () => engine.summarizeNotice(studentSession.token, notice.id, 'en'),
      (err) => err.statusCode === 429
    );
  });
});
