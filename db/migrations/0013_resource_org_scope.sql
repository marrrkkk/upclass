ALTER TABLE "resources" ADD COLUMN "org_id" text;
UPDATE "resources" r
SET "org_id" = (
  SELECT m."org_id"
  FROM "org_membership" m
  WHERE m."user_id" = r."owner_id"
  ORDER BY CASE m."role" WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, m."created_at"
  LIMIT 1
)
WHERE r."org_id" IS NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "resources" WHERE "org_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot scope resources: some owners have no organization membership';
  END IF;
END $$;
ALTER TABLE "resources" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "resources" ADD CONSTRAINT "resources_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE cascade;
CREATE INDEX "resources_org_idx" ON "resources" USING btree ("org_id");
