import { useState, useEffect } from 'react'
import type { Client, CreateClientData } from '../types/client'

interface ClientFormProps {
  client?: Client | null
  onSubmit: (data: CreateClientData) => Promise<void>
  onCancel: () => void
  serverErrors?: Record<string, string>
}

interface FormErrors {
  fullName?: string
  phone?: string
  email?: string
  address?: string
  contact?: string
}

function validateForm(data: CreateClientData): FormErrors {
  const errors: FormErrors = {}

  if (!data.fullName || data.fullName.trim().length === 0) {
    errors.fullName = 'El nombre completo es obligatorio'
  } else if (data.fullName.trim().length > 100) {
    errors.fullName = 'El nombre no puede exceder 100 caracteres'
  }

  if (data.phone && !/^\+?\d{7,15}$/.test(data.phone)) {
    errors.phone = 'El teléfono debe tener entre 7 y 15 dígitos (prefijo "+" opcional)'
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'El correo electrónico no tiene un formato válido'
  }

  if (data.address && data.address.length > 200) {
    errors.address = 'La dirección no puede exceder 200 caracteres'
  }

  if (!data.phone && !data.email) {
    errors.contact = 'Se requiere al menos un dato de contacto (teléfono o correo electrónico)'
  }

  return errors
}

export function ClientForm({ client, onSubmit, onCancel, serverErrors = {} }: ClientFormProps) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (client) {
      setFullName(client.fullName)
      setPhone(client.phone || '')
      setEmail(client.email || '')
      setAddress(client.address || '')
    }
  }, [client])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data: CreateClientData = {
      fullName: fullName.trim(),
      ...(phone.trim() && { phone: phone.trim() }),
      ...(email.trim() && { email: email.trim() }),
      ...(address.trim() && { address: address.trim() }),
    }

    const validationErrors = validateForm(data)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setSubmitting(true)

    try {
      await onSubmit(data)
    } finally {
      setSubmitting(false)
    }
  }

  const isEditing = !!client

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre completo */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo *
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.fullName || serverErrors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nombre del cliente"
            />
            {(errors.fullName || serverErrors.fullName) && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName || serverErrors.fullName}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.phone || serverErrors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+1234567890"
            />
            {(errors.phone || serverErrors.phone) && (
              <p className="mt-1 text-sm text-red-600">{errors.phone || serverErrors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.email || serverErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="correo@ejemplo.com"
            />
            {(errors.email || serverErrors.email) && (
              <p className="mt-1 text-sm text-red-600">{errors.email || serverErrors.email}</p>
            )}
          </div>

          {/* Dirección */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.address || serverErrors.address ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Dirección del cliente"
            />
            {(errors.address || serverErrors.address) && (
              <p className="mt-1 text-sm text-red-600">{errors.address || serverErrors.address}</p>
            )}
          </div>

          {/* Contact error (neither phone nor email) */}
          {(errors.contact || serverErrors.contact) && (
            <p className="text-sm text-red-600">{errors.contact || serverErrors.contact}</p>
          )}

          {/* General server error */}
          {serverErrors.general && (
            <p className="text-sm text-red-600">{serverErrors.general}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
