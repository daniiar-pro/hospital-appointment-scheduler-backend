import 'dotenv/config'
import {config} from '../config.js'
import { createDatabase } from '../database/index.js'

/**
 * Warps the most recently booked CONFIRMED appointment's slot to start at
 * (now + N minutes), default 1442 (≈ 24h + 2m).
 *
 * Usage:
 *   WARP_MINUTES_AHEAD=1442 npm run dev:warp-latest
 */
async function main() {
  const minutesAhead = Number(process.env.WARP_MINUTES_AHEAD ?? 1442)
  const conn = {
    connectionString:
      (config as any).database?.connectionString ?? process.env.DATABASE_URL,
  }
  const db = createDatabase(conn)

  try {
    const q = `
      WITH target AS (
        SELECT s.id, s.duration_mins
        FROM appointments a
        JOIN availability_slots s ON s.id = a.availability_slot_id
        WHERE a.status = 'confirmed'
        ORDER BY a.booked_at DESC
        LIMIT 1
      )
      UPDATE availability_slots s
      SET start_time = now() + ($1::int * interval '1 minute'),
          end_time   = now() + (($1::int + COALESCE(t.duration_mins, 30)) * interval '1 minute')
      FROM target t
      WHERE s.id = t.id
      RETURNING s.id, s.start_time, s.end_time
    `
    const { rows } = await db.query(q, [minutesAhead])

    if (!rows.length) {
      console.log('[warp] No confirmed appointments found to warp.')
    } else {
      console.log('[warp] Warped slot:', rows[0])
    }
  } catch (e) {
    console.error('[warp] failed:', e)
    process.exitCode = 1
  } finally {
    await db.close()
  }
}

main()