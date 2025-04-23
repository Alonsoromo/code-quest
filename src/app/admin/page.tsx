import { redirect } from 'next/navigation'

export default function AdminIndex() {
  // Redirige a crear por defecto (puedes cambiar a dashboard real si prefieres)
  redirect('/admin/crear')
}
