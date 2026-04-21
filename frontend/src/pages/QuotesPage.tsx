import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createQuote,
  deleteQuote,
  getClients,
  getProducts,
  getQuotes,
  updateQuoteStatus,
} from '../api/services';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionCard } from '../components/ui/SectionCard';
import { StatCard } from '../components/ui/StatCard';
import type { Client, Product, Quote, QuoteItem, QuoteStatus } from '../types';
import { formatCurrency, formatDate } from '../utils';

const statusOptions: QuoteStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];

export function QuotesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clientId, setClientId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax - Number(discount || 0);

  const availableProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId],
  );

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [clientsData, productsData, quotesData] = await Promise.all([
        getClients(),
        getProducts(),
        getQuotes(),
      ]);

      setClients(clientsData);
      setProducts(productsData);
      setQuotes(quotesData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar el modulo de cotizaciones',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetForm() {
    setClientId('');
    setSelectedProductId('');
    setQuantity('1');
    setDiscount('0');
    setNotes('');
    setItems([]);
  }

  function addItem() {
    if (!availableProduct) {
      setError('Selecciona un producto');
      return;
    }

    const parsedQuantity = Number(quantity);
    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setError('La cantidad debe ser mayor a cero');
      return;
    }

    setError(null);
    setItems((current) => [
      ...current,
      {
        productId: availableProduct.id,
        productName: availableProduct.name,
        unitPrice: availableProduct.price,
        quantity: parsedQuantity,
        subtotal: availableProduct.price * parsedQuantity,
      },
    ]);
    setSelectedProductId('');
    setQuantity('1');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!clientId) {
      setError('Debes seleccionar un cliente');
      return;
    }

    if (items.length === 0) {
      setError('Agrega al menos un producto a la cotizacion');
      return;
    }

    if (total < 0) {
      setError('El total no puede quedar negativo');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await createQuote({
        clientId,
        notes: notes.trim() || undefined,
        discount: Number(discount || 0),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      resetForm();
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar la cotizacion',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: QuoteStatus) {
    try {
      await updateQuoteStatus(id, status);
      await loadData();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : 'No se pudo actualizar el estado',
      );
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Se eliminara esta cotizacion. Deseas continuar?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteQuote(id);
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar la cotizacion',
      );
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Cotizaciones</span>
          <h2>Construccion de propuestas comerciales</h2>
          <p>Relaciona clientes con productos y genera una cotizacion persistente.</p>
        </div>
      </header>

      {error ? <div className="message message--error">{error}</div> : null}

      <div className="stats-grid">
        <StatCard label="Cotizaciones" value={String(quotes.length)} helper="Registros creados" />
        <StatCard
          label="Monto total"
          value={formatCurrency(quotes.reduce((sum, quote) => sum + quote.total, 0))}
          helper="Valor cotizado"
        />
        <StatCard
          label="Aceptadas"
          value={String(quotes.filter((quote) => quote.status === 'ACCEPTED').length)}
          helper="Listas para cierre"
        />
      </div>

      <div className="content-grid content-grid--wide">
        <SectionCard
          title="Nueva cotizacion"
          subtitle="Calcula subtotal, IVA y descuento automaticamente"
        >
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Cliente</span>
              <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">Selecciona un cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Producto</span>
              <select
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
              >
                <option value="">Selecciona un producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.price)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Cantidad</span>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            <div className="field field--action">
              <span>Agregar item</span>
              <button
                type="button"
                className="button button--inline button--full"
                onClick={addItem}
              >
                Agregar producto
              </button>
            </div>
            <label className="field">
              <span>Descuento</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            </label>
            <label className="field field--full">
              <span>Notas</span>
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            <div className="quote-preview">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <div>
                <span>IVA 15%</span>
                <strong>{formatCurrency(tax)}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
            </div>

            <div className="form-actions">
              <button className="button button--primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Crear cotizacion'}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={resetForm}
              >
                Limpiar
              </button>
            </div>
          </form>

          {items.length > 0 ? (
            <div className="inline-list">
              {items.map((item, index) => (
                <article key={`${item.productId}-${index}`} className="inline-list__item">
                  <div>
                    <strong>{item.productName}</strong>
                    <p>
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="table-actions">
                    <span>{formatCurrency(item.subtotal)}</span>
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() =>
                        setItems((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      Quitar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Historial de cotizaciones"
          subtitle="Administra el estado comercial y el paso a liquidacion"
        >
          {loading ? (
            <div className="message">Cargando cotizaciones...</div>
          ) : quotes.length === 0 ? (
            <EmptyState
              title="Sin cotizaciones"
              description="Crea una cotizacion para empezar a seguir el pipeline de ventas."
            />
          ) : (
            <div className="cards-grid">
              {quotes.map((quote) => (
                <article key={quote.id} className="mini-card">
                  <div className="mini-card__header mini-card__header--stack">
                    <div>
                      <strong>{quote.code}</strong>
                      <p>{quote.client.name}</p>
                    </div>
                    <span className={`tag tag--${quote.status.toLowerCase()}`}>
                      {quote.status}
                    </span>
                  </div>
                  <div className="mini-card__details">
                    <span>{formatDate(quote.createdAt)}</span>
                    <span>{formatCurrency(quote.total)}</span>
                  </div>
                  <div className="mini-card__details mini-card__details--wrap">
                    {quote.items.map((item) => (
                      <span key={item.id ?? `${item.productId}-${item.productName}`}>
                        {item.productName} x {item.quantity}
                      </span>
                    ))}
                  </div>
                  <div className="table-actions table-actions--stack-mobile">
                    <select
                      value={quote.status}
                      onChange={(event) =>
                        void handleStatusChange(
                          quote.id,
                          event.target.value as QuoteStatus,
                        )
                      }
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => void handleDelete(quote.id)}
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
