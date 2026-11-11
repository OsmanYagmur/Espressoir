/** What a section of the panel says when it has nothing to list. */
export function Empty({ children }: { children: string }) {
  return <p className="text-ink-2">{children}</p>;
}
