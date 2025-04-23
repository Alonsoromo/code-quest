import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col sm:flex-row">
      <aside className="bg-gray-800 text-white p-4 sm:w-64">
        <h2 className="text-xl font-bold mb-4">Panel Admin</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/admin/crear" className="hover:underline">➕ Crear reto</Link>
          <Link href="/admin/retos" className="hover:underline">🛠 Editar retos</Link>
          <Link href="/admin/submissions" className="hover:underline">📊 Submissions</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6 bg-gray-100">{children}</main>
    </div>
  )
}
