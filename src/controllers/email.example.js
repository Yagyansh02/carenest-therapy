// Example: How to integrate email service with your payment controller

import emailService from '../services/emailService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Example: Handle Razorpay Payment Success
 * Call this after verifying the Razorpay payment signature
 */
export const handlePaymentSuccess = asyncHandler(async (req, res) => {
  const { orderId, paymentId, amount, userId } = req.body;

  // Verify payment signature here (your existing Razorpay logic)
  // ...

  // Get user details from database
  const user = await User.findById(userId);
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  try {
    // Send payment success email
    await emailService.sendPaymentSuccessEmail(
      user.email,
      user.fullName || user.username,
      {
        amount: (amount / 100).toFixed(2), // Convert paise to rupees
        orderId,
        paymentId,
        date: new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    );

    console.log(`Payment confirmation email sent to ${user.email}`);
  } catch (emailError) {
    // Log email error but don't fail the payment process
    console.error('Failed to send payment email:', emailError);
    // You might want to queue this for retry
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { orderId, paymentId },
        'Payment successful and confirmation email sent'
      )
    );
});

/**
 * Example: Send welcome email on user registration
 */
export const registerUser = asyncHandler(async (req, res) => {
  const { email, fullName, username, password } = req.body;

  // Your user registration logic here
  // ...
  const user = await User.create({ email, fullName, username, password });

  try {
    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.fullName || user.username);
    console.log(`Welcome email sent to ${user.email}`);
  } catch (emailError) {
    // Log but don't fail registration
    console.error('Failed to send welcome email:', emailError);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { user }, 'User registered successfully'));
});

/**
 * Example: Send booking confirmation email
 */
export const createBooking = asyncHandler(async (req, res) => {
  const { therapistId, sessionDate, sessionTime, sessionType } = req.body;
  const userId = req.user._id;

  // Your booking creation logic
  // ...
  const user = await User.findById(userId);
  const therapist = await Therapist.findById(therapistId);

  try {
    // Send booking confirmation email
    await emailService.sendBookingConfirmationEmail(
      user.email,
      user.fullName || user.username,
      {
        therapistName: `Dr. ${therapist.fullName}`,
        sessionDate: new Date(sessionDate).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        sessionTime,
        sessionType
      }
    );

    console.log(`Booking confirmation sent to ${user.email}`);
  } catch (emailError) {
    console.error('Failed to send booking confirmation:', emailError);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { booking }, 'Booking created successfully'));
});

/**
 * Example: Send password reset email
 */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  
  if (!user) {
    throw new ApiError(404, 'User with this email does not exist');
  }

  // Generate reset token (implement your own logic)
  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    // Send password reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken);
    
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          'Password reset email sent successfully'
        )
      );
  } catch (emailError) {
    // If email fails, remove the reset token
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    throw new ApiError(
      500,
      'Failed to send password reset email. Please try again.'
    );
  }
});

/**
 * Example: Send custom email
 */
export const sendCustomEmail = asyncHandler(async (req, res) => {
  const { to, subject, html } = req.body;

  try {
    await emailService.sendEmail({ to, subject, html });
    
    return res
      .status(200)
      .json(new ApiResponse(200, {}, 'Email sent successfully'));
  } catch (error) {
    throw new ApiError(500, 'Failed to send email');
  }
});
