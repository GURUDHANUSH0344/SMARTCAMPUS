# SmartCampus ERP

A full-stack college ERP system built with Node.js, Express, MySQL (Sequelize), and EJS.

## Modules
- **Auth** — Register, Login, Logout with JWT + sessions
- **Admissions** — Applications, document upload, approve/reject, auto-create student record
- **Exams** — Add results, auto-grade calculation, view by student
- **Fees** — Create fee records, mark paid, PDF receipt download, overdue email reminders
- **Hostel** — Room allocation, vacate, track occupancy

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create MySQL database
```sql
CREATE DATABASE erp_db;
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` with your MySQL credentials, JWT secret, and Gmail app password.

> **Gmail setup**: Enable 2FA on your Gmail account, then generate an **App Password** at  
> https://myaccount.google.com/apppasswords — use that as `EMAIL_PASS`.

### 4. Start the server
```bash
npm run dev     # development (nodemon)
npm start       # production
```

Visit: **http://localhost:3000**

### 5. First login
Register a new account at `/auth/register` and select the **Admin** role.

## Project Structure
```
smartcampus-erp/
├── app.js                  # Entry point
├── config/db.js            # Sequelize connection
├── models/                 # Sequelize models + associations
├── controllers/            # Route logic
├── routes/                 # Express routers
├── middleware/             # Auth + Role guards
├── services/               # Email + PDF
├── cron/                   # Scheduled fee reminders
├── utils/                  # Student ID generator
├── views/                  # EJS templates
├── public/                 # CSS + JS assets
└── uploads/                # Uploaded documents & receipts
```

## Role Permissions
| Action              | Admin | Teacher | Student |
|---------------------|-------|---------|---------|
| View all modules    | ✅    | ✅      | ✅      |
| Approve admissions  | ✅    | ❌      | ❌      |
| Add exam results    | ✅    | ✅      | ❌      |
| Manage fees         | ✅    | ❌      | ❌      |
| Hostel allocation   | ✅    | ❌      | ❌      |
