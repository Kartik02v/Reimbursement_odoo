# Backend Implementation - Reimbursement Management System

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (or use provided Neon credentials)
- Cloudinary account (credentials provided)
- Email service (Brevo SMTP configured)

### Installation
```bash
# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your credentials (already configured)

# Push database schema
npx prisma db push

# Seed database
npx prisma db seed

# Start development server
npm run dev
```

### Test the APIs
```bash
# Server running at http://localhost:3000

# Test signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@test.com","password":"Password123!","role":"employee"}'

# Test expenses list
curl http://localhost:3000/api/expenses

# Test categories
curl http://localhost:3000/api/categories
```

## 📚 Documentation

- **API Docs**: See `API_DOCUMENTATION.md` in session files
- **Implementation Status**: See `IMPLEMENTATION_STATUS.md`
- **Final Summary**: See `FINAL_SUMMARY.md`

## 🔐 Environment Variables

Required variables in `.env.local`:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=your-email@example.com

REDIS_URL=rediss://your-redis-url
```

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/signup` - Register user
- `POST /api/auth/[...nextauth]` - Login/logout (NextAuth)

### Users
- `GET /api/users` - List users
- `GET /api/users/[id]` - Get user
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Expenses
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/[id]` - Get expense
- `PATCH /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense

### Approvals
- `GET /api/approvals` - Get pending approvals
- `POST /api/approvals` - Approve/reject expense

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PATCH /api/categories/[id]` - Update category
- `DELETE /api/categories/[id]` - Delete category

### Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications` - Mark as read
- `DELETE /api/notifications` - Delete notification

### Analytics
- `GET /api/analytics` - Get dashboard stats

### Upload
- `POST /api/upload/receipt` - Upload receipt
- `DELETE /api/upload` - Delete file

## 🧪 Testing

```bash
# Run build to check for errors
npm run build

# Check database
npx prisma studio

# View logs
npm run dev
```

## 📦 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Auth**: NextAuth v5 beta
- **Validation**: Zod
- **File Upload**: Cloudinary
- **Email**: Nodemailer (Brevo SMTP)
- **Cache**: Redis (Upstash)

## 🔒 Security Features

- ✅ Password hashing (bcrypt, 12 rounds)
- ✅ Input sanitization
- ✅ XSS prevention
- ✅ SQL injection protection (Prisma)
- ✅ Audit logging
- ✅ JWT sessions
- ✅ File validation

## 📝 Seeded Data

After running `npx prisma db seed`, you'll have:

- 1 Company: Acme Corporation
- 6 Users:
  - Admin: sarah@acme.com / password
  - Managers: michael@acme.com, emily@acme.com / password
  - Employees: james@acme.com, lisa@acme.com, robert@acme.com / password
- 8 Expense Categories
- 3 Approval Workflows
- 7 Sample Expenses

## 🐛 Troubleshooting

### Build Errors
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Database Issues
```bash
# Reset database
npx prisma migrate reset
npx prisma db push
npx prisma db seed
```

### Email Not Sending
- Check SMTP credentials in .env.local
- Verify Brevo account is active
- Check firewall/network settings

## 📞 Support

- Database Issues: Check Neon console
- Email Issues: Check Brevo dashboard
- File Upload Issues: Check Cloudinary console

## 🎯 Next Steps

1. **Frontend Integration**: Update React contexts to use real APIs
2. **Testing**: Add comprehensive API tests
3. **Rate Limiting**: Activate Redis-based rate limiting
4. **Monitoring**: Add logging and error tracking
5. **Production**: Deploy and configure production env vars

---

**Status**: ✅ Backend core complete and functional  
**Last Updated**: 2026-03-29  
**Version**: 1.0
