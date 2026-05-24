"use client";

import { useState } from 'react';

type Field = {
  name: string;
  placeholder: string;
  type?: string;
};

type ActionFormProps = {
  title: string;
  endpoint: string;
  fields: Field[];
  buttonLabel: string;
};

export function ActionForm({ title, endpoint, fields, buttonLabel }: ActionFormProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      setStatus(error || 'Erreur lors de la création');
      setLoading(false);
      return;
    }

    setStatus('Enregistré');
    event.currentTarget.reset();
    setLoading(false);
    window.location.reload();
  }

  return (
    <div className="card">
      <h3>{title}</h3>
      <form onSubmit={onSubmit}>
        <div className="field-grid">
          {fields.map((field) => (
            <input key={field.name} name={field.name} placeholder={field.placeholder} type={field.type ?? 'text'} />
          ))}
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'En cours...' : buttonLabel}
        </button>
      </form>
      {status ? <p className="muted small">{status}</p> : null}
    </div>
  );
}
