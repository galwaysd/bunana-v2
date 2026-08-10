-- ============================================================
-- 0004: 安全加固 — 收紧 RLS 策略
-- ============================================================
-- 策略：
--   - service_role key 始终绕过 RLS（Supabase 内置行为）
--   - anon key 只能读取公开数据（广场/图片），不能写入任何表
--   - conversations/messages 为私密数据，anon key 完全无权访问
-- ============================================================

-- ===================== image_assets =====================
-- 删除旧策略（全开放）
DROP POLICY IF EXISTS "image_assets_public_read"    ON image_assets;
DROP POLICY IF EXISTS "image_assets_service_insert" ON image_assets;
DROP POLICY IF EXISTS "image_assets_service_update" ON image_assets;

-- 新策略：anon 可读，写操作仅 service_role（无 policy = 默认拒绝）
CREATE POLICY "image_assets_public_read" ON image_assets FOR SELECT USING (true);

-- ===================== requirements =====================
DROP POLICY IF EXISTS "requirements_public_read"    ON requirements;
DROP POLICY IF EXISTS "requirements_service_insert" ON requirements;

-- 新策略：anon 可读，写操作仅 service_role
CREATE POLICY "requirements_public_read" ON requirements FOR SELECT USING (true);

-- ===================== conversations =====================
-- 聊天数据为私密，完全禁止 anon 访问
DROP POLICY IF EXISTS "Allow all on conversations" ON conversations;
-- 不创建任何新策略 = anon 默认被拒绝

-- ===================== messages =====================
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
-- 不创建任何新策略 = anon 默认被拒绝

-- ===================== Storage =====================
-- 为 fabric-samples bucket 添加受控 RLS 策略
-- anon 可读取（bucket 已是 public），但不可写入
DROP POLICY IF EXISTS "fabric_samples_public_read"    ON storage.objects;
DROP POLICY IF EXISTS "fabric_samples_service_insert" ON storage.objects;

CREATE POLICY "fabric_samples_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'fabric-samples');

-- storage.objects 的 INSERT 无 anon 策略 = 默认拒绝
-- 应用层通过 serviceRoleKey 上传，无需 RLS 策略
