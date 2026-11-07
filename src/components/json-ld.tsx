// Structured data that helps Google understand what a page is (an artwork, a
// product for sale, an article). "<" is escaped so content can never end the tag early.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
