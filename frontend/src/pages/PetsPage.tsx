import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPets,
  createPet,
  updatePet,
  deletePet,
  getClients,
  type Pet,
  type CreatePetDTO,
  type UpdatePetDTO,
} from '../services/petService'
import { PetForm } from '../components/PetForm'
import { useToast } from '../hooks/useToast'

export function PetsPage() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [deletingPet, setDeletingPet] = useState<Pet | null>(null)

  const limit = 10

  const { data: petsData, isLoading } = useQuery({
    queryKey: ['pets', { search, page, limit }],
    queryFn: () => getPets({ search: search || undefined, page, limit }),
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-options'],
    queryFn: getClients,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreatePetDTO) => createPet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] })
      showSuccess('Mascota creada exitosamente')
      setShowForm(false)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al crear la mascota'
      showError(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePetDTO }) => updatePet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] })
      showSuccess('Mascota actualizada exitosamente')
      setEditingPet(null)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al actualizar la mascota'
      showError(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] })
      showSuccess('Mascota eliminada exitosamente')
      setDeletingPet(null)
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al eliminar la mascota'
      showError(message)
    },
  })

  function handleFormSubmit(data: CreatePetDTO | UpdatePetDTO) {
    if (editingPet) {
      updateMutation.mutate({ id: editingPet.id, data })
    } else {
      createMutation.mutate(data as CreatePetDTO)
    }
  }

  function handleEdit(pet: Pet) {
    setEditingPet(pet)
    setShowForm(true)
  }

  function handleDeleteConfirm() {
    if (deletingPet) {
      deleteMutation.mutate(deletingPet.id)
    }
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditingPet(null)
  }

  const pets = petsData?.data || []
  const total = petsData?.total || 0
  const totalPages = Math.ceil(total / limit)
  const isEmpty = !isLoading && pets.length === 0 && !search

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mascotas</h2>
          <p className="mt-1 text-sm text-gray-600">
            Gestión de mascotas registradas en la clínica.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPet(null)
            setShowForm(true)
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Nueva Mascota
        </button>
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 12H4m8-8v16"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay mascotas registradas</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza registrando la primera mascota en el sistema.
          </p>
          <button
            onClick={() => {
              setEditingPet(null)
              setShowForm(true)
            }}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Crear Primera Mascota
          </button>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por nombre, especie o raza..."
              className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Cargando mascotas...</div>
          ) : pets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron mascotas con el criterio de búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Especie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Raza
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Peso (kg)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pets.map((pet) => (
                    <tr key={pet.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {pet.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pet.species}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pet.breed || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pet.weight ? pet.weight.toFixed(2) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pet.client?.fullName || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        <button
                          onClick={() => handleEdit(pet)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeletingPet(pet)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-700">
                Mostrando página {page} de {totalPages} ({total} mascotas)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <PetForm
          pet={editingPet}
          clients={clients}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseForm}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingPet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900">Confirmar eliminación</h3>
            <p className="mt-2 text-sm text-gray-500">
              ¿Estás seguro de que deseas eliminar a{' '}
              <span className="font-semibold">{deletingPet.name}</span>? Esta acción marcará
              la mascota como inactiva.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setDeletingPet(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
