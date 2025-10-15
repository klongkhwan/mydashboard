import { createClient } from '@supabase/supabase-js'
import { Trade, TradeForm, TradeFilters, TradeStatistics } from '@/types/trading'

// Use service role key to bypass RLS temporarily
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // You'll need to add this to your .env.local
)

export async function createTradeWithServiceRole(trade: TradeForm) {
  // Use a simple user_id for now since we're using code-based auth
  const userId = "authenticated-user"

  const { data, error } = await supabaseService
    .from('trades')
    .insert([{ ...trade, user_id: userId }])
    .select()
    .single()

  if (error) throw error
  return data as Trade
}