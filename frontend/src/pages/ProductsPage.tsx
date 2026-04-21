import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from '../api/services';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionCard } from '../components/ui/SectionCard';
import { StatCard } from '../components/ui/StatCard';
import type { Product } from '../types';
import { formatCurrency } from '../utils';

const initialForm = {
  name: '',
  description: '',
  category: '',
  price: '',
  stock: '0',
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);

  const filteredProducts = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();

    if (!term) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.description, product.category]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term)),
    );
  }, [deferredSearch, products]);

  const lowStockCount = products.filter((product) => product.stock <= 5).length;
  const inventoryValue = products.reduce(
    (sum, product) => sum + product.price * product.stock,
    0,
  );

  async function loadProducts() {
    try {
      setLoading(true);
      setError(null);
      setProducts(await getProducts());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar los productos',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
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
      setError('El nombre del producto es obligatorio');
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (Number.isNaN(price) || price <= 0) {
      setError('Ingresa un precio valido');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      price,
      stock: Number.isNaN(stock) ? 0 : stock,
    };

    try {
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await createProduct(payload);
      }

      resetForm();
      await loadProducts();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar el producto',
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? '',
      category: product.category ?? '',
      price: String(product.price),
      stock: String(product.stock),
    });
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Se eliminara este producto. Deseas continuar?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteProduct(id);
      await loadProducts();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar el producto',
      );
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Productos</span>
          <h2>Catalogo e inventario</h2>
          <p>Gestiona el listado de productos y su stock disponible.</p>
        </div>
      </header>

      {error ? <div className="message message--error">{error}</div> : null}

      <div className="stats-grid">
        <StatCard label="Items" value={String(products.length)} helper="Productos cargados" />
        <StatCard label="Bajo stock" value={String(lowStockCount)} helper="Revisar reposicion" />
        <StatCard
          label="Valor inventario"
          value={formatCurrency(inventoryValue)}
          helper="Precio x stock"
        />
      </div>

      <div className="content-grid content-grid--wide">
        <SectionCard
          title={editingId ? 'Editar producto' : 'Nuevo producto'}
          subtitle="Los datos se guardan en PostgreSQL a traves de Prisma"
        >
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Nombre</span>
              <input name="name" value={form.name} onChange={handleChange} />
            </label>
            <label className="field">
              <span>Precio</span>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
              />
            </label>
            <label className="field">
              <span>Categoria</span>
              <input name="category" value={form.category} onChange={handleChange} />
            </label>
            <label className="field">
              <span>Stock</span>
              <input
                name="stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={handleChange}
              />
            </label>
            <label className="field field--full">
              <span>Descripcion</span>
              <textarea
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
              />
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
          title="Inventario actual"
          subtitle="Busca, edita o elimina productos"
          actions={
            <input
              className="search-input"
              placeholder="Buscar por nombre, descripcion o categoria"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
        >
          {loading ? (
            <div className="message">Cargando productos...</div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="No hay productos que coincidan con la busqueda actual."
            />
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoria</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <p>{product.description || 'Sin descripcion'}</p>
                      </td>
                      <td>{product.category || 'General'}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.stock}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="button button--inline"
                            onClick={() => startEdit(product)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="button button--danger"
                            onClick={() => void handleDelete(product.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
