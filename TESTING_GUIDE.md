# Testing Guide - Reimbursement System

## Quick Start Testing

### 1. Environment Setup
Ensure all services are running:
```bash
# Check database connection
npx prisma db push

# Start development server
npm run dev
```

Server should start on: http://localhost:3000

### 2. Seeded Test Users

All users have password: `password`

| Role | Email | Purpose |
|------|-------|---------|
| Admin | sarah@acme.com | Full system access |
| Manager | michael@acme.com | Approve expenses |
| Manager | emily@acme.com | Approve expenses |
| Employee | james@acme.com | Submit expenses |
| Employee | lisa@acme.com | Submit expenses |
| Employee | robert@acme.com | Submit expenses |

### 3. Test Scenarios

#### Scenario 1: Employee Submits Expense
**Goal:** Test expense creation and submission workflow

1. **Login as Employee**
   - Navigate to http://localhost:3000/login
   - Email: `james@acme.com`
   - Password: `password`

2. **Create New Expense**
   - Go to Dashboard → My Expenses
   - Click "New Expense" button
   - Fill in expense details:
     - Title: "Client Dinner"
     - Amount: $125.50
     - Category: "Meals & Entertainment"
     - Date: Today
     - Description: "Dinner with client at Olive Garden"

3. **Upload Receipt**
   - Click "Upload Receipt" button
   - Select image file (JPG, PNG) or PDF
   - Wait for Cloudinary upload confirmation
   - Verify receipt URL is saved

4. **Submit for Approval**
   - Click "Submit for Approval"
   - Expense status should change to "Pending"
   - Notification should be created for manager

**Expected Results:**
- ✅ Expense created in database
- ✅ Receipt uploaded to Cloudinary
- ✅ Status changed to "pending"
- ✅ Manager receives notification
- ✅ Email sent to manager (check SMTP logs)

#### Scenario 2: Manager Approves Expense
**Goal:** Test approval workflow

1. **Logout and Login as Manager**
   - Click logout
   - Login with `michael@acme.com` / `password`

2. **View Pending Approvals**
   - Navigate to Dashboard → Approvals
   - Should see James's expense in pending list

3. **Review Expense Details**
   - Click on the expense
   - Verify all details are correct
   - View uploaded receipt (Cloudinary URL)

4. **Approve Expense**
   - Click "Approve" button
   - Add comment: "Approved - looks good"
   - Submit approval

**Expected Results:**
- ✅ Expense status updated to "approved"
- ✅ James receives notification
- ✅ Email sent to James
- ✅ Audit log entry created
- ✅ Expense moves to next approval step (if multi-step workflow)

#### Scenario 3: Manager Rejects Expense
**Goal:** Test rejection workflow

1. **Still Logged in as Manager**
   - Find another pending expense
   
2. **Reject Expense**
   - Click "Reject" button
   - Add reason: "Receipt is not legible, please resubmit with clearer image"
   - Submit rejection

**Expected Results:**
- ✅ Expense status updated to "rejected"
- ✅ Employee receives notification with reason
- ✅ Email sent to employee
- ✅ Employee can edit and resubmit

#### Scenario 4: Admin Views Analytics
**Goal:** Test analytics and reporting

1. **Login as Admin**
   - Email: `sarah@acme.com`
   - Password: `password`

2. **View Dashboard Analytics**
   - Navigate to Dashboard → Analytics
   - Verify metrics displayed:
     - Total expenses
     - Pending approvals
     - Approved amount
     - Rejected count

3. **View Charts and Graphs**
   - Expense trends over time
   - Category breakdown
   - Department spending

**Expected Results:**
- ✅ Real data from database displayed
- ✅ Charts render correctly
- ✅ Filters work (date range, category, status)

#### Scenario 5: User Management
**Goal:** Test admin user management

1. **Still Logged in as Admin**
   - Navigate to Dashboard → Users

2. **Create New User**
   - Click "Add User"
   - Fill details:
     - Name: "Test Employee"
     - Email: "test@acme.com"
     - Role: "employee"
     - Department: "Engineering"
   - Submit

3. **Edit User**
   - Click edit on newly created user
   - Change role to "manager"
   - Save changes

4. **Delete User**
   - Click delete on test user
   - Confirm deletion

**Expected Results:**
- ✅ User created in database
- ✅ User can login with generated password
- ✅ User role updates correctly
- ✅ User deleted from system

### 4. API Testing

#### Test with cURL

```bash
# Get auth token (login)
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"james@acme.com","password":"password"}'

# List expenses (requires auth)
curl http://localhost:3000/api/expenses

# Create expense (requires auth)
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Office Supplies",
    "amount": 45.99,
    "categoryId": "category-id-here",
    "date": "2024-01-15",
    "description": "Pens and notebooks"
  }'

# Get categories
curl http://localhost:3000/api/categories

# Get notifications
curl http://localhost:3000/api/notifications?userId=user-id-here
```

### 5. File Upload Testing

#### Test Cloudinary Integration

1. **Prepare Test Files**
   - Small image: < 1MB (should succeed)
   - Large image: > 10MB (should fail validation)
   - Wrong format: .exe file (should fail validation)
   - Valid PDF receipt (should succeed)

2. **Upload via UI**
   - Create new expense
   - Try uploading each test file
   - Verify success/failure messages

3. **Verify in Cloudinary Dashboard**
   - Login to Cloudinary console
   - Check "dnrs8h818" cloud
   - Verify uploaded files appear
   - Check file transformations applied

**Expected Results:**
- ✅ Valid files upload successfully
- ✅ Invalid files rejected with clear error
- ✅ Files appear in Cloudinary dashboard
- ✅ Expense stores Cloudinary URL and public_id

### 6. Email Testing

#### Verify SMTP Integration

1. **Enable Email Logging**
   - Check console output for email sending
   - Or check Brevo dashboard for sent emails

2. **Trigger Email Events**
   - Submit expense (email to manager)
   - Approve expense (email to employee)
   - Reject expense (email to employee)
   - New user signup (welcome email)

3. **Check Email Content**
   - HTML formatting correct
   - All variables populated
   - Links work correctly
   - Sender shows: "Preplyte <codiezz.officials@gmail.com>"

**Expected Results:**
- ✅ Emails sent successfully
- ✅ HTML templates render correctly
- ✅ All dynamic content populated
- ✅ No delivery failures

### 7. Security Testing

#### Test Authentication & Authorization

```bash
# Try accessing protected endpoint without auth
curl http://localhost:3000/api/expenses
# Expected: {"success":false,"error":{"message":"Unauthorized"}}

# Try accessing admin endpoint as employee
# Login as employee, then try:
curl http://localhost:3000/api/users
# Expected: 403 Forbidden or filtered results

# Test XSS prevention
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"title":"<script>alert(1)</script>","amount":100}'
# Expected: Script tags stripped/escaped
```

#### Test Input Validation

```bash
# Invalid amount
curl -X POST http://localhost:3000/api/expenses \
  -d '{"title":"Test","amount":-100}'
# Expected: Validation error

# Missing required fields
curl -X POST http://localhost:3000/api/expenses \
  -d '{"title":"Test"}'
# Expected: Validation error listing missing fields

# Invalid email format
curl -X POST http://localhost:3000/api/auth/signup \
  -d '{"email":"notanemail","password":"test123"}'
# Expected: Email validation error
```

### 8. Performance Testing

#### Test with Large Datasets

1. **Create Multiple Expenses**
   - Create 50+ expenses via UI or script
   - Test pagination works
   - Verify page load time acceptable

2. **Test Search & Filters**
   - Search by keyword
   - Filter by date range
   - Filter by status
   - Combine multiple filters

3. **Test Concurrent Users**
   - Open multiple browser sessions
   - Login as different users
   - Submit expenses simultaneously
   - Verify no race conditions

**Expected Results:**
- ✅ Pagination limits results to 20 per page
- ✅ Filters apply correctly
- ✅ Search returns relevant results
- ✅ No performance degradation with multiple users

### 9. Error Handling Testing

#### Test Error Scenarios

1. **Database Connection Error**
   - Stop database
   - Try loading expenses
   - Should show friendly error message

2. **Cloudinary Upload Failure**
   - Temporarily break Cloudinary credentials
   - Try uploading file
   - Should show error, not crash

3. **SMTP Failure**
   - Break email configuration
   - Trigger email event
   - Should log error but continue

4. **Invalid Session**
   - Login, then manually clear session
   - Try accessing protected page
   - Should redirect to login

**Expected Results:**
- ✅ Graceful error messages shown
- ✅ No app crashes
- ✅ Errors logged to console
- ✅ User can recover from errors

### 10. Audit Log Testing

#### Verify Audit Trail

1. **Login as Admin**
   - Navigate to Dashboard → Audit Logs

2. **Perform Actions**
   - Create expense
   - Approve expense
   - Delete user
   - Update category

3. **Check Audit Logs**
   - Verify all actions logged
   - Check timestamps are correct
   - Verify user attribution
   - Check action details recorded

**Expected Results:**
- ✅ All critical actions logged
- ✅ Logs include user, timestamp, action, details
- ✅ Logs cannot be deleted by non-admins
- ✅ Logs searchable and filterable

## Troubleshooting

### Common Issues

**Issue: Cannot login**
- Check database is running: `npx prisma studio`
- Verify user exists in database
- Check password is correct (all seeded users: "password")
- Check NextAuth secret is set in .env.local

**Issue: File upload fails**
- Check Cloudinary credentials in .env.local
- Verify file size < 10MB
- Check file format is allowed (JPG, PNG, PDF, WEBP)
- Check browser console for errors

**Issue: Emails not sending**
- Check SMTP credentials in .env.local
- Verify Brevo account is active
- Check server console for email errors
- Verify sender email is verified in Brevo

**Issue: 500 Internal Server Error**
- Check server console for stack trace
- Verify database schema is up to date: `npx prisma db push`
- Check all environment variables are set
- Restart dev server

**Issue: Build fails**
- Run `npm run build` to see full error
- Check for TypeScript errors
- Verify all imports are correct
- Clear .next folder and rebuild

## Test Checklist

Use this checklist to verify all features:

- [ ] User signup works
- [ ] User login works (all 3 roles)
- [ ] User logout works
- [ ] Create expense works
- [ ] Upload receipt works (Cloudinary)
- [ ] Submit expense works
- [ ] Manager sees pending approvals
- [ ] Manager can approve expense
- [ ] Manager can reject expense
- [ ] Employee receives notifications
- [ ] Emails are sent (SMTP)
- [ ] Analytics show real data
- [ ] Admin can manage users
- [ ] Admin can manage categories
- [ ] Audit logs are created
- [ ] Search and filters work
- [ ] Pagination works
- [ ] Error messages show correctly
- [ ] Authentication guards routes
- [ ] Authorization enforces roles

## Next Steps After Testing

1. **Fix any bugs found during testing**
2. **Optimize slow queries or API calls**
3. **Add missing features if needed**
4. **Prepare for production deployment**
5. **Rotate all credentials before deploying to production**

---

**Happy Testing!** 🚀
