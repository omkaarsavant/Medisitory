import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  userId: string;
  doctorId: string;
  patientName: string;
  date: Date;
  time: string;
  doctorName: string;
  duration: number; // minutes
  type: 'Checkup' | 'Follow-up' | 'Consultation' | 'Emergency' | 'Other';
  status: 'Scheduled' | 'Rescheduled' | 'Cancelled' | 'Completed';
  location: string;
  reason: string;
  notesForPatient: string;
  reminderType: '1 day before' | '1 hour before' | 'anytime' | 'none';
  customReminderTime?: Date;
  preVisitQuestions: string[];
  postVisitNotes: string;
  suggestedFollowUp: string;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  paymentAmount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    userId: { type: String, required: true },
    doctorId: { type: String, required: true },
    patientName: { type: String, required: false },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    duration: { type: Number, default: 30 },
    type: { 
      type: String, 
      enum: ['Checkup', 'Follow-up', 'Consultation', 'Emergency', 'Other'],
      default: 'Checkup'
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Rescheduled', 'Cancelled', 'Completed'],
      default: 'Scheduled'
    },
    doctorName: { type: String, required: true },
    location: { type: String, required: true },
    reason: { type: String, required: false },
    notesForPatient: { type: String, default: '' },
    reminderType: { 
      type: String, 
      enum: ['1 day before', '1 hour before', 'anytime', 'none'], 
      default: 'none' 
    },
    customReminderTime: { type: Date },
    preVisitQuestions: [{ type: String }],
    postVisitNotes: { type: String, default: '' },
    suggestedFollowUp: { type: String, default: '' },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed'],
      default: 'Pending'
    },
    paymentAmount: { type: Number, default: 0 },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
