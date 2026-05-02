# ERC Support System (Production SaaS Upgrade)

Multi-tenant MERN service-management platform for CCTV operations with advanced analytics, interactive charting, real-time call workflows, inventory, and report exports.

## Stack

- Frontend: React, Vite, Tailwind, Recharts, Socket.io client, React Hot Toast
- Backend: Node.js, Express, MongoDB, JWT, Joi, Cloudinary, Socket.io, PDFKit
- Database: MongoDB (local or Atlas)

## Full Folder Structure

```text
backend/
  src/
    config/
      cloudinary.js
      db.js
    controllers/
      authController.js
      callController.js
      cameraController.js
      dashboardController.js
      inventoryController.js
      reportController.js
      uploadController.js
    middleware/
      auth.js
      errorHandler.js
      validate.js
    models/
      Tenant.js
      User.js
      Camera.js
      Call.js
      InventoryItem.js
    routes/
      authRoutes.js
      cameraRoutes.js
      callRoutes.js
      dashboardRoutes.js
      inventoryRoutes.js
      reportRoutes.js
      uploadRoutes.js
    utils/
      asyncHandler.js
      seed.js
      socket.js
    validators/
      authValidator.js
      cameraValidator.js
      callValidator.js
      inventoryValidator.js
    server.js
frontend/
  src/
    components/
      CameraDetailModal.jsx
      CameraWaffle.jsx
      CameraPieChart.jsx
      ChartCard.jsx
      KpiCard.jsx
      Layout.jsx
      ProtectedRoute.jsx
      StatusBadge.jsx
    context/
      AuthContext.jsx
      SocketContext.jsx
      ThemeContext.jsx
    pages/
      AdminDashboard.jsx
      CallManagementPage.jsx
      EngineerDashboard.jsx
      ClientDashboard.jsx
      InventoryPage.jsx
      ReportsPage.jsx
      LoginPage.jsx
    api.js
    App.jsx
    main.jsx
    styles.css
```

## Implemented Features

1. Advanced dashboard
- Main camera status pie chart
- Fault analysis pie chart
- Engineer completed-call bar chart
- Calls-per-day line chart (last 7 days)
- Clickable waffle grid for all 37 cameras
- Camera detail modal with history + images

2. Advanced call management
- Create and assign calls
- Priority: low/medium/high
- SLA timer + overdue highlighting
- Filters: status, engineer, date
- Search: camera + issue text

3. Engineer system
- Role dashboard with assigned/completed/pending metrics
- Status update flow
- Feedback and GPS updates

4. Cloudinary image upload
- Before/after image upload via backend upload endpoint
- Images shown in call and camera detail views

5. Real-time notifications
- Socket.io tenant rooms
- Events: call assigned, call completed

6. Secure auth
- JWT authentication
- bcrypt hashing
- role-based middleware
- tenant-aware data isolation

7. Inventory module
- Add and list spare parts
- Low stock alert
- Parts usage model attached to calls

8. Reports module
- Daily/weekly report summaries
- PDF export endpoint
- Includes uptime, fault analysis, engineer performance

9. Multi-client architecture
- Tenant model
- Tenant-linked users/cameras/calls/inventory
- Users only see tenant-scoped data

10. SaaS UI polish
- Sidebar + topbar app shell
- Dark mode toggle
- Responsive cards/charts/layout
- Smooth hover/transition behavior
- Toast notifications

## Environment Variables

### Backend `.env`

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/erc_support
JWT_SECRET=replace-with-a-secure-random-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Frontend `.env` (optional)

```env
VITE_API_BASE_URL=/api
VITE_SOCKET_URL=http://127.0.0.1:5000
```

## Local Setup

### 1) Install

```bash
cd backend
npm install
cd ../frontend
npm install
```

### 2) Seed database

```bash
cd backend
npm run seed
```

### 3) Run apps

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

## Seeded Users

- Admin: `admin@erc.local` / `Admin@123`
- Engineer: `krishna@erc.local` / `Engineer@123`
- Engineer: `santosh@erc.local` / `Engineer@123`
- Client: `client@erc.local` / `Client@123`

## API Summary

- Auth: `/api/auth/login`, `/api/auth/me`, `/api/auth/users`, `/api/auth/engineers`
- Dashboard: `/api/dashboard/summary`, `/api/dashboard/engineer-performance`
- Cameras: `/api/cameras`, `/api/cameras/:id/details`
- Calls: `/api/calls`, `/api/calls/:id/assign`, `/api/calls/:id/status`
- Upload: `/api/uploads/image`
- Inventory: `/api/inventory`
- Reports: `/api/reports/summary`, `/api/reports/export`

## Deployment (Production)

### A) MongoDB Atlas
1. Create Atlas cluster
2. Add DB user + network access
3. Copy connection string to `MONGO_URI`

### B) Backend on Render/Railway
1. Push repo to GitHub
2. Create new web service from `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add backend env vars from above
6. Set `CORS_ORIGIN` to your frontend URL(s)

### C) Frontend on Vercel/Netlify
1. Import repo and set root directory to `frontend`
2. Build command: `npm run build`
3. Output dir: `dist`
4. Add env:
   - `VITE_API_BASE_URL=https://<backend-domain>/api`
   - `VITE_SOCKET_URL=https://<backend-domain>`
5. Deploy and test login + dashboard + socket events

## Production Notes

- Keep JWT secret and Cloudinary keys private
- Enable HTTPS in all deployed endpoints
- Restrict CORS to known domains
- Add indexes/migrations when dataset grows
- Optionally add Redis for Socket.io horizontal scaling
