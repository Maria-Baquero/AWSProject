import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createAppointment } from '../services/appointmentService'
import { getAllPets } from '../services/petService'
import { useToast } from '../hooks/useToast'
import type { CreateAppointmentData } from '../types/appointment'

interface AppointmentFormProps {
  onClose: () => void
}

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120]

export function AppointmentForm({ onClose }: AppointmentFormProps) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const [formData, setFormData] = useState<CreateAppointmentData>({
    petId: '',
    date: '',
    time: '',
    reason: '',
    duration: 30,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: pets = [], isLoading: loadingPets } = useQuery({
    queryKey: ['pets-all'],
    queryFn: getAllPets,
  })

  const mutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      showSuccess('Cita creada exitosamente')
      onClose()
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Error al crear la cita'
      showError(message)
    },
  })

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!formData.petId) {
      newErrors.petId = 'Debe seleccionar una mascota'
    }

    if (!formData.date) {
      newErrors.date = 'La fecha es obligatoria'
    } else {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const selectedDate = new Date(formData.date + 'T00:00:00')
      if (selectedDate < today) {
        newErrors.date = 'La fecha no puede ser en el pasado'
      }
    }

    if (!formData.time) {
      newErrors.time = 'La hora es obligatoria'
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'El motivo es obligatorio'
    } else if (formData.reason.length > 500) {
      newErrors.reason = 'El motivo no puede exceder 500 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) {
      mutation.mutate(formData)
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration' ? Number(value) : value,
    }))
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev }
        delete copy[name]
        return copy
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Nueva Cita</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Pet selector */}
          <div>
            <label htmlFor="petId" className="block text-sm font-medium text-gray-700">
              Mascota *
            </label>
            <select
              id="petId"
              name="petId"
              value={formData.petId}
              onChange={handleChange}
              disabled={loadingPets}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.petId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar mascota...</option>
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.species})
                </option>
              ))}
            </select>
            {errors.petId && (
              <p className="mt-1 text-sm text-red-600">{errors.petId}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Fecha *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* Time */}
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700">
              Hora *
            </label>
            <input
              type="time"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.time ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.time && (
              <p className="mt-1 text-sm text-red-600">{errors.time}</p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
              Duración (minutos)
            </label>
            <select
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Motivo *
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              value={formData.reason}
              onChange={handleChange}
              placeholder="Describe el motivo de la consulta..."
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.reason ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Creando...' : 'Crear Cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
