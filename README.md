# Collab — Real-time Collaborative Document Platform

A full-stack real-time document editor where multiple users can collaborate simultaneously. Built for a 5-hour hackathon.

---

## 🚀 Live Demo

- **Frontend**: [your-app.vercel.app](https://your-app.vercel.app)
- **Backend**: [your-server.onrender.com](https://your-server.onrender.com)

---

## ✨ Features

- 🔐 **User Authentication** — Register and login with email/password via Supabase Auth
- 📄 **Document Management** — Create, open, and delete documents from your personal dashboard
- ✍️ **Rich Text Editing** — Full formatting toolbar powered by Quill.js (headings, bold, italic, lists, code blocks)
- ⚡ **Real-time Collaboration** — Changes made by any user instantly appear for all connected users via Socket.io
- 💾 **Auto-save** — Document content automatically saves to the database every 3 seconds
- 🕓 **Version History** — Every save creates a snapshot, allowing content recovery
- 👥 **User Presence** — See colored avatars of who else is currently editing the document
- 🔒 **Document Sharing** — Owners can invite collaborators by email with editor permissions
- 📱 **Responsive UI** — Works on desktop and mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| Editor | Quill.js |
| Auth + Database | Supabase (PostgreSQL) |
| Real-time | Socket.io |
| Backend | Node.js + Express |
| Deployment | Vercel (frontend) + Render (backend) |

---

## 📁 Project Structure

```
collab-platform/
├── client/                         # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Authentication
│   │   │   ├── Register.jsx        # User registration
│   │   │   ├── Dashboard.jsx       # Document list + create/delete
│   │   │   └── Editor.jsx          # Quill editor + real-time sync
│   │   ├── lib/
│   │   │   ├── supabaseClient.js   # Supabase singleton
│   │   │   └── socket.js           # Socket.io singleton
│   │   └── App.jsx                 # Routing + auth guard
│   └── package.json
│
└── server/                         # Express backend
    ├── index.js                    # Express + Socket.io server
    ├── routes/
    │   └── docs.js                 # Document REST API
    └── package.json
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/collab-platform.git
cd collab-platform
```

### 2. Set up Supabase
Create a new project on Supabase, then run this in the **SQL Editor**:

```sql
-- Documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text default '',
  owner_id uuid references auth.users(id),
  created_at timestamp default now()
);

-- Version history
create table versions (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid references documents(id) on delete cascade,
  content text,
  saved_at timestamp default now()
);

-- Document sharing/permissions
create table document_members (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid references documents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'editor',
  created_at timestamp default now(),
  unique(doc_id, user_id)
);

-- Helper function for sharing by email
create or replace function get_user_by_email(email_input text)
returns table(id uuid, email text) as $$
  select id, email from auth.users where email = email_input;
$$ language sql security definer;

grant execute on function get_user_by_email to anon, authenticated;
```

### 3. Set up the frontend
```bash
cd client
cp .env.example .env
# Fill in your Supabase URL and anon key
npm install
npm run dev
```

### 4. Set up the backend
```bash
cd server
cp .env.example .env
# Fill in your Supabase URL and service key
npm install
npm run dev
```

### 5. Environment variables

**`client/.env`**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SOCKET_URL=http://localhost:4000
```

**`server/.env`**
```
PORT=4000
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

---

## 🚢 Deployment

### Frontend — Vercel
1. Import repo on [vercel.com](https://vercel.com)
2. Set root directory to `client`
3. Add environment variables (use production Render URL for `VITE_SOCKET_URL`)

### Backend — Render
1. Create new Web Service on [render.com](https://render.com)
2. Set root directory to `server`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add environment variables (use production Vercel URL for `CLIENT_URL`)

---

## 🔄 How Real-time Sync Works

```
User A types → Quill fires text-change event
             → Delta sent to server via Socket.io
             → Server broadcasts delta to all users in the same document room
             → User B's Quill applies the delta instantly
             → Auto-save triggers after 3 seconds of inactivity
             → Content + version snapshot saved to Supabase
```

---

## 👥 Team

Built in 5 hours at a hackathon by Group 1.