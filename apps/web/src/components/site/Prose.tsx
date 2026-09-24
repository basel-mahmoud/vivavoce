/** Long-form legal/editorial content with a readable measure. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pb-24 sm:px-5">
      <div className="border-t border-line pt-10 sm:pt-14">
        <div className="prose-vv">{children}</div>
      </div>
    </div>
  );
}
