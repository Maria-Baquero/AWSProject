import { query } from '../config/database';
import { Appointment, CreateAppointmentData } from '../types/appointment';

interface AppointmentRow {
  id: string;
  pet_id: string;
  created_by: string | null;
  date: string | Date;
  start_time: string;
  duration_minutes: number;
  reason: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

function mapRowToAppointment(row: AppointmentRow): Appointment {
  // row.date from pg can be a Date object for DATE columns - ensure it's YYYY-MM-DD string
  const dateValue = row.date instanceof Date
    ? row.date.toISOString().split('T')[0]
    : typeof row.date === 'string' ? row.date.split('T')[0] : row.date;

  return {
    id: row.id,
    petId: row.pet_id,
    createdBy: row.created_by,
    date: dateValue,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create(data: CreateAppointmentData): Promise<Appointment> {
  const result = await query<AppointmentRow>(
    `INSERT INTO appointments (pet_id, created_by, date, start_time, duration_minutes, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.petId, data.createdBy || null, data.date, data.startTime, data.durationMinutes, data.reason]
  );
  return mapRowToAppointment(result.rows[0]);
}

export async function findByDate(date: string): Promise<Appointment[]> {
  const result = await query<AppointmentRow & { pet_name?: string; client_name?: string }>(
    `SELECT a.*, p.name as pet_name, c.full_name as client_name
     FROM appointments a
     JOIN pets p ON a.pet_id = p.id
     JOIN clients c ON p.client_id = c.id
     WHERE a.date = $1
     ORDER BY a.start_time ASC`,
    [date]
  );
  return result.rows.map((row) => ({
    ...mapRowToAppointment(row),
    petName: row.pet_name || undefined,
    clientName: row.client_name || undefined,
  }));
}

export async function findByPet(petId: string): Promise<Appointment[]> {
  const result = await query<AppointmentRow>(
    `SELECT * FROM appointments WHERE pet_id = $1 ORDER BY date DESC, start_time DESC LIMIT 100`,
    [petId]
  );
  return result.rows.map(mapRowToAppointment);
}

export async function findById(id: string): Promise<Appointment | null> {
  const result = await query<AppointmentRow>(
    `SELECT * FROM appointments WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToAppointment(result.rows[0]);
}

export async function updateStatus(id: string, status: 'scheduled' | 'completed' | 'cancelled'): Promise<Appointment | null> {
  const result = await query<AppointmentRow>(
    `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToAppointment(result.rows[0]);
}

export async function checkConflict(
  date: string,
  startTime: string,
  durationMinutes: number,
  excludeId?: string
): Promise<boolean> {
  const result = await query<{ has_conflict: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM appointments
      WHERE date = $1
        AND status = 'scheduled'
        AND id <> COALESCE($4::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
          (start_time, start_time + (duration_minutes || ' minutes')::INTERVAL)
          OVERLAPS
          ($2::TIME, $2::TIME + ($3 || ' minutes')::INTERVAL)
        )
    ) AS has_conflict`,
    [date, startTime, durationMinutes, excludeId || null]
  );
  return result.rows[0].has_conflict;
}
