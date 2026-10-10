// Every public page must be fully static: no per-visitor server rendering.
// The build fails if a page here reads cookies/headers or uncached data.
export const ensureStatic = "navigation";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return children;
}
