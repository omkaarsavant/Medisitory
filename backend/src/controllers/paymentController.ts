// === backend/src/controllers/paymentController.ts ===

import { Request, Response } from 'express'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { Appointment } from '../models/Appointment'

interface CustomRequest extends Request {
  user?: { id: string }
}

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
  })
}

// Create a Razorpay order for an appointment
export const createPaymentOrder = async (req: CustomRequest, res: Response) => {
  try {
    const { appointmentId } = req.body

    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'appointmentId is required' })
    }

    const appointment = await Appointment.findById(appointmentId)
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' })
    }

    if (appointment.paymentStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'Payment already completed' })
    }

    const amount = appointment.paymentAmount || 500 // default ₹500
    const razorpay = getRazorpayInstance()

    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects paise
      currency: 'INR',
      receipt: `appt_${appointmentId}`,
      notes: {
        appointmentId: appointmentId,
        patientName: appointment.patientName || 'Patient',
        doctorName: appointment.doctorName,
      },
    })

    // Save order ID on appointment
    appointment.razorpayOrderId = order.id
    await appointment.save()

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: amount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        appointment: {
          _id: appointment._id,
          doctorName: appointment.doctorName,
          patientName: appointment.patientName,
          date: appointment.date,
          time: appointment.time,
        },
      },
    })
  } catch (error) {
    console.error('Error creating payment order:', error)
    res.status(500).json({ success: false, message: 'Failed to create payment order' })
  }
}

// Verify Razorpay payment signature and mark appointment as paid
export const verifyPayment = async (req: CustomRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !appointmentId) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' })
    }

    // Verify signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret'
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (generatedSignature !== razorpay_signature) {
      // Mark as failed
      await Appointment.findByIdAndUpdate(appointmentId, { paymentStatus: 'Failed' })
      return res.status(400).json({ success: false, message: 'Payment verification failed' })
    }

    // Mark as paid
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        paymentStatus: 'Paid',
        razorpayPaymentId: razorpay_payment_id,
        paidAt: new Date(),
      },
      { new: true }
    )

    res.json({ success: true, data: appointment })
  } catch (error) {
    console.error('Error verifying payment:', error)
    res.status(500).json({ success: false, message: 'Payment verification error' })
  }
}
