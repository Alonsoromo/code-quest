'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface LeaderboardItem {
  user_id: string
  email: string
  completados: number
  ultimo_envio: string
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<LeaderboardItem[]>([])

  useEffect(() => {
    async function fetchRanking() {
      const { data: subs } = await supabase
        .from('submissions')
        .select('user_id, resultado, created_at')
        .order('created_at', { ascending: false })

      if (!subs) return

      // Agrupar por usuario
      const mapa = new Map<string, { completados: number; ultimo: string }>()

      for (const sub of subs) {
        const completo = sub.resultado?.every((r: string) => r.includes('✅'))
        if (!completo) continue

        const actual = mapa.get(sub.user_id)
        if (!actual) {
          mapa.set(sub.user_id, {
            completados: 1,
            ultimo: sub.created_at,
          })
        } else {
          mapa.set(sub.user_id, {
            completados: actual.completados + 1,
            ultimo: actual.ultimo, // ya está ordenado por fecha, así que mantenemos la más reciente arriba
          })
        }
      }

      // Traer emails de usuarios
      const userIds = Array.from(mapa.keys())
      const { data: users, error } = await supabase
        .rpc('get_users_emails', { ids: userIds })

      if (error) {
        console.error('Error fetching user emails:', error)
        return
      }

      if (!users) {
        console.error('No users found')
        return
      }

      const rankingFinal: LeaderboardItem[] = userIds.map((id) => {
        const user = users?.find((u: { id: string; email: string }) => u.id === id)
        const info = mapa.get(id)!
        return {
          user_id: id,
          email: user?.email || 'Desconocido',
          completados: info.completados,
          ultimo_envio: info.ultimo,
        }
      })

      rankingFinal.sort((a, b) => b.completados - a.completados)

      setRanking(rankingFinal)
    }

    fetchRanking()
  }, [])

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🏆 Ranking Global</h1>

      {ranking.length === 0 ? (
        <p className="text-gray-600">Aún no hay usuarios con retos completados.</p>
      ) : (
        <ol className="space-y-3">
          {ranking.map((user, i) => (
            <li
              key={user.user_id}
              className="border p-4 rounded shadow flex items-center justify-between"
            >
              <div>
                <p className="font-semibold">
                  {i + 1}. {user.email.replace(/(.{3}).+(@.+)/, '$1***$2')}
                </p>
                <p className="text-sm text-gray-600">
                  Último envío: {new Date(user.ultimo_envio).toLocaleString()}
                </p>
              </div>
              <span className="text-xl font-bold text-green-700">
                {user.completados} ✅
              </span>
            </li>
          ))}
        </ol>
      )}
    </main>
  )
}
