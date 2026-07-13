const express = require('express');

const controller = require('../controllers/academyController');

const router = express.Router();

router.get('/:ownerId/academies', controller.listAcademies);
router.post('/:ownerId/academies', controller.createAcademy);
router.post('/:ownerId/academies/:academyId/submit-review', controller.submitAcademyForReview);
router.patch('/:ownerId/academies/:academyId/ownership-proof', controller.updateAcademyOwnershipProof);
router.patch('/:ownerId/academies/:academyId', controller.updateAcademy);

router.get('/:ownerId/dashboard', controller.getDashboard);

router.get('/:ownerId/students', controller.listStudents);
router.post('/:ownerId/students', controller.createStudent);
router.get('/:ownerId/students/:studentId', controller.getStudent);
router.patch('/:ownerId/students/:studentId', controller.updateStudent);
router.delete('/:ownerId/students/:studentId', controller.deleteStudent);

router.get('/:ownerId/batches', controller.listBatches);
router.post('/:ownerId/batches', controller.createBatch);
router.get('/:ownerId/batches/:batchId', controller.getBatch);
router.patch('/:ownerId/batches/:batchId', controller.updateBatch);
router.delete('/:ownerId/batches/:batchId', controller.deleteBatch);

router.get('/:ownerId/attendance', controller.listAttendance);
router.post('/:ownerId/attendance', controller.markAttendance);

router.get('/:ownerId/fees', controller.listFees);
router.post('/:ownerId/fees', controller.createFee);
router.patch('/:ownerId/fees/:feeId', controller.updateFee);
router.post('/:ownerId/fees/:feeId/reminder', controller.sendFeeReminder);

router.get('/:ownerId/announcements', controller.listAnnouncements);
router.post('/:ownerId/announcements', controller.createAnnouncement);
router.get('/:ownerId/announcements/:announcementId', controller.getAnnouncement);
router.patch('/:ownerId/announcements/:announcementId', controller.updateAnnouncement);
router.delete('/:ownerId/announcements/:announcementId', controller.deleteAnnouncement);

module.exports = router;
