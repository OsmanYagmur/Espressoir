/**
 * Structured data for search engines (lib/structured-data.ts), written into the page.
 * "<" is escaped because the JSON sits inside a <script> tag.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
