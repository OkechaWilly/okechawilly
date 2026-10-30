export default function AdminSection() {
  return (
    <section>
      <p className="eyebrow">Studio workspace</p>
      <h1 className="display mt-3 text-5xl md:text-6xl">Orders.</h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-[#77736d]">Customer orders and their fulfilment status will appear here after the shop checkout is enabled.</p>
      <div className="mt-10 border border-dashed border-[#cfcac0] bg-[#f7f6f2] px-6 py-12 text-center">
        <p className="display text-2xl">Workspace being prepared</p>
        <p className="mx-auto mt-3 max-w-lg text-xs leading-6 text-[#89847c]">No orders can be placed yet.</p>
      </div>
    </section>
  );
}
