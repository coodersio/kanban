# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **KanBan Weekly Report System** - a full-stack web application for managing software project sprints, stories, and tasks with a visual kanban board interface. It replaces manual Excel-based weekly reporting with a structured database-backed system.

**Architecture**: Traditional client-server with REST API
- **Frontend**: React 19 + TypeScript + Vite (port 3003)
- **Backend**: Node.js + Express + TypeScript (port 4004)
- **Database**: PostgreSQL 16.x (Docker or local)

## Common Commands

### Frontend Development
```bash
cd frontend
npm run dev          # Start Vite dev server on http://localhost:3003
npm run build        # TypeScript compile + Vite production build
npm run lint         # ESLint check
```

### Backend Development
```bash
cd backend
npm run dev          # Start with hot reload (ts-node-dev)
npm run build        # Compile TypeScript to JavaScript
npm start            # Run compiled production build
npm run migrate:up   # Apply database migrations
npm run migrate:down # Rollback database migrations
```

### Database Setup
```bash
# Option 1: Docker (recommended)
docker-compose up -d

# Option 2: Local PostgreSQL
./setup.sh  # Creates user 'plugcamp', database 'workos', and initializes with:
            # - Admin account (username: admin, password: admin123)
            # - Backlog sprint (id: -1)
```

Database connection defaults: `postgresql://plugcamp:Qwert12345@localhost:5432/workos`

**Initial Credentials:**
- Username: `admin`
- Password: `admin123`
- Role: Administrator

## Critical Architecture Patterns

### 1. Flow Model (流转模型) - Core Innovation

**Key Concept**: Story and Task IDs persist across sprints. State is managed via snapshot tables, not by copying entities.

```
Sprint 1: Task #1 (created, status: not_started)
Sprint 2: Task #1 (continued, status: in_progress)
Sprint 3: Task #1 (continued, status: completed)
```

**Implication**: When a task appears in a new sprint, do NOT create a new task. Instead, create a new row in `sprint_tasks` linking to the existing `tasks.id`.

### 2. Dual Table Architecture (Reference + Snapshot)

**Reference Tables** (global, immutable attributes):
- `projects` - Software project metadata
- `stories` - User story/feature definitions (title, description, planned dates)
- `tasks` - Task definitions (title, description)

**Snapshot Tables** (sprint-specific state):
- `sprint_projects` - Which projects are active in each sprint
- `sprint_stories` - Story status per sprint (status, progress, assigned_to, notes)
- `sprint_tasks` - Task status per sprint (status, progress, risk_and_countermeasure)

**Data Flow**: Frontend receives merged data from JOINs:
```sql
SELECT
  stories.id, stories.title, stories.description,  -- Reference (global)
  sprint_stories.status, sprint_stories.progress   -- Snapshot (sprint-specific)
FROM stories
JOIN sprint_stories ON stories.id = sprint_stories.story_id
WHERE sprint_stories.sprint_id = ?
```

### 3. TypeScript Import Requirements

**CRITICAL**: The codebase uses `verbatimModuleSyntax: true` in `tsconfig.app.json`.

**All type-only imports MUST use `import type`:**

```typescript
// ❌ WRONG - Will cause runtime error
import { Task, Story } from "@/types";
import { DragEndEvent } from '@dnd-kit/core';

// ✅ CORRECT
import type { Task, Story } from "@/types";
import type { DragEndEvent } from '@dnd-kit/core';

// ✅ ALSO CORRECT (inline)
import { type Task, type Story } from "@/types";
```

**Common error**: `The requested module does not provide an export named 'X'`
**Solution**: Change to `import type { X }` for type imports.

### 4. Sprint Status Mapping (UI ↔ Database)

The UI and database use different status values:

| UI Value   | Database Value | Description |
|------------|----------------|-------------|
| `planning` | `planned`      | Sprint being planned |
| `active`   | `current`      | Active sprint |
| `closed`   | `archived`     | Completed sprint |

**When writing API code**: Always map between these values at the API boundary.

### 5. Vite Proxy Configuration

Frontend proxies `/api` requests to backend during development:

```javascript
// vite.config.ts
server: {
  port: 3003,
  proxy: {
    '/api': {
      target: 'http://localhost:4004',
      changeOrigin: true,
    }
  }
}
```

**API calls**: Always use relative paths like `/api/workbench/board` (not `http://localhost:4004/api/...`).

## Key API Endpoints

### Workbench Board API (Core Feature)

```javascript
GET /api/workbench/sprint/:sprintId/projects
// Returns projects active in a sprint

GET /api/workbench/board?sprintId=X&projectId=Y
// Returns stories and tasks for a sprint+project
// Response: { stories: Story[], tasks: Task[] }

POST /api/workbench/task/status
// Update or create task snapshot (UPSERT pattern)
// Body: { sprintId, projectId, taskId, status, storyId }
```

### Sprint Management

```javascript
GET  /api/sprints           // List all sprints
POST /api/sprints           // Create sprint
POST /api/sprints/:id/activate  // Set sprint to 'current' status
```

## Database Schema Key Points

### Sprint Numbering
Uses ISO 8601 week format: `YYYY-WW` (e.g., `2025-53`)

### Critical Constraints
- `sprint_stories`: UNIQUE(sprint_id, story_id) - prevents duplicate entries
- `sprint_tasks`: UNIQUE(sprint_id, task_id) - prevents duplicate entries

### User Roles
- `admin` - Full system access
- `developer` - Standard user
- `external` - Limited access

## Component Architecture

### Layout Hierarchy
```
App.tsx (React Router)
└─ DashboardLayout (sidebar + header)
   └─ <Outlet />
       ├─ Dashboard
       ├─ Workbench (Main kanban board)
       ├─ ProjectsPage
       ├─ SprintsPage
       └─ UsersPage
```

### Drag-and-Drop Implementation

Kanban board uses `@dnd-kit`:
- **Draggable**: TaskCard components
- **Droppable**: KanbanColumn components (3 per story row)
- **Drop zone IDs**: Format `"storyId::status"` (e.g., `"10::in_progress"`)
- **Optimistic updates**: UI updates immediately, API call follows

### UI Component Library

Uses **shadcn/ui** (copy-paste components, NOT npm package):
- Components in `/frontend/src/components/ui/`
- Built on Radix UI primitives
- Styled with Tailwind CSS
- Import path alias: `@/components/ui/button`

## Path Aliases

Both frontend and backend use `@` alias:

```json
// tsconfig.json
"paths": {
  "@/*": ["./src/*"]
}
```

```javascript
// Usage
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
```

## Authentication

Session-based auth using `express-session`:
- Session cookie expires after 24 hours
- Passwords hashed with bcrypt (10 rounds)
- Session stored in memory (NOT production-ready)

**Login flow**:
```
POST /api/auth/login → Session created → Cookie sent
GET /api/auth/me → Verify session
POST /api/auth/logout → Session destroyed
```

## Development Workflow

### Starting Development Environment

```bash
# Terminal 1: Database
docker-compose up -d

# Terminal 2: Backend
cd backend
npm install
npm run migrate:up  # First time only
npm run dev

# Terminal 3: Frontend
cd frontend
npm install
npm run dev

# Access: http://localhost:3003
```

### Database Migrations

Migration files in `/backend/migrations/`:
- Naming: `XXX_description.sql` (e.g., `001_initial_schema.sql`)
- Applied in numerical order
- Tracked in `schema_migrations` table

## Important Documentation

Comprehensive architecture document (Chinese): `/方案/architecture-design-final.md`

Contains:
- Detailed business requirements
- Complete database schema with ER diagrams
- API specifications
- Business workflow descriptions
- Design decisions and rationale

## Common Pitfalls

1. **Type imports**: Always use `import type` for TypeScript types
2. **Sprint status**: Remember UI/DB mapping (`active` ↔ `current`)
3. **Task creation**: Don't create new task IDs across sprints - use snapshots
4. **API paths**: Use relative `/api/...` paths, not absolute URLs
5. **Session auth**: Not suitable for production - consider JWT for deployment
6. **Database joins**: Always join reference + snapshot tables for complete data

## Testing Considerations

- No test framework currently configured
- Manual testing via UI recommended
- Database migrations should be tested up AND down
- Session persistence not suitable for multi-server deployments
