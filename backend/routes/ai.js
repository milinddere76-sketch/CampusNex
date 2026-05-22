const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// @desc    AI Academic Doubt Assistant
// @route   POST /api/ai/ask
// @access  Private
router.post('/ask', protect, async (req, res) => {
  const { question, context_subject } = req.body;

  if (!question) {
    return res.status(400).json({ success: false, message: 'Please provide your academic question.' });
  }

  console.log(`🤖 AI Assistant: Processing question about [${context_subject || 'General'}] for user [${req.user.full_name}]...`);

  // Simulate High-Fidelity Educational AI Responses
  let responseText = '';
  const qLower = question.toLowerCase();

  if (qLower.includes('binary tree') || qLower.includes('red black') || qLower.includes('dsa') || qLower.includes('algorithm')) {
    responseText = `### 🌳 Red-Black Tree Balancing & Rotations
An excellent algorithm question! In a **Red-Black Tree**, balancing is maintained through color coding (Red/Black) and structural **rotations**. Let's review insertion rebalancing:

#### The Core Rules:
1. Every node is either **Red** or **Black**.
2. The root node is always **Black**.
3. All leaf nodes (NIL) are **Black**.
4. If a node is **Red**, both of its children must be **Black** (No double-red violations).
5. Every path from root to leaves must contain the exact same count of Black nodes.

#### Case Study: Double Red Violation
When you insert a new Red node $X$, and its parent $P$ is also Red, we inspect the uncle node $U$ (sibling of $P$):
* **Case 1 (Uncle $U$ is Red):** Simply **recolor** $P$ and $U$ to Black, and recolor grandparent $G$ to Red. Repeat violation check at $G$.
* **Case 2 (Uncle $U$ is Black, forming a Triangle $G \\rightarrow P \\rightarrow X$):** Rotate $X$ around $P$ to form a line.
* **Case 3 (Uncle $U$ is Black, forming a Line $G \\rightarrow P \\rightarrow X$):** Rotate $P$ around $G$ and swap colors of $P$ and $G$.

Here is a visual snippet of a **Left-Rotation** implementation in Java/Dart:
\`\`\`dart
void leftRotate(Node x) {
  Node y = x.right;
  x.right = y.left;
  if (y.left != nil) {
    y.left.parent = x;
  }
  y.parent = x.parent;
  if (x.parent == nil) {
    root = y;
  } else if (x == x.parent.left) {
    x.parent.left = y;
  } else {
    x.parent.right = y;
  }
  y.left = x;
  x.parent = y;
}
\`\`\`
Need me to explain how right rotation differs or walk through a step-by-step example?`;
  }
  else if (qLower.includes('database') || qLower.includes('normalization') || qLower.includes('sql') || qLower.includes('3nf')) {
    responseText = `### 🗄️ Database Normalization: 1NF to BCNF
Database normalization is the systematic method of organizing columns and tables to eliminate data redundancy and anomalies (Insertion, Update, Deletion).

| Normal Form | Primary Requirement | Example Resolution |
| :--- | :--- | :--- |
| **1NF** (First Normal Form) | Atomic Values & Unique Row Keys | Split comma-separated course strings into separate rows. |
| **2NF** (Second Normal Form) | 1NF + No Partial Dependencies | Pull out student details that depend on only part of a composite key. |
| **3NF** (Third Normal Form) | 2NF + No Transitive Dependencies | Separate hostel address columns that depend on 'HostelBlock' rather than the 'StudentID' primary key. |
| **BCNF** (Boyce-Codd NF) | 3NF + Every determinant must be a Super Key | If a student can have multiple teachers but a teacher teaches only one course, split fields to resolve overlapping composite keys. |

Let's look at this schema violation:
* **Non-normalized table:** \`[StudentID, StudentName, CourseCode, CourseName, RoomNo]\`
* **Anomalies:** If the course room changes, you must update multiple rows. If the student drops, you lose all records of the course.
* **3NF Solution:**
  1. **Students:** \`[StudentID, StudentName]\`
  2. **Courses:** \`[CourseCode, CourseName, RoomNo]\`
  3. **Enrollments:** \`[StudentID, CourseCode]\`

Does this make the transitive keys clear, or would you like to review an exam scenario?`;
  }
  else if (qLower.includes('fee') || qLower.includes('due') || qLower.includes('stripe') || qLower.includes('payment')) {
    responseText = `### 💳 Secure Online Payments and Receipting
To securely pay fees in CampusNex, we use a fully integrated Stripe and Razorpay gateway.

#### Secure Payment Lifecycle:
1. **Invoice Issued:** The Accountant posts a billing fee profile to the student account.
2. **Intent Created:** The mobile/web client calls the backend to create a Stripe payment intent.
3. **Gateway Verification:** The card details are processed directly on Stripe servers (PCI-DSS compliant).
4. **Webhook Capture:** Stripe fires a secure signed event (\`payment_intent.succeeded\`) back to our Node.js server.
5. **Ledger Updated:** The system sets the fee status to 'PAID' or 'PARTIAL' and outputs a cryptographically signed PDF receipt with a barcode.

Let me know if you would like me to show you how to write the Stripe Webhook signature verification controller!`;
  }
  else {
    responseText = `### 🎓 CampusNex AI Academic Assistant
Hello ${req.user.full_name}! I am your specialized digital campus AI tutor. I am trained in your courses, semesters, and assignments for **Apex Institute of Technology**.

I can assist you with:
1. **Homework Solutions:** Translating problems into step-by-step math, science, or logic.
2. **Code & Programming Help:** Explaining data structures, object-oriented concepts, and debugging compiler bugs.
3. **Database & Queries:** Writing optimization tips, schema design, and normalizations.
4. **Curriculum Review:** Summarizing lecture notes, timetables, and notices.

**How can I help you excel in your studies today?** Feel free to ask a detailed question about data structures (like binary trees) or database normalizations!`;
  }

  // Simulated AI response timeout for realistic experience
  setTimeout(() => {
    return res.status(200).json({
      success: true,
      answer: responseText
    });
  }, 400);
});

module.exports = router;
