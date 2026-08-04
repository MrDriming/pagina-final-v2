CREATE TABLE "calificaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alumno_id" uuid NOT NULL,
	"materia" text NOT NULL,
	"trimestre_1" integer,
	"trimestre_2" integer,
	"trimestre_3" integer,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consultas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alumno_id" uuid NOT NULL,
	"profesor_id" uuid NOT NULL,
	"materia" text NOT NULL,
	"mensaje" text NOT NULL,
	"respuesta" text,
	"estado" text DEFAULT 'pendiente',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "perfiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"nombre" text DEFAULT '' NOT NULL,
	"rol" text DEFAULT 'alumno' NOT NULL,
	"anio" text,
	"division" text,
	"catedras" text[],
	"created_at" timestamp with time zone DEFAULT now()
);
