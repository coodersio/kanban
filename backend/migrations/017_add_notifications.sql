-- Notifications System
-- Stores notifications for users (comments on tasks, mentions, etc.)

-- Notifications table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 接收通知的用户
  type VARCHAR(50) NOT NULL CHECK (type IN ('comment_on_assigned_task', 'mention_in_comment')),
  related_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  related_comment_id INTEGER REFERENCES task_comments(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- 触发通知的用户
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Comment mentions table (stores @mentions in comments)
CREATE TABLE comment_mentions (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  mentioned_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(comment_id, mentioned_user_id)  -- 防止重复提及
);

CREATE INDEX idx_comment_mentions_comment_id ON comment_mentions(comment_id);
CREATE INDEX idx_comment_mentions_user_id ON comment_mentions(mentioned_user_id);
