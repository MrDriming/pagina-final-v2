CREATE TABLE "catedras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profesor_id" uuid NOT NULL,
	"materia_id" uuid NOT NULL,
	"division" text NOT NULL,
	CONSTRAINT "catedras_profesor_materia_division_key" UNIQUE("profesor_id","materia_id","division")
);
--> statement-breakpoint
CREATE TABLE "materias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"anio" text NOT NULL,
	CONSTRAINT "materias_nombre_anio_key" UNIQUE("nombre","anio")
);
--> statement-breakpoint
ALTER TABLE "calificaciones" ALTER COLUMN "materia" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "calificaciones" ADD COLUMN "materia_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "calificaciones" ADD COLUMN "ciclo_lectivo" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "calificaciones" ADD COLUMN "actualizado_por" uuid;--> statement-breakpoint
ALTER TABLE "catedras" ADD CONSTRAINT "catedras_profesor_id_perfiles_user_id_fk" FOREIGN KEY ("profesor_id") REFERENCES "public"."perfiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catedras" ADD CONSTRAINT "catedras_materia_id_materias_id_fk" FOREIGN KEY ("materia_id") REFERENCES "public"."materias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_alumno_id_perfiles_user_id_fk" FOREIGN KEY ("alumno_id") REFERENCES "public"."perfiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_materia_id_materias_id_fk" FOREIGN KEY ("materia_id") REFERENCES "public"."materias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_actualizado_por_perfiles_user_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."perfiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_alumno_materia_ciclo_key" UNIQUE("alumno_id","materia_id","ciclo_lectivo");