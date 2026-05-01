# 🚀 TaskFlow — Team Task Manager (Full-Stack)

A full-stack team task management app built with **Node.js + Express + SQLite** (backend) and **React** (frontend), featuring role-based access control, project management, task tracking, and a real-time dashboard.

---

## 📁 Project Structure

```
team-task-manager/
├── backend/
│   ├── config/
│   │   └── database.js          # SQLite DB init & schema
│   ├── middleware/
│   │   └── auth.js              # JWT auth, role guards
│   ├── routes/
│   │   ├── auth.js              # /api/auth/* endpoints
│   │   ├── projects.js          # /api/projects/* endpoints
│   │   └── tasks.js             # /api/tasks/* endpoints
│   ├── data/                    # SQLite DB file (auto-created)
│   ├── server.js                # Express app entry point
│   ├── .env                     # Environment variables
│   └── package.json
└── frontend/
    ├── src/
    │   ├── utils/api.js         # Axios API client (all API calls)
    │   └── context/AuthContext.js  # Global auth state
    ├── index.html               # Full standalone React app (no build needed)
    └── package.json
```

---

## 🗄️ SQL Database Schema

```sql
users          — id, name, email, password (hashed), role (admin/member)
projects       — id, name, description, owner_id, status
project_members — project_id, user_id, role (many-to-many)
tasks          — id, title, description, project_id, assigned_to,
                  created_by, status, priority, due_date
```

---

## ⚙️ Setup & Run

### Backend

```bash
cd backend
npm install
npm run dev       # starts on http://localhost:5000
```

### Frontend (Standalone HTML — no build required!)

```bash
# Simply open in browser:
open frontend/index.html

# OR serve it:
cd frontend
npx serve .       # serves on http://localhost:3000
```

> **Important:** The frontend connects to `http://localhost:5000`. Make sure the backend is running first.

---

## 🔐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/users` | List all users |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | Get user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project + members |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/dashboard` | Dashboard stats |
| GET | `/api/tasks/project/:id` | Tasks for project |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |

---

## ✨ Key Features

- **Authentication** — JWT-based signup/login with bcrypt password hashing
- **Role-Based Access** — Admin vs Member roles with project-level permissions
- **Projects** — Create, manage, archive projects with member management
- **Tasks** — Kanban board (To Do → In Progress → Review → Done)
- **Dashboard** — Stats, overdue alerts, task breakdown by status
- **Validations** — Server-side input validation with express-validator
- **SQL Database** — SQLite with proper foreign key constraints and relationships

---

## 🔒 Role Permissions

| Action | Admin | Member |
|--------|-------|--------|
| Create projects | ✅ | ✅ |
| Delete any project | ✅ | ❌ (own only) |
| Add/remove members | ✅ (project admin) | ❌ |
| Create/edit tasks | ✅ | ✅ (project member) |
| View all projects | ✅ | ❌ (own/member only) |

---

## 🛠️ Tech Stack

**Backend:** Node.js, Express.js, better-sqlite3, JWT, bcryptjs, express-validator  
**Frontend:** React 18, Axios, CSS Variables, Google Fonts  
**Database:** SQLite (SQL) with WAL mode + foreign keys
