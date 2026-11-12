import Link from "next/link";
export default async function OrderReceivedPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return <main className="container min-h-[55vh] py-20"><p className="eyebrow">Order request received</p><h1 className="display mt-4 max-w-3xl text-5xl md:text-6xl">Thank you for your order.</h1><p className="mt-6 max-w-xl text-sm leading-7 text-[#77736d]">Your request{order ? <> (<strong>{order}</strong>)</> : ""} has been recorded. The studio will review the items and your delivery details, then confirm availability and the delivery cost before sending your final total for approval. No payment has been taken.</p><Link href="/shop" className="mt-8 inline-block bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-white">Return to the shop ↗</Link></main>;
}
