import { format, t } from "@/lib/i18n";

const a = t.admin;

/**
 * What the last action did, from the `?hata=…` or `?tamam=1` it redirected to
 * (`?tamam=posta`: the workshop section's test mail went out).
 */
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
      {tamam === "posta" ? a.workshops.mail.sent : a.done}
    </p>
  ) : null;
}
