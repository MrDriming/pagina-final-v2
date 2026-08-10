"use client"

export default function CampusError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        No pudimos mostrar esta sección
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Puede que no tengas permiso, o que haya fallado la conexión. Si sigue
        pasando, avisá a Secretaría.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Reintentar
      </button>
    </div>
  )
}
