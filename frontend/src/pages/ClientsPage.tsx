import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClients, createClient, updateClient } from '../services/clientService'
import { ClientForm } from '../components/ClientForm'
import { useToast } from '../hooks/useToast'
import type { Client, CreateClientData } from '../types/client'

export function ClientsPage() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clients', page, search],
    queryFn: () => getClients(page, search),
  })

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      showSuccess('Cliente creado exitosamente')
      closeForm()
    },
    onError: (error: unknown) => {
      handleMutationError(error)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateClientData }) => updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      showSuccess('Cliente actualizado exitosamente')
      closeForm()
    },
    onError: (error: unknown) => {
      handleMutationError(error)
    },
  })

  function handleMutationError(error: unknown) {
    const err = error as { response?: { data?: { message?: string; field?: string } } }
    const message = err.response?.data?.message || 'Error al guardar el cliente'
    const field = err.response?.data?.field

    if (field) {
      setServerErrors({ [field]: message })
    } else {
      setServerErrors({ general: message })
      showError(message)
    }
  }

  function closeForm() {
    setShowForm(false)
    setEditingClient(null)
    setServerErrors({})
  }

  function handleEdit(client: Client) {
    setEditingClient(client)
    setShowForm(true)
    setServerErrors({})
  }

  async function handleFormSubmit(data: CreateClientData) {
    setServerErrors({})
    if (editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const clients = data?.data || []
  const totalPages = data?.totalPages || 0
  const isEmpty = !isLoading && !isError && clients.length === 0 && !search

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
        <button
          onClick={() => { setShowForm(true); setEditingClient(null); setServerErrors({}) }}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Buscar
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </form>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-gray-500">Cargando clientes...</div>
      )}

      {/* Error state */}
      {isError && (
        <div className="text-center py-12 text-red-600">
          Error al cargar los clientes. Intenta de nuevo.
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-16">
          <div className="text-gray-400 text-5xl mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes registrados</h3>
          <p className="text-gray-500 mb-4">Comienza registrando tu primer cliente.</p>
          <button
            onClick={() => { setShowForm(true); setEditingClient(null); setServerErrors({}) }}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Crear primer cliente
          </button>
        </div>
      )}

      {/* No results from search */}
      {!isLoading && !isError && clients.length === 0 && search && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron clientes para "{search}".
        </div>
      )}

      {/* Client table */}
      {clients.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dirección
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {client.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {client.phone || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {client.email || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate">
                    {client.address || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleEdit(client)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <p className="text-sm text-gray-600">
                Página {page} de {totalPages} ({data?.total || 0} clientes)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Client Form Modal */}
      {showForm && (
        <ClientForm
          client={editingClient}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          serverErrors={serverErrors}
        />
      )}
    </div>
  )
}
