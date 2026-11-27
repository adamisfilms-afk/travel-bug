import { Sidebar } from "@/components/Sidebar";

/** The signed-in app: sidebar + page content. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0 md:pl-[84px]">
        <div className="px-5 md:px-12 py-8 md:py-10 max-w-[1800px]">{children}</div>
      </main>
    </>
  );
}
