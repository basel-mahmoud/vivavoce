/** Long-form legal/editorial content with a readable measure (room world). */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 sm:px-8">
      <div className="prose-vv">{children}</div>
    </div>
  );
}
