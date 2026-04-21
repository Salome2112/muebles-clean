import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
} from '../api/services';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionCard } from '../components/ui/SectionCard';
import { StatCard } from '../components/ui/StatCard';
import type { Client } from '../types';
import { getInitials } from '../utils';

const initialForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
};

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const filteredClients = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) {
      return clients;
    }

    return clients.filter((client) =>
      [client.name, client.phone, client.email, client.address]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term)),
    );
  }, [clients, deferredSearch]);

  async function loadClients() {
    try {
      setLoading(true);
      setError(null);
      setClients(await getClients());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar los clientes',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('El nombre del cliente es obligatorio');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
    };

    try {
      if (editingId) {
        await updateClient(editingId, payload);
      } else {
        await createClient(payload);
      }

      resetForm();
      await loadClients();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar el cliente',
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(client: Client) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      phone: client.phone ?? '',
      email: client.email ?? '',
      address: client.address ?? '',
    });
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Se eliminara este cliente. Deseas continuar?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteClient(id);
      await loadClients();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar el cliente',
      );
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Clientes</span>
          <h2>Base comercial y seguimiento</h2>
          <p>Concentra contactos, correos, telefonos y direccion.</p>
        </div>
      </header>

      {error ? <div className="message message--error">{error}</div> : null}

      <div className="stats-grid">
        <StatCard label="Clientes" value={String(clients.length)} helper="Registros totales" />
        <StatCard
          label="Con email"
          value={String(clients.filter((client) => client.email).length)}
          helper="Canal digital"
        />
        <StatCard
          label="Con telefono"
          value={String(clients.filter((client) => client.phone).length)}
          helper="Llamadas o WhatsApp"
        />
      </div>

      <div className="content-grid content-grid--wide">
        <SectionCard
          title={editingId ? 'Editar cliente' : 'Nuevo cliente'}
          subtitle="Persistencia centralizada desde el backend NestJS"
        >
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Nombre</span>
              <input name="name" value={form.name} onChange={handleChange} />
            </label>
            <label className="field">
              <span>Telefono</span>
              <input name="phone" value={form.phone} onChange={handleChange} />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />
            </label>
            <label className="field">
              <span>Direccion</span>
              <input name="address" value={form.address} onChange={handleChange} />
            </label>
            <div className="form-actions">
              <button className="button button--primary" disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={resetForm}
              >
                Cancelar
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Listado de clientes"
          subtitle="Busqueda por nombre, telefono, email o direccion"
          actions={
            <input
              className="search-input"
              placeholder="Buscar cliente"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
        >
          {loading ? (
            <div className="message">Cargando clientes...</div>
          ) : filteredClients.length === 0 ? (
            <EmptyState
              title="Sin clientes"
              description="Aun no hay registros que mostrar en esta vista."
            />
          ) : (
            <div className="cards-grid">
              {filteredClients.map((client) => (
                <article key={client.id} className="mini-card">
                  <div className="mini-card__header">
                    <div className="avatar">{getInitials(client.name)}</div>
                    <div>
                      <strong>{client.name}</strong>
                      <p>{client.email || 'Sin email registrado'}</p>
                    </div>
                  </div>
                  <div className="mini-card__details">
                    <span>{client.phone || 'Sin telefono'}</span>
                    <span>{client.address || 'Sin direccion'}</span>
                  </div>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="button button--inline"
                      onClick={() => startEdit(client)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => void handleDelete(client.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
