import 'dotenv/config'
import {config} from '../config.js'
import { createDatabase } from '../database/index.js'
import { getMailer } from './mail.js'

/**
 * Run once: finds appointments whose slot starts between
 * (now + 24h) and (now + 24h + REMINDER_WINDOW_MINUTES).
 *
 * Usage:
 *   REMINDER_WINDOW_MINUTES=5 MAIL_MODE=console npm run reminders:run
 */
async function main() {
  const windowMinutes = Number(process.env.REMINDER_WINDOW_MINUTES ?? 5)
  const mailer = getMailer()

  const conn = {
    connectionString:
      (config as any).database?.connectionString ?? process.env.DATABASE_URL,
  }
  const db = createDatabase(conn)

  try {
    const q = `
      SELECT
        a.id                AS appt_id,
        s.start_time        AS slot_start,
        s.end_time          AS slot_end,
        p.email             AS patient_email,
        COALESCE(p.username, 'Patient') AS patient_name,
        COALESCE(d.username, 'Doctor')  AS doctor_name,
        sp.name             AS specialization_name
      FROM appointments a
      JOIN availability_slots s ON s.id = a.availability_slot_id
      JOIN users p ON p.id = a.patient_id
      JOIN users d ON d.id = s.doctor_id
      JOIN specializations sp ON sp.id = s.specialization_id
      WHERE a.status IN ('pending', 'confirmed')
        AND s.start_time >= (now() + interval '24 hours')
        AND s.start_time <  (now() + interval '24 hours' + ($1::int * interval '1 minute'))
      ORDER BY s.start_time ASC
    `
    const { rows } = await db.query(q, [windowMinutes])

    let sent = 0
    for (const r of rows) {
      const when = new Date(r.slot_start).toISOString()
      const subject = `Reminder: appointment with ${r.doctor_name} (${r.specialization_name})`
      const text = [
        `Hello ${r.patient_name},`,
        ``,
        `This is a reminder for your appointment in ~24h:`,
        `- Doctor: ${r.doctor_name}`,
        `- Specialization: ${r.specialization_name}`,
        `- Starts at: ${when} (UTC)`,
        ``,
        `If you need to cancel or reschedule, please do so in the app.`,
      ].join('\n')

      await mailer.send({
        to: r.patient_email,
        subject,
        text,
      })
      sent++
    }

    console.log(`[remind-24h] processed=${rows.length} sent=${sent} window=${windowMinutes}m`)
  } catch (e) {
    console.error('[remind-24h] failed:', e)
    process.exitCode = 1
  } finally {
    await db.close()
  }
}

main()