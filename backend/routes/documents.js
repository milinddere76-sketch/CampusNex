const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/auth');

// @desc    Generate Printable Document Templates
// @route   GET /api/documents/print
// @access  Public (for easy print / iframe view)
router.get('/print', async (req, res) => {
  const { type, id } = req.query; // type: admission_letter, appointment_letter, id_card, salary_slip; id: record/user id

  if (!type || !id) {
    return res.send(`<h3>Error: Missing required parameters type and id</h3>`);
  }

  try {
    let htmlContent = '';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    if (type === 'admission_letter') {
      const admissionRes = await db.query('SELECT * FROM public.tenant_admissions WHERE id = $1', [parseInt(id)]);
      if (admissionRes.rowCount === 0) return res.send(`<h3>Error: Admission application not found</h3>`);
      const adm = admissionRes.rows[0];

      htmlContent = `
        <div style="font-family: 'Outfit', sans-serif; max-width: 800px; margin: 40px auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #1e293b; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px;">
            <div>
              <h1 style="margin: 0; color: #1e3a8a; font-size: 26px;">APEX INSTITUTE OF TECHNOLOGY</h1>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Affiliated to National Technical University • Code: APEX-9102</p>
            </div>
            <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">CN</div>
          </div>
          
          <div style="text-align: right; font-size: 13px; color: #64748b; margin-bottom: 30px;">
            <strong>Date:</strong> ${dateStr}
          </div>
          
          <h2 style="text-align: center; color: #1e3a8a; margin-bottom: 30px; letter-spacing: 1px; font-size: 20px;">PROVISIONAL ADMISSION LETTER</h2>
          
          <p>Dear <strong>${adm.full_name}</strong>,</p>
          <p>We are extremely pleased to inform you that your application for provisional admission into our flagship academic programs has been successfully verified and <strong>CONFIRMED</strong>.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0; font-size: 14px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Assigned Roll Number:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #1e3a8a;">${adm.roll_number || 'APEX-2026-CSE-109'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Department:</td>
                <td style="padding: 6px 0; font-weight: bold;">Computer Science & Engineering</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Previous Marks Criteria:</td>
                <td style="padding: 6px 0;">${adm.marks_percentage}% Marks verified</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Aadhaar Verification:</td>
                <td style="padding: 6px 0; font-family: monospace;">XXXX-XXXX-${adm.aadhaar_id.slice(-4)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Fee Ledger Status:</td>
                <td style="padding: 6px 0; color: #10b981; font-weight: bold;">PAID (Online Gateway Transacted)</td>
              </tr>
            </table>
          </div>
          
          <p>Please note that your classes will commence from <strong>August 1st, 2026</strong>. You are required to report to the Central CS Block Auditorium at 09:00 AM with your physical credentials and ID document sets for final registry.</p>
          
          <p style="margin-top: 40px;">Sincerely,</p>
          <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-family: 'Dancing Script', cursive; font-size: 18px; color: #1e3a8a;">Dr. Arthur Pendelton</div>
              <div style="border-top: 1px solid #94a3b8; width: 180px; margin-top: 4px; padding-top: 4px; font-size: 12px; color: #64748b;">Office of the Principal, AIT</div>
            </div>
            <div style="border: 1px dashed #cbd5e1; padding: 10px; border-radius: 4px; font-size: 10px; color: #94a3b8; text-align: center;">
              CAMPUSNEX ONLINE SECURE VERIFIED
            </div>
          </div>
        </div>
      `;
    }

    else if (type === 'appointment_letter') {
      const appRes = await db.query('SELECT * FROM public.tenant_job_applications WHERE id = $1', [parseInt(id)]);
      if (appRes.rowCount === 0) return res.send(`<h3>Error: Job application not found</h3>`);
      const candidate = appRes.rows[0];

      htmlContent = `
        <div style="font-family: 'Outfit', sans-serif; max-width: 800px; margin: 40px auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #1e293b; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 30px;">
            <div>
              <h1 style="margin: 0; color: #4c1d95; font-size: 26px;">APEX INSTITUTE OF TECHNOLOGY</h1>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Corporate Office • Human Resource Department</p>
            </div>
            <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">CN</div>
          </div>
          
          <div style="text-align: right; font-size: 13px; color: #64748b; margin-bottom: 30px;">
            <strong>Ref:</strong> AIT/HR/RECRUIT/2026/0${candidate.id}<br>
            <strong>Date:</strong> ${dateStr}
          </div>
          
          <h2 style="text-align: center; color: #4c1d95; margin-bottom: 30px; font-size: 20px;">OFFER & APPOINTMENT LETTER</h2>
          
          <p>Dear <strong>${candidate.full_name}</strong>,</p>
          <p>Following your technical evaluations, research credentials review, and subsequent digital panel interview scoring rounds, we are pleased to appoint you as a <strong>FACULTY</strong> member at the Apex Institute of Technology.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0; font-size: 14px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Proposed Role:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #4c1d95;">LECTURER / ASSISTANT PROFESSOR</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Department Scope:</td>
                <td style="padding: 6px 0; font-weight: bold;">Computer Science & Engineering</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Qualifications verified:</td>
                <td style="padding: 6px 0;">${candidate.qualification} (${candidate.experience_years} Years Experience)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Compensation Plan:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #10b981;">INR 8,50,000/- Per Annum</td>
              </tr>
            </table>
          </div>
          
          <p>Your joining date is scheduled for <strong>July 1st, 2026</strong>. Please sign and return the duplicate copy of this letter as a token of your formal acceptance of AIT service bylaws and rules.</p>
          
          <p style="margin-top: 40px;">With warm regards,</p>
          <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-family: 'Dancing Script', cursive; font-size: 18px; color: #4c1d95;">Donald Vance</div>
              <div style="border-top: 1px solid #94a3b8; width: 180px; margin-top: 4px; padding-top: 4px; font-size: 12px; color: #64748b;">Human Resources Director, AIT</div>
            </div>
            <div style="border: 1px dashed #cbd5e1; padding: 10px; border-radius: 4px; font-size: 10px; color: #94a3b8; text-align: center;">
              DIGITALLY SECURED WORKFLOW
            </div>
          </div>
        </div>
      `;
    }

    else if (type === 'id_card') {
      const isStudent = id.startsWith('4444') || id.startsWith('5555') || id.includes('student') || id.length < 5;
      const name = isStudent ? 'ALEX DOE' : 'PROF. MARCUS SMITH';
      const role = isStudent ? 'STUDENT' : 'FACULTY';
      const code = isStudent ? 'APEX-2024-CSE-004' : 'AIT-FACULTY-203';
      const color = isStudent ? '#3b82f6' : '#10b981';

      htmlContent = `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f1f5f9; font-family: 'Outfit', sans-serif;">
          <div style="width: 340px; height: 520px; background: #1e293b; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.08); text-align: center; color: white;">
            <!-- Top Color Bar -->
            <div style="height: 140px; background: linear-gradient(135deg, ${color}, #1e1b4b); position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <h2 style="margin: 0; font-size: 20px; letter-spacing: 1px;">CAMPUSNEX</h2>
              <p style="margin: 2px 0 0 0; font-size: 10px; color: rgba(255,255,255,0.7); text-transform: uppercase;">Apex Institute</p>
            </div>
            
            <!-- Avatar Frame -->
            <div style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid #1e293b; background: #334155; overflow: hidden; margin-top: -60px; margin-left: auto; margin-right: auto; display: flex; align-items: center; justify-content: center; position: relative; z-index: 10;">
              <i class="fas fa-user" style="font-size: 50px; color: #94a3b8;"></i>
            </div>
            
            <!-- Details -->
            <div style="padding: 20px 30px;">
              <h3 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">${name}</h3>
              <p style="margin: 4px 0 25px 0; color: ${color}; font-size: 12px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">${role}</p>
              
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 15px; font-size: 13px; text-align: left;">
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">ID Code:</span>
                  <span style="font-family: monospace; font-weight: bold;">${code}</span>
                </div>
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">Dept:</span>
                  <span style="font-weight: 500;">Computer Science</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">Validity:</span>
                  <span style="font-weight: 500; color: #f59e0b;">2024 - 2028</span>
                </div>
              </div>
            </div>
            
            <!-- Footer Bar -->
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 9px; color: #64748b; letter-spacing: 1px;">
              CAMPUSNEX SMART SECURITY ID
            </div>
          </div>
        </div>
      `;
    }

    else if (type === 'salary_slip') {
      htmlContent = `
        <div style="font-family: 'Outfit', sans-serif; max-width: 800px; margin: 40px auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 30px;">
            <div>
              <h1 style="margin: 0; color: #0f766e; font-size: 26px;">APEX INSTITUTE OF TECHNOLOGY</h1>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Accounts & Finance Division • Pay Slip</p>
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #0f766e;">CN</div>
          </div>
          
          <h3 style="text-align: center; color: #1e293b; margin-bottom: 25px; text-transform: uppercase;">SALARY SLIP FOR MAY 2026</h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; font-size: 13px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div>
              <strong>Employee Name:</strong> Prof. Marcus Smith<br>
              <strong>Employee Code:</strong> AIT-FAC-203<br>
              <strong>Designation:</strong> Senior Faculty (CSE)<br>
            </div>
            <div>
              <strong>Bank Name:</strong> National Trust Bank<br>
              <strong>Account Number:</strong> *******9102<br>
              <strong>PF Account ID:</strong> PF-AIT-0203<br>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; font-size: 14px;">
            <div>
              <h4 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; color: #0f766e;">EARNINGS</h4>
              <table style="width: 100%;">
                <tr style="height: 30px;"><td>Basic Pay</td><td style="text-align: right; font-weight: bold;">₹3,200.00</td></tr>
                <tr style="height: 30px;"><td>House Rent Allowance (HRA)</td><td style="text-align: right; font-weight: bold;">₹640.00</td></tr>
                <tr style="height: 30px;"><td>Dearness Allowance (DA)</td><td style="text-align: right; font-weight: bold;">₹320.00</td></tr>
                <tr style="height: 30px;"><td>Special Research Grant</td><td style="text-align: right; font-weight: bold;">₹150.00</td></tr>
                <tr style="height: 30px; border-top: 1px solid #cbd5e1;"><td style="font-weight: bold;">Total Earnings (A)</td><td style="text-align: right; font-weight: bold; color: #0f766e;">₹4,310.00</td></tr>
              </table>
            </div>
            <div>
              <h4 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; color: #b91c1c;">DEDUCTIONS</h4>
              <table style="width: 100%;">
                <tr style="height: 30px;"><td>Provident Fund (PF)</td><td style="text-align: right; font-weight: bold;">₹384.00</td></tr>
                <tr style="height: 30px;"><td>Professional Tax</td><td style="text-align: right; font-weight: bold;">₹25.00</td></tr>
                <tr style="height: 30px;"><td>Income Tax TDS</td><td style="text-align: right; font-weight: bold;">₹310.00</td></tr>
                <tr style="height: 30px;"><td>Academic Advance Repay</td><td style="text-align: right; font-weight: bold;">₹0.00</td></tr>
                <tr style="height: 30px; border-top: 1px solid #cbd5e1;"><td style="font-weight: bold;">Total Deductions (B)</td><td style="text-align: right; font-weight: bold; color: #b91c1c;">₹719.00</td></tr>
              </table>
            </div>
          </div>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: bold; color: #166534;">
            <span>NET DISBURSED AMOUNT (A - B):</span>
            <span>₹3,591.00</span>
          </div>
          
          <div style="text-align: center; margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            This slip is a system-generated statement and does not require a physical signature.
          </div>
        </div>
      `;
    }

    else {
      return res.send(`<h3>Error: Unknown document type [${type}]</h3>`);
    }

    // Set responsive stylesheet injection
    const headerHtml = `
      <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; background: #fff;">
        ${htmlContent}
      </body>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.send(headerHtml);

  } catch (err) {
    console.error('Print generation failure:', err);
    return res.status(500).send(`<h3>Failed to generate printable document node.</h3>`);
  }
});

module.exports = router;
