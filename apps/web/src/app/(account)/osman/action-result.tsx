import { format, t } from "@/lib/i18n";

const a = t.admin;

/** What the last action did, from the `?hata=…` or `?tamam=1` it redirected to. */
export function ActionResult({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { hata, tamam } = searchParams;
  if (typeof hata === "string") {
    const reason = a.errors[hata as keyof typeof a.errors] ?? a.errors.unknown;
    return (
      <p role="alert" className="mb-6 font-medium text-danger">
        {format(a.failed, { reason })}
      </p>
    );
  }
  return tamam ? (
    <p role="status" className="mb-6 rounded-md bg-leaf-soft p-4 font-medium text-leaf">
      {a.done}
    </p>
  ) : null;
}
