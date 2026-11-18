export default function Loading() {
  return (
    <div
      data-route-loading="true"
      aria-busy="true"
      aria-label="Memuat halaman..."
      className="min-h-[82vh] w-full"
    />
  );
}
