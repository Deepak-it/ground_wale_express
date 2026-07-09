const mongoose = require('mongoose');

const Academy = require('../models/Academy');
const AcademyBatch = require('../models/AcademyBatch');
const AcademyStudent = require('../models/AcademyStudent');
const AcademyFee = require('../models/AcademyFee');
const AcademyAttendance = require('../models/AcademyAttendance');
const AcademyAnnouncement = require('../models/AcademyAnnouncement');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

function toObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw httpError(400, `Invalid ${fieldName}`);
  }
  return new mongoose.Types.ObjectId(value);
}

function normalizeDay(value) {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function academyIdFromRequest(req) {
  const raw = req.query.academyId || req.body?.academyId;
  if (!raw) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(raw)) {
    throw httpError(400, 'Invalid academyId');
  }
  return new mongoose.Types.ObjectId(raw);
}

async function ensureDefaultAcademy(ownerId) {
  const existing = await Academy.findOne({ ownerId }).sort({ createdAt: 1 });
  if (existing) {
    return existing;
  }
  return Academy.create({
    ownerId,
    name: 'Main Academy',
    status: 'active',
  });
}

async function resolveScopedAcademyId(req, ownerId, { createIfMissing = false } = {}) {
  const provided = academyIdFromRequest(req);
  if (provided) {
    const valid = await Academy.findOne({ _id: provided, ownerId }).select('_id');
    if (!valid) {
      throw httpError(404, 'Academy not found');
    }
    return provided;
  }
  if (!createIfMissing) {
    return null;
  }
  const academy = await ensureDefaultAcademy(ownerId);
  return academy._id;
}

function sanitizeBatchPayload(body, { partial = false } = {}) {
  const payload = { ...body };
  delete payload.ownerId;
  delete payload._id;

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    payload.name = String(payload.name || '').trim();
  }

  if (!partial && !payload.name) {
    throw httpError(400, 'name is required');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'coachName')) {
    payload.coachName = String(payload.coachName || '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'days')) {
    payload.days = Array.isArray(payload.days)
      ? payload.days.map((day) => String(day).trim()).filter(Boolean)
      : [];
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'capacity')) {
    const parsed = Number(payload.capacity);
    payload.capacity = Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 30;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'monthlyFee')) {
    const parsed = Number(payload.monthlyFee);
    payload.monthlyFee = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    payload.status = String(payload.status || '').toLowerCase() === 'inactive'
      ? 'inactive'
      : 'active';
  }

  return payload;
}

function sanitizeAnnouncementPayload(body, { partial = false } = {}) {
  const payload = { ...body };
  delete payload.ownerId;
  delete payload._id;

  if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
    payload.title = String(payload.title || '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'message')) {
    payload.message = String(payload.message || '').trim();
  }

  if (!partial) {
    if (!payload.title) {
      throw httpError(400, 'title is required');
    }
    if (!payload.message) {
      throw httpError(400, 'message is required');
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'kind')) {
    const kind = String(payload.kind || '').toLowerCase();
    payload.kind = ['fees', 'schedule', 'holiday', 'general'].includes(kind)
      ? kind
      : 'general';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'audience')) {
    const audience = String(payload.audience || '').toLowerCase();
    payload.audience = ['all', 'morning', 'evening', 'batch'].includes(audience)
      ? audience
      : 'all';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'batchId')) {
    if (payload.batchId) {
      if (!mongoose.Types.ObjectId.isValid(payload.batchId)) {
        throw httpError(400, 'Invalid batchId');
      }
      payload.batchId = new mongoose.Types.ObjectId(payload.batchId);
      payload.audience = 'batch';
    } else {
      payload.batchId = undefined;
      if (payload.audience === 'batch') {
        payload.audience = 'all';
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    const status = String(payload.status || '').toLowerCase();
    payload.status = ['scheduled', 'sent'].includes(status) ? status : 'sent';
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'scheduledAt')) {
    const date = payload.scheduledAt ? new Date(payload.scheduledAt) : null;
    payload.scheduledAt = date && !Number.isNaN(date.getTime()) ? date : undefined;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'sentAt')) {
    const date = payload.sentAt ? new Date(payload.sentAt) : null;
    payload.sentAt = date && !Number.isNaN(date.getTime()) ? date : undefined;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'seenStudents')) {
    payload.seenStudents = Array.isArray(payload.seenStudents)
      ? payload.seenStudents
        .map((item) => ({
          name: String(item?.name || '').trim(),
          time: item?.time ? String(item.time).trim() : undefined,
        }))
        .filter((item) => item.name)
      : [];
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'notSeenStudents')) {
    payload.notSeenStudents = Array.isArray(payload.notSeenStudents)
      ? payload.notSeenStudents
        .map((item) => ({
          name: String(item?.name || '').trim(),
          time: item?.time ? String(item.time).trim() : undefined,
        }))
        .filter((item) => item.name)
      : [];
  }

  return payload;
}

exports.listAcademies = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const items = await Academy.find({ ownerId }).sort({ createdAt: 1 });
  res.json(items);
});

exports.createAcademy = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const name = String(req.body?.name || '').trim();
  if (!name) {
    throw httpError(400, 'name is required');
  }
  const item = await Academy.create({
    ownerId,
    name,
    city: String(req.body?.city || '').trim(),
    status: String(req.body?.status || '').toLowerCase() === 'inactive' ? 'inactive' : 'active',
  });
  res.status(201).json(item);
});

exports.getDashboard = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const fallbackMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const requestedMonthKey = String(req.query.monthKey || '').trim();
  const monthKey = /^\d{4}-\d{2}$/.test(requestedMonthKey) ? requestedMonthKey : fallbackMonthKey;

  let selectedBatchId;
  if (req.query.batchId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.batchId)) {
      throw httpError(400, 'Invalid batchId');
    }
    selectedBatchId = new mongoose.Types.ObjectId(req.query.batchId);
  }

  const studentQuery = { ownerId };
  if (selectedAcademyId) {
    studentQuery.academyId = selectedAcademyId;
  }
  if (selectedBatchId) {
    studentQuery.batchId = selectedBatchId;
  }

  const [totalStudents, activeStudents] = await Promise.all([
    AcademyStudent.countDocuments(studentQuery),
    AcademyStudent.countDocuments({ ...studentQuery, status: 'active' }),
  ]);

  let monthFees = [];
  if (selectedBatchId) {
    const batchStudents = await AcademyStudent.find({
      ownerId,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
      batchId: selectedBatchId,
    }).select('_id');
    const studentIds = batchStudents.map((student) => student._id);
    if (studentIds.length > 0) {
      monthFees = await AcademyFee.find({
        ownerId,
        ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
        monthKey,
        studentId: { $in: studentIds },
      });
    }
  } else {
    monthFees = await AcademyFee.find({
      ownerId,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
      monthKey,
    });
  }

  const today = normalizeDay();
  let present = 0;
  let absent = 0;

  if (selectedBatchId) {
    const todayAttendance = await AcademyAttendance.findOne({
      ownerId,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
      batchId: selectedBatchId,
      date: today,
    });
    present = (todayAttendance?.entries || []).filter((entry) => entry.status === 'present').length;
    absent = (todayAttendance?.entries || []).filter((entry) => entry.status === 'absent').length;
  } else {
    const attendanceItems = await AcademyAttendance.find({
      ownerId,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
      date: today,
    });
    for (const item of attendanceItems) {
      present += (item.entries || []).filter((entry) => entry.status === 'present').length;
      absent += (item.entries || []).filter((entry) => entry.status === 'absent').length;
    }
  }

  const paidStudents = monthFees.filter((fee) => fee.status === 'paid').length;
  const pendingStudents = monthFees.filter((fee) => fee.status !== 'paid').length;
  const pendingAmount = monthFees.reduce((sum, fee) => sum + Math.max((fee.amount || 0) - (fee.paidAmount || 0), 0), 0);
  const collectedAmount = monthFees.reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);

  res.json({
    students: {
      total: totalStudents,
      active: activeStudents,
    },
    fees: {
      paidStudents,
      pendingStudents,
      pendingAmount,
      collectedAmount,
    },
    attendanceToday: {
      present,
      absent,
    },
    thisMonthEarnings: collectedAmount,
  });
});

exports.listStudents = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

  const query = { ownerId };
  if (selectedAcademyId) {
    query.academyId = selectedAcademyId;
  }

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.batchId && mongoose.Types.ObjectId.isValid(req.query.batchId)) {
    query.batchId = new mongoose.Types.ObjectId(req.query.batchId);
  }

  if (req.query.search) {
    query.fullName = { $regex: req.query.search, $options: 'i' };
  }

  const [items, total] = await Promise.all([
    AcademyStudent.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AcademyStudent.countDocuments(query),
  ]);

  res.json({ items, total, page, limit });
});

exports.createStudent = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const academyId = await resolveScopedAcademyId(req, ownerId, { createIfMissing: true });
  const payload = { ...req.body, ownerId, academyId };

  if (!payload.fullName || !String(payload.fullName).trim()) {
    throw httpError(400, 'fullName is required');
  }

  if (payload.batchId && mongoose.Types.ObjectId.isValid(payload.batchId)) {
    const batch = await AcademyBatch.findOne({ _id: payload.batchId, ownerId, academyId });
    if (batch) {
      payload.batchId = batch._id;
      payload.batchName = batch.name;
    } else {
      payload.batchId = undefined;
    }
  } else {
    payload.batchId = undefined;
  }

  const student = await AcademyStudent.create(payload);
  res.status(201).json(student);
});

exports.getStudent = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const student = await AcademyStudent.findOne({
    _id: req.params.studentId,
    ownerId,
    ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
  });

  if (!student) {
    throw httpError(404, 'Student not found');
  }

  res.json(student);
});

exports.updateStudent = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const payload = { ...req.body };

  if (payload.batchId && mongoose.Types.ObjectId.isValid(payload.batchId)) {
    const batch = await AcademyBatch.findOne({
      _id: payload.batchId,
      ownerId,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
    });
    if (batch) {
      payload.batchId = batch._id;
      payload.batchName = batch.name;
    } else {
      payload.batchId = undefined;
    }
  }

  const student = await AcademyStudent.findOneAndUpdate(
    {
      _id: req.params.studentId,
      ownerId,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
    },
    payload,
    { new: true, runValidators: true },
  );

  if (!student) {
    throw httpError(404, 'Student not found');
  }

  res.json(student);
});

exports.deleteStudent = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const student = await AcademyStudent.findOneAndDelete({
    _id: req.params.studentId,
    ownerId,
    ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
  });

  if (!student) {
    throw httpError(404, 'Student not found');
  }

  await AcademyFee.deleteMany({
    ownerId,
    studentId: student._id,
    ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
  });

  res.status(204).send();
});

exports.listBatches = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const query = { ownerId };
  if (selectedAcademyId) {
    query.academyId = selectedAcademyId;
  }

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: 'i' };
  }

  const batches = await AcademyBatch.find(query).sort({ createdAt: -1 });
  res.json(batches);
});

exports.createBatch = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const academyId = await resolveScopedAcademyId(req, ownerId, { createIfMissing: true });
  const payload = sanitizeBatchPayload(req.body);
  const batch = await AcademyBatch.create({ ...payload, ownerId, academyId });
  res.status(201).json(batch);
});

exports.getBatch = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const batch = await AcademyBatch.findOne({
    _id: req.params.batchId,
    ownerId,
    ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
  });

  if (!batch) {
    throw httpError(404, 'Batch not found');
  }

  res.json(batch);
});

exports.updateBatch = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const payload = sanitizeBatchPayload(req.body, { partial: true });
  const batch = await AcademyBatch.findOneAndUpdate(
    {
      _id: req.params.batchId,
      ownerId,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
    },
    payload,
    { new: true, runValidators: true },
  );

  if (!batch) {
    throw httpError(404, 'Batch not found');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'name') && payload.name) {
    await AcademyStudent.updateMany(
      {
        ownerId,
        batchId: batch._id,
        ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
      },
      { $set: { batchName: payload.name } },
    );
  }

  res.json(batch);
});

exports.deleteBatch = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const batch = await AcademyBatch.findOneAndDelete({
    _id: req.params.batchId,
    ownerId,
    ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
  });

  if (!batch) {
    throw httpError(404, 'Batch not found');
  }

  await AcademyStudent.updateMany(
    {
      ownerId,
      batchId: batch._id,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
    },
    { $set: { batchId: null, batchName: '' } },
  );

  res.status(204).send();
});

exports.listAttendance = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const query = { ownerId };
  if (selectedAcademyId) {
    query.academyId = selectedAcademyId;
  }

  if (req.query.batchId && mongoose.Types.ObjectId.isValid(req.query.batchId)) {
    query.batchId = new mongoose.Types.ObjectId(req.query.batchId);
  }

  if (req.query.dateFrom || req.query.dateTo) {
    query.date = {};
    if (req.query.dateFrom) {
      query.date.$gte = normalizeDay(req.query.dateFrom);
    }
    if (req.query.dateTo) {
      query.date.$lte = normalizeDay(req.query.dateTo);
    }
  }

  const attendance = await AcademyAttendance.find(query)
    .sort({ date: -1 })
    .populate('entries.studentId', '_id fullName');

  res.json(attendance);
});

exports.markAttendance = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const academyId = await resolveScopedAcademyId(req, ownerId, { createIfMissing: true });

  if (!req.body.batchId || !mongoose.Types.ObjectId.isValid(req.body.batchId)) {
    throw httpError(400, 'Valid batchId is required');
  }

  const normalizedEntries = (req.body.entries || []).map((entry) => {
    if (!entry.studentId || !mongoose.Types.ObjectId.isValid(entry.studentId)) {
      throw httpError(400, 'Valid studentId is required in entries');
    }

    return {
      studentId: new mongoose.Types.ObjectId(entry.studentId),
      status: entry.status || 'absent',
    };
  });

  const attendance = await AcademyAttendance.findOneAndUpdate(
    {
      ownerId,
      academyId,
      batchId: new mongoose.Types.ObjectId(req.body.batchId),
      date: normalizeDay(req.body.date),
    },
    {
      $set: {
        entries: normalizedEntries,
        date: normalizeDay(req.body.date),
      },
    },
    { upsert: true, new: true, runValidators: true },
  ).populate('entries.studentId', '_id fullName');

  res.json(attendance);
});

exports.listFees = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const query = { ownerId };
  if (selectedAcademyId) {
    query.academyId = selectedAcademyId;
  }

  if (req.query.studentId && mongoose.Types.ObjectId.isValid(req.query.studentId)) {
    query.studentId = new mongoose.Types.ObjectId(req.query.studentId);
  }

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.monthKey) {
    query.monthKey = req.query.monthKey;
  }

  const fees = await AcademyFee.find(query)
    .sort({ monthKey: -1, createdAt: -1 })
    .populate('studentId', '_id fullName');

  res.json(fees);
});

exports.createFee = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const academyId = await resolveScopedAcademyId(req, ownerId, { createIfMissing: true });
  if (!req.body.studentId || !mongoose.Types.ObjectId.isValid(req.body.studentId)) {
    throw httpError(400, 'Valid studentId is required');
  }

  const fee = await AcademyFee.create({
    ...req.body,
    ownerId,
    academyId,
    studentId: new mongoose.Types.ObjectId(req.body.studentId),
  });

  res.status(201).json(fee);
});

exports.updateFee = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const fee = await AcademyFee.findOneAndUpdate(
    {
      _id: req.params.feeId,
      ownerId,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
    },
    req.body,
    { new: true, runValidators: true },
  );

  if (!fee) {
    throw httpError(404, 'Fee not found');
  }

  res.json(fee);
});

exports.sendFeeReminder = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const fee = await AcademyFee.findOneAndUpdate(
    {
      _id: req.params.feeId,
      ownerId,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
    },
    { $set: { reminderSentAt: new Date() } },
    { new: true },
  );

  if (!fee) {
    throw httpError(404, 'Fee not found');
  }

  res.json({
    message: 'Reminder sent',
    feeId: fee._id,
    sentAt: fee.reminderSentAt,
  });
});

exports.listAnnouncements = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const query = { ownerId };
  if (selectedAcademyId) {
    query.academyId = selectedAcademyId;
  }

  if (req.query.audience) {
    query.audience = req.query.audience;
  }

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.batchId && mongoose.Types.ObjectId.isValid(req.query.batchId)) {
    query.batchId = new mongoose.Types.ObjectId(req.query.batchId);
  }

  const announcements = await AcademyAnnouncement.find(query).sort({ createdAt: -1 });
  res.json(announcements);
});

exports.createAnnouncement = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const academyId = await resolveScopedAcademyId(req, ownerId, { createIfMissing: true });
  const payload = sanitizeAnnouncementPayload(req.body);

  if (payload.batchId) {
    const batch = await AcademyBatch.findOne({ _id: payload.batchId, ownerId, academyId }).select('_id');
    if (!batch) {
      throw httpError(404, 'Batch not found');
    }
  }

  if (!payload.status) {
    payload.status = payload.scheduledAt ? 'scheduled' : 'sent';
  }

  if (payload.status === 'sent' && !payload.sentAt) {
    payload.sentAt = new Date();
  }

  const announcement = await AcademyAnnouncement.create({ ...payload, ownerId, academyId });
  res.status(201).json(announcement);
});

exports.getAnnouncement = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const announcement = await AcademyAnnouncement.findOne({
    _id: req.params.announcementId,
    ownerId,
    ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
  });

  if (!announcement) {
    throw httpError(404, 'Announcement not found');
  }

  res.json(announcement);
});

exports.updateAnnouncement = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const payload = sanitizeAnnouncementPayload(req.body, { partial: true });

  if (payload.batchId) {
    const batch = await AcademyBatch.findOne({
      _id: payload.batchId,
      ownerId,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
    }).select('_id');
    if (!batch) {
      throw httpError(404, 'Batch not found');
    }
  }

  if (payload.status === 'sent' && !Object.prototype.hasOwnProperty.call(payload, 'sentAt')) {
    payload.sentAt = new Date();
  }

  const announcement = await AcademyAnnouncement.findOneAndUpdate(
    {
      _id: req.params.announcementId,
      ownerId,
      ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
    },
    payload,
    { new: true, runValidators: true },
  );

  if (!announcement) {
    throw httpError(404, 'Announcement not found');
  }

  res.json(announcement);
});

exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  const ownerId = toObjectId(req.params.ownerId, 'ownerId');
  const selectedAcademyId = await resolveScopedAcademyId(req, ownerId);
  const announcement = await AcademyAnnouncement.findOneAndDelete({
    _id: req.params.announcementId,
    ownerId,
    ...(selectedAcademyId ? { academyId: selectedAcademyId } : {}),
  });

  if (!announcement) {
    throw httpError(404, 'Announcement not found');
  }

  res.status(204).send();
});
