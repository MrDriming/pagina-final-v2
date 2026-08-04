CREATE TABLE "calificaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alumno_id" text NOT NULL,
	"materia" text NOT NULL,
	"trimestre_1" integer,
	"trimestre_2" integer,
	"trimestre_3" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consultas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alumno_id" text NOT NULL,
	"profesor_id" text NOT NULL,
	"materia" text NOT NULL,
	"mensaje" text NOT NULL,
	"respuesta" text,
	"estado" text DEFAULT 'pendiente',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "perfiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"rol" text NOT NULL,
	"catedras" text[]
);
