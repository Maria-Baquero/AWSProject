import { useState, useEffect } from 'react'
import type { Pet, CreatePetDTO, UpdatePetDTO, ClientOption } from '../services/petService'

interface PetFormProps {
  pet?: Pet | null
  clients: ClientOption[]
  onSubmit: (data: CreatePetDTO | UpdatePetDTO) => void
  onCancel: () => void
  isLoading?: boolean
}

interface FormErrors {
  name?: string
  species?: string
  clientId?: string
  breed?: string
  weight?: string
  microchipNumber?: string
  medicalNotes?: string
}

export function PetForm({ pet, clients, onSubmit, onCancel, isLoading }: PetFormProps) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [breed, setBreed] = useState('')
  const [weight, setWeight] = useState('')
  const [microchipNumber, setMicrochipNumber] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')
  const [clientId, setClientId] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (pet) {
      setName(pet.name)
      setSpecies(pet.species)
      setBreed(pet.breed || '')
      setWeight(pet.weight ? String(pet.weight) : '')
      setMicrochipNumber(pet.microchipNumber || '')
      setMedicalNotes(pet.medicalNotes || '')
      setClientId(pet.clientId)
    }
  }, [pet])

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = 'El nombre es obligatorio'
    } else if (name.trim().length > 100) {
      newErrors.name = 'El nombre no puede exceder 100 caracteres'
    }

    if (!species.trim()) {
      newErrors.species = 'La especie es obligatoria'
    } else if (species.trim().length > 50) {
      newErrors.species = 'La especie no puede exceder 50 caracteres'
    }

    if (breed && breed.length > 50) {
      newErrors.breed = 'La raza no puede exceder 50 caracteres'
    }

    if (weight) {
      const weightNum = parseFloat(weight)
      if (isNaN(weightNum) || weightNum < 0.01 || weightNum > 999.99) {
        newErrors.weight = 'El peso debe estar entre 0.01 y 999.99 kg'
      }
    }

    if (microchipNumber && microchipNumber.length > 25) {
      newErrors.microchipNumber = 'El número de microchip no puede exceder 25 caracteres'
    }

    if (medicalNotes && medicalNotes.length > 2000) {
      newErrors.medicalNotes = 'Las notas médicas no pueden exceder 2000 caracteres'
    }

    if (!clientId) {
      newErrors.clientId = 'Debe seleccionar un cliente'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const data: CreatePetDTO = {
      clientId,
      name: name.trim(),
      species: species.trim(),
      ...(breed && { breed: breed.trim() }),
      ...(weight && { weight: parseFloat(weight) }),
      ...(microchipNumber && { microchipNumber: microchipNumber.trim() }),
      ...(medicalNotes && { medicalNotes: medicalNotes.trim() }),
    }

    onSubmit(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {pet ? 'Editar Mascota' : 'Nueva Mascota'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client selector */}
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                Cliente *
              </label>
              <select
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.clientId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.fullName}
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p className="mt-1 text-sm text-red-600">{errors.clientId}</p>
              )}
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nombre de la mascota"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Species */}
            <div>
              <label htmlFor="species" className="block text-sm font-medium text-gray-700">
                Especie *
              </label>
              <input
                id="species"
                type="text"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.species ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: Perro, Gato, Ave"
              />
              {errors.species && (
                <p className="mt-1 text-sm text-red-600">{errors.species}</p>
              )}
            </div>

            {/* Breed */}
            <div>
              <label htmlFor="breed" className="block text-sm font-medium text-gray-700">
                Raza
              </label>
              <input
                id="breed"
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.breed ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Raza de la mascota"
              />
              {errors.breed && (
                <p className="mt-1 text-sm text-red-600">{errors.breed}</p>
              )}
            </div>

            {/* Weight */}
            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                Peso (kg)
              </label>
              <input
                id="weight"
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.weight ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.weight && (
                <p className="mt-1 text-sm text-red-600">{errors.weight}</p>
              )}
            </div>

            {/* Microchip */}
            <div>
              <label htmlFor="microchipNumber" className="block text-sm font-medium text-gray-700">
                Número de Microchip
              </label>
              <input
                id="microchipNumber"
                type="text"
                value={microchipNumber}
                onChange={(e) => setMicrochipNumber(e.target.value)}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.microchipNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Alfanumérico, máx 25 caracteres"
              />
              {errors.microchipNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.microchipNumber}</p>
              )}
            </div>

            {/* Medical Notes */}
            <div>
              <label htmlFor="medicalNotes" className="block text-sm font-medium text-gray-700">
                Notas Médicas
              </label>
              <textarea
                id="medicalNotes"
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                rows={3}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.medicalNotes ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Notas médicas relevantes"
              />
              {errors.medicalNotes && (
                <p className="mt-1 text-sm text-red-600">{errors.medicalNotes}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Guardando...' : pet ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
