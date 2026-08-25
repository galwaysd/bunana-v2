-- Bunana V2 — Full Fabric DNA persistence
-- Preserve the complete 14-field Fabric DNA alongside the existing
-- fabric_name/specs/keywords/summary compatibility projection.

alter table requirements
  add column if not exists fabric_dna jsonb;

comment on column requirements.fabric_dna is
  'Complete 14-field Fabric DNA with value, status, confidence, and source metadata';
