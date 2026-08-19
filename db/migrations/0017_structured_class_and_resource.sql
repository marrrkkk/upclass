CREATE TYPE "public"."grade_level" AS ENUM('kindergarten', 'grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'grade_6', 'grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12', 'college', 'other');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('notes', 'slides', 'worksheet', 'reading', 'reference', 'template', 'other');--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "grade_level" "grade_level";--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "custom_grade" text;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "section" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "class_id" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "resource_type" "resource_type";--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "storage_path" text;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classes_grade_level_idx" ON "classes" USING btree ("grade_level");--> statement-breakpoint
CREATE INDEX "classes_section_idx" ON "classes" USING btree ("section");--> statement-breakpoint
CREATE INDEX "resources_class_idx" ON "resources" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "resources_resource_type_idx" ON "resources" USING btree ("resource_type");
