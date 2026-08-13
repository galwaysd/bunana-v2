-- Bunana V2 — Post Type (找布/有布)
-- Created: 2026-08-13
-- Description: 为发布的需求增加"找布/有布"分类字段
--              'seeking'  = 发布者找面料（需要他人有布）
--              'offering' = 发布者有面料（需要他人找布）
-- 老数据自动归为 'seeking'（安全默认值）

-- ============================================================
-- 1. 添加 post_type 列
-- ============================================================

ALTER TABLE requirements
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'seeking';

-- 把可能的 NULL 老记录归位（理论上前面的 DEFAULT 已处理；保留以防万一）
UPDATE requirements
  SET post_type = 'seeking'
  WHERE post_type IS NULL OR post_type NOT IN ('seeking', 'offering');

-- 添加 CHECK 约束（先删除后创建，避免重复）
ALTER TABLE requirements
  DROP CONSTRAINT IF EXISTS requirements_post_type_check;

ALTER TABLE requirements
  ADD CONSTRAINT requirements_post_type_check
  CHECK (post_type IN ('seeking', 'offering'));

-- ============================================================
-- 2. 索引（按 post_type 过滤）
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_requirements_post_type ON requirements (post_type);

-- ============================================================
-- 3. 注释
-- ============================================================

COMMENT ON COLUMN requirements.post_type IS '找布 (seeking) / 有布 (offering)';
