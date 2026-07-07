const express = require('express');

const profileController = require('../controllers/profileController');
const bankAccountController = require('../controllers/bankAccountController');
const notificationController = require('../controllers/notificationController');
const dashboardController = require('../controllers/dashboardController');
const teamController = require('../controllers/teamController');

const router = express.Router();

router.get('/:ownerId/profile', profileController.getProfile);
router.patch('/:ownerId/profile', profileController.updateProfile);
router.get('/:ownerId/notification-preferences', profileController.getNotificationPreferences);
router.patch('/:ownerId/notification-preferences', profileController.updateNotificationPreferences);

router.get('/:ownerId/bank-account', bankAccountController.getBankAccount);
router.put('/:ownerId/bank-account', bankAccountController.upsertBankAccount);

router.get('/:ownerId/notifications', notificationController.listNotifications);
router.patch('/:ownerId/notifications/:notificationId/read', notificationController.markAsRead);

router.get('/:ownerId/dashboard', dashboardController.getDashboard);
router.get('/:ownerId/box-cricket-dashboard', dashboardController.getBoxCricketDashboard);

router.get('/:ownerId/teams', teamController.listTeams);
router.post('/:ownerId/teams', teamController.createTeam);
router.get('/:ownerId/teams/player-directory', teamController.searchPlayerDirectory);
router.get('/:ownerId/teams/:teamId', teamController.getTeam);
router.patch('/:ownerId/teams/:teamId', teamController.updateTeam);
router.delete('/:ownerId/teams/:teamId', teamController.deleteTeam);
router.post('/:ownerId/teams/:teamId/players', teamController.addPlayer);
router.delete('/:ownerId/teams/:teamId/players/:playerId', teamController.removePlayer);

module.exports = router;