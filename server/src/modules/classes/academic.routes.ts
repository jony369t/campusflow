import { Router, Request, Response, NextFunction } from 'express';
import { ClassModel } from './class.model.js';
import { CourseModel } from '../courses/course.model.js';
import { DepartmentModel } from '../departments/department.model.js';
import { UserModel } from '../users/user.model.js';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../utils/errors.js';

export const academicRouter = Router();

academicRouter.get('/departments', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await DepartmentModel.find().sort({ code: 1 }).lean();
    res.json({ success: true, data: { departments } });
  } catch (err) {
    next(err);
  }
});

academicRouter.get('/classes', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const classes = await ClassModel.find()
      .populate('departmentId', 'name code')
      .sort({ code: 1 })
      .lean();
    res.json({ success: true, data: { classes } });
  } catch (err) {
    next(err);
  }
});

academicRouter.get('/courses', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.classId) {
      filter.classIds = req.query.classId;
    }
    const courses = await CourseModel.find(filter)
      .populate('departmentId', 'name code')
      .populate('assignedTeacherIds', 'name designation email officeRoom publicContactApproved')
      .sort({ code: 1 })
      .lean();
    res.json({ success: true, data: { courses } });
  } catch (err) {
    next(err);
  }
});

academicRouter.get('/courses/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await CourseModel.findById(req.params.id)
      .populate('departmentId', 'name code')
      .populate('assignedTeacherIds', 'name designation email officeRoom publicContactApproved')
      .lean();
    if (!course) throw AppError.notFound('Course not found.');
    res.json({ success: true, data: { course } });
  } catch (err) {
    next(err);
  }
});

// GET /api/teachers — Searchable Teacher Directory (redacts unapproved contact info)
academicRouter.get('/teachers', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = (req.query.search as string | undefined)?.trim();
    const filter: Record<string, unknown> = { role: 'teacher', isActive: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
      ];
    }

    const teachers = await UserModel.find(filter)
      .populate('departmentId', 'name code')
      .populate('assignedCourseIds', 'code title')
      .sort({ name: 1 })
      .lean();

    const sanitized = teachers.map((t) => ({
      id: String(t._id),
      name: t.name,
      designation: t.designation || 'Faculty Member',
      department: t.departmentId,
      assignedCourses: t.assignedCourseIds,
      officeRoom: t.publicContactApproved ? t.officeRoom : null,
      email: t.publicContactApproved ? t.email : null,
      publicContactApproved: t.publicContactApproved,
    }));

    res.json({ success: true, data: { teachers: sanitized } });
  } catch (err) {
    next(err);
  }
});
