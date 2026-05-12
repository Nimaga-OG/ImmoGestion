// hooks/useRealtime.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtime(table: string) {
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Initial load
    const loadData = async () => {
      const { data: initialData, error } = await supabase
        .from(table)
        .select('*')
      
      if (error) {
        setError(error)
        return
      }
      
      if (initialData) {
        setData(initialData)
      }
    }

    loadData()

    // Subscribe to changes
    const subscription = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: table },
        (payload) => {
          setData((currentData) => {
            switch (payload.eventType) {
              case 'INSERT':
                return [...currentData, payload.new]
              case 'UPDATE':
                return currentData.map((item) =>
                  item.id === payload.new.id ? payload.new : item
                )
              case 'DELETE':
                return currentData.filter((item) => item.id !== payload.old.id)
              default:
                return currentData
            }
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [table])

  return { data, error }
}