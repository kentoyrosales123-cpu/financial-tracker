# FinanceFlow - Financial Tracker

A complete responsive financial tracker using HTML, CSS, JavaScript, Node.js, Express, MongoDB, JWT, bcrypt, and Chart.js.

## Features

- Login and registration
- JWT authentication
- Password hashing using bcrypt
- Dashboard summary cards
- Add, edit, and delete income, expenses, and savings
- Track debts you owe
- Track people who owe you money
- Payment history
- Automatic remaining balance and debt status
- Due date reminders within 7 days
- Monthly income vs expenses chart
- Search and filter debts
- Mobile responsive UI

## Local Setup

### 1. Install Node.js
Download and install Node.js LTS.

### 2. Open the project folder
```bash
cd financial-tracker
```

### 3. Install dependencies
```bash
npm install
```

### 4. Create `.env`
Copy `.env.example` and rename it to `.env`.

```env
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/financial_tracker
JWT_SECRET=your_long_secret_key_here
```

### 5. Run locally
```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## MongoDB Atlas Setup

1. Go to MongoDB Atlas.
2. Create a free cluster.
3. Create a database user.
4. Allow network access from `0.0.0.0/0` for testing.
5. Copy your connection string.
6. Paste it in `.env` as `MONGODB_URI`.

## Deploy on Render

### 1. Upload to GitHub
Create a GitHub repository and upload this project.

### 2. Create Render Web Service
1. Go to Render.
2. Click **New +**.
3. Select **Web Service**.
4. Connect your GitHub repository.

### 3. Render Settings
Use these settings:

```text
Build Command: npm install
Start Command: npm start
```

### 4. Add Environment Variables
In Render, go to **Environment** and add:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_secret_key_here
PORT=3000
```

### 5. Deploy
Click **Deploy Web Service**.

## Important Notes

- Do not expose your `.env` file publicly.
- Use a strong `JWT_SECRET`.
- For production, use your actual domain and secure MongoDB credentials.
