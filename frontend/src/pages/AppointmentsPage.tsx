import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAppointmentsByDate,
  cancelAppointment,
  completeAppointment,
} from '../services/appointmentService'
import { useToast } from '../hooks/useToast'
import { AppointmentForm } from '../components/AppointmentForm'
import type { Appointment } from '../types/appointment'

function getTodayString(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

function statusLabel(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'Programada'
    case 'completed':
      return 'Completada'
    case 'cancelled':
      return 'Cancelada'
    default:
      return status
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800'
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [showForm, setShowForm] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'cancel' | 'complete'
    appointment: Appointment
  } | null>(null)

  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: () => getAppointmentsByDate(selectedDate),
    enabled: !!selectedDate,
  })

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      showSuccess('Cita cancelada exitosamente')
      setConfirmAction(null)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Error al cancelar la cita'
      showError(message)
      setConfirmAction(null)
    },
  })

  const completeMutation = useMutation({
    mutationFn: completeAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      showSuccess('Cita completada exitosamente')
      setConfirmAction(null)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Error al completar la cita'
      showError(message)
      setConfirmAction(null)
    },
  })

  function handleConfirm() {
    if (!confirmAction) return
    if (confirmAction.type === 'cancel') {
      cancelMutation.mutate(confirmAction.appointment.id)
    } else {
      completeMutation.mutate(confirmAction.appointment.id)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Citas</h2>
          <p className="mt-1 text-gray-600">Agenda diaria de citas veterinarias</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          Nueva Cita
        </button>
      </div>

      {/* Date selector */}
      <div className="mb-6">
        <label htmlFor="date-selector" className="block text-sm font-medium text-gray-700 mb-1">
          Fecha
        </label>
        <input
          type="date"
          id="date-selector"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Appointments list */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando citas...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">
            No hay citas programadas para esta fecha.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Crear primera cita
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatTime(appointment.startTime)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {appointment.durationMinutes} min
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(
                      appointment.status
                    )}`}
                  >
                    {statusLabel(appointment.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-700">
                  {appointment.petName || 'Mascota'}
                  {appointment.clientName && (
                    <span className="text-gray-500"> — {appointment.clientName}</span>
                  )}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">{appointment.reason}</p>
              </div>

              {appointment.status === 'scheduled' && (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() =>
                      setConfirmAction({ type: 'complete', appointment })
                    }
                    className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
                  >
                    Completar
                  </button>
                  <button
                    onClick={() =>
                      setConfirmAction({ type: 'cancel', appointment })
                    }
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Appointment Form Modal */}
      {showForm && <AppointmentForm onClose={() => setShowForm(false)} />}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmAction.type === 'cancel'
                ? '¿Cancelar esta cita?'
                : '¿Marcar cita como completada?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmAction.type === 'cancel'
                ? 'Esta acción cambiará el estado de la cita a cancelada. No se puede deshacer.'
                : 'Esta acción marcará la cita como completada. No se puede deshacer.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={handleConfirm}
                disabled={cancelMutation.isPending || completeMutation.isPending}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                  confirmAction.type === 'cancel'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {cancelMutation.isPending || completeMutation.isPending
                  ? 'Procesando...'
                  : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
