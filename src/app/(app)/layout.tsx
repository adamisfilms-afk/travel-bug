import { Sidebar } from "@/components/Sidebar";

/** The signed-in app: sidebar + page content. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="pl-[64px] md:pl-[84px]">
        <div className="px-5 md:px-12 py-8 md:py-10 max-w-[1800px]">{children}</div>
      </main>
    </>
  );
}
