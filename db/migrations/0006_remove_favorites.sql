DROP TABLE IF EXISTS "favorites";

DO $$
BEGIN
  DROP TYPE IF EXISTS "favorite_target_type";
EXCEPTION
  WHEN dependent_objects_still_exist THEN NULL;
END $$;
