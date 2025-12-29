-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'developer' CHECK (role IN ('admin', 'developer', 'external')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(user_name);
CREATE INDEX idx_users_role ON users(role);

-- Departments
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_departments_name ON departments(name);

-- Project Types
CREATE TABLE project_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_project_types_name ON project_types(name);

-- Projects
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  software_name VARCHAR(255) NOT NULL,
  project_type_id INTEGER REFERENCES project_types(id),
  department_id INTEGER REFERENCES departments(id),
  is_critical BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_type ON projects(project_type_id);
CREATE INDEX idx_projects_department ON projects(department_id);

-- Sprints
CREATE TABLE sprints (
  id SERIAL PRIMARY KEY,
  sprint_number VARCHAR(10) UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'current', 'archived')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_sprints_start_date ON sprints(start_date);

-- Sprint Projects (Snapshot)
CREATE TABLE sprint_projects (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  notes TEXT,
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sprint_id, project_id)
);

CREATE INDEX idx_sprint_projects_sprint ON sprint_projects(sprint_id);
CREATE INDEX idx_sprint_projects_project ON sprint_projects(project_id);

-- Stories (Reference)
CREATE TABLE stories (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  planned_start_date DATE,
  planned_end_date DATE,
  is_critical BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stories_project ON stories(project_id);

-- Sprint Stories (Snapshot)
CREATE TABLE sprint_stories (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  assigned_to INTEGER REFERENCES users(id),
  notes TEXT,
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sprint_id, story_id)
);

CREATE INDEX idx_sprint_stories_project ON sprint_stories(project_id);
CREATE INDEX idx_sprint_stories_sprint ON sprint_stories(sprint_id);
CREATE INDEX idx_sprint_stories_story ON sprint_stories(story_id);
CREATE INDEX idx_sprint_stories_status ON sprint_stories(status);

-- Tasks (Reference)
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
  title VARCHAR(200),
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_story_id ON tasks(story_id);

-- Sprint Tasks (Snapshot)
CREATE TABLE sprint_tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  assigned_to INTEGER REFERENCES users(id),
  risk_and_countermeasure TEXT,
  notes TEXT,
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sprint_id, task_id)
);

CREATE INDEX idx_sprint_tasks_project ON sprint_tasks(project_id);
CREATE INDEX idx_sprint_tasks_sprint ON sprint_tasks(sprint_id);
CREATE INDEX idx_sprint_tasks_task ON sprint_tasks(task_id);
CREATE INDEX idx_sprint_tasks_story ON sprint_tasks(story_id);
CREATE INDEX idx_sprint_tasks_status ON sprint_tasks(status);
