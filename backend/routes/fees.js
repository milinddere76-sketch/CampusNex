const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/auth');

// @desc    List student fees
// @route   GET /api/fees
// @access  Private (Student, Parent, Accountant)
router.get('/', protect, async (req, res) => {
  try {
    let studentId = req.user.id;

    if (req.user.role === 'PARENT') {
      const childRes = await db.query('SELECT user_id FROM public.tenant_students WHERE parent_id = $1', [req.user.id]);
      if (childRes.rowCount > 0) {
        studentId = childRes.rows[0].user_id;
      }
    }

    let result;
    if (req.user.role === 'COLLEGE_ADMIN' || req.user.role === 'ACCOUNTANT') {
      result = await db.query('SELECT * FROM public.tenant_fees ORDER BY due_date ASC');
    } else {
      result = await db.query('SELECT * FROM public.tenant_fees WHERE student_id = $1 ORDER BY due_date ASC', [studentId]);
    }

    return res.status(200).json({ success: true, fees: result.rows });
  } catch (err) {
    console.error('Fees fetch failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve bills' });
  }
});

// @desc    Pay student fee (Simulated Stripe/Razorpay)
// @route   POST /api/fees/:id/pay
// @access  Private (Student, Parent)
router.post('/:id/pay', protect, async (req, res) => {
  const { payment_method, amount } = req.body;

  try {
    const feeId = req.params.id;

    // Get fee details
    const feeRes = await db.query('SELECT * FROM public.tenant_fees WHERE id = $1', [feeId]);
    if (feeRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Fee invoice not found' });
    }

    const fee = feeRes.rows[0];
    const amountToPay = parseFloat(amount || (fee.amount_due - fee.amount_paid));

    if (amountToPay <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    // Mock processing gateway charge
    const gatewayTxId = 'ch_stripe_mock_' + Math.random().toString(36).substring(7);

    // Record Payment
    await db.query(
      'INSERT INTO public.tenant_fee_payments (fee_id, payment_method, transaction_id, amount_paid) VALUES ($1, $2, $3, $4)',
      [fee.id, payment_method || 'STRIPE', gatewayTxId, amountToPay]
    );

    // Update Fee status
    const newPaidAmount = parseFloat(fee.amount_paid) + amountToPay;
    const newStatus = newPaidAmount >= parseFloat(fee.amount_due) ? 'PAID' : 'PARTIAL';

    const updatedFee = await db.query(
      'UPDATE public.tenant_fees SET amount_paid = $1, status = $2 WHERE id = $3 RETURNING *',
      [newPaidAmount, newStatus, fee.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Payment mock approved by gateway!',
      transaction_id: gatewayTxId,
      fee: updatedFee.rows[0]
    });
  } catch (err) {
    console.error('Payment failure:', err);
    return res.status(500).json({ success: false, message: 'Failed to process payment' });
  }
});

module.exports = router;
