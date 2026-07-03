/** Long-form legal/editorial content with a readable measure (room world). */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pt-4 pb-20 sm:px-6">
      <div className="prose-vv">{children}</div>
    </div>
  );
}
