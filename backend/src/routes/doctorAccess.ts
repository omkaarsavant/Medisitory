import express from 'express'
import { createShareToken, getSharedRecords } from '../controllers/doctorAccessController'

const router = express.Router()

// @route   POST /api/doctor-access/share
// @desc    Create a new share link/token for selected records
// @access  Public (mocked auth)
router.post('/share', createShareToken)

router.get('/:token', getSharedRecords)

// @route   GET /api/doctor-access/shares/active
// @desc    Get all active shares for the patient
// @access  Public (Mock Patient)
router.get('/shares/active', (req, res, next) => {
  const { getPatientShares } = require('../controllers/doctorAccessController');
  getPatientShares(req, res, next);
});

// @route   DELETE /api/doctor-access/shares/:token
// @desc    Revoke a specific share
// @access  Public (Mock Patient)
router.delete('/shares/:token', (req, res, next) => {
  const { revokeShare } = require('../controllers/doctorAccessController');
  revokeShare(req, res, next);
});

// @route   PUT /api/doctor-access/shares/:token
// @desc    Update records shared in a specific session
// @access  Public (Mock Patient)
router.put('/shares/:token', (req, res, next) => {
  const { updateShareRecords } = require('../controllers/doctorAccessController');
  updateShareRecords(req, res, next);
});

// @route   PUT /api/doctor-access/records/:id/notes
// @desc    Allow doctor to save professional notes on a record
// @access  Public (Mock Doctor)
router.put('/records/:id/notes', (req, res, next) => {
  const { updateDoctorNotes } = require('../controllers/doctorAccessController');
  updateDoctorNotes(req, res, next);
});

// @route   GET /api/doctor-access/messages/:token
// @desc    Get chat history for a shared session
// @access  Public (Mock Doctor/Patient)
router.get('/messages/:token', (req, res, next) => {
  const { getChatHistory } = require('../controllers/doctorAccessController');
  getChatHistory(req, res, next);
});

// @route   POST /api/doctor-access/records/:id/clear-notification
// @desc    Mark doctor note as read by the patient
// @access  Public (Mock Patient)
router.post('/records/:id/clear-notification', (req, res, next) => {
  const { clearNoteNotification } = require('../controllers/doctorAccessController');
  clearNoteNotification(req, res, next);
});

export default router
