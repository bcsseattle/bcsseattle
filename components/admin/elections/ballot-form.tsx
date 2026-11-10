'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/portal/panel';
import { Textarea } from '@/components/ui/textarea';
import type { FormState } from '@/app/(portal)/admin/elections/actions';
import { Field } from './field';
import { FormFooter } from './steps';

export type PositionDraft = { id?: string; title: string; description: string; seats: number };
export type InitiativeDraft = {
  id?: string;
  title: string;
  description: string;
  additional_info_url: string;
  pass_threshold: 'majority' | 'two_thirds';
};
type Ballot = { positions: PositionDraft[]; initiatives: InitiativeDraft[] };

/** A stable key per row (its id, or a new one), so moving rows keeps focus on the right fields. */
const withKey = <T extends { id?: string }>(item: T): T & { _k: string } => ({ ...item, _k: item.id ?? Math.random().toString(36).slice(2) });

/** Step 2: the positions (with seats) and the initiatives, each in ballot order. */
export function BallotForm({
  action,
  initial,
  template,
  typeLabel
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: Ballot;
  /** The type's default positions (election_positions), offered as a starting point. */
  template: PositionDraft[];
  typeLabel: string;
}) {
  const [state, formAction] = React.useActionState(action, {});
  return (
    <BallotEditor
      key={JSON.stringify(state)}
      formAction={formAction}
      state={state}
      initial={state.values?.ballot ? (JSON.parse(state.values.ballot) as Ballot) : initial}
      template={template}
      typeLabel={typeLabel}
    />
  );
}

function BallotEditor({
  formAction,
  state,
  initial,
  template,
  typeLabel
}: {
  formAction: (formData: FormData) => void;
  state: FormState;
  initial: Ballot;
  template: PositionDraft[];
  typeLabel: string;
}) {
  const [positions, setPositions] = React.useState(() => initial.positions.map(withKey));
  const [initiatives, setInitiatives] = React.useState(() => initial.initiatives.map(withKey));

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="ballot" value={JSON.stringify({ positions, initiatives })} />

      <Panel
        title="Positions"
        subtitle="Members nominate for these and vote for candidates in this order. Seats is how many people the position elects."
        actions={
          template.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setPositions(template.map((p) => withKey<PositionDraft>({ title: p.title, description: p.description, seats: p.seats })))}>
              Use the {typeLabel} defaults
            </Button>
          )
        }
      >
        <OrderedList
          items={positions}
          onChange={setPositions}
          noun="position"
          empty="No positions. An initiatives-only election needs none."
          render={(p, i, update) => (
            <div className="grid gap-4 md:grid-cols-[1fr_8rem]">
              <Field id={`position-${i}-title`} label="Title">
                {(a) => <Input {...a} value={p.title} maxLength={120} onChange={(e) => update({ title: e.target.value })} />}
              </Field>
              <Field id={`position-${i}-seats`} label="Seats">
                {(a) => (
                  <Input
                    {...a}
                    type="number"
                    min={1}
                    max={9}
                    value={p.seats}
                    onChange={(e) => update({ seats: Number(e.target.value) })}
                  />
                )}
              </Field>
              <div className="md:col-span-2">
                <Field id={`position-${i}-description`} label="Description" helper="Optional. Shown on the nomination form and ballot.">
                  {(a) => (
                    <Textarea {...a} rows={2} value={p.description} maxLength={1000} onChange={(e) => update({ description: e.target.value })} />
                  )}
                </Field>
              </div>
            </div>
          )}
          blank={{ title: '', description: '', seats: 1 }}
        />
      </Panel>

      <Panel title="Initiatives" subtitle="Yes/No questions, in ballot order. Abstentions never count toward passing.">
        <OrderedList
          items={initiatives}
          onChange={setInitiatives}
          noun="initiative"
          empty="No initiatives."
          render={(t, i, update) => (
            <div className="grid gap-4">
              <Field id={`initiative-${i}-title`} label="Title">
                {(a) => <Input {...a} value={t.title} maxLength={200} onChange={(e) => update({ title: e.target.value })} />}
              </Field>
              <Field id={`initiative-${i}-description`} label="Description">
                {(a) => (
                  <Textarea {...a} rows={3} value={t.description} maxLength={4000} onChange={(e) => update({ description: e.target.value })} />
                )}
              </Field>
              <Field id={`initiative-${i}-link`} label="Link to more information" helper="Optional, starting with https://">
                {(a) => (
                  <Input
                    {...a}
                    type="url"
                    inputMode="url"
                    value={t.additional_info_url}
                    onChange={(e) => update({ additional_info_url: e.target.value })}
                  />
                )}
              </Field>
              <Field
                id={`initiative-${i}-threshold`}
                label="To pass"
                helper="Two-thirds is for bylaw amendments (Art. XII)."
              >
                {(a) => (
                  <select
                    {...a}
                    className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                    value={t.pass_threshold}
                    onChange={(e) => update({ pass_threshold: e.target.value as InitiativeDraft['pass_threshold'] })}
                  >
                    <option value="majority">More Yes than No</option>
                    <option value="two_thirds">Two-thirds of Yes and No</option>
                  </select>
                )}
              </Field>
            </div>
          )}
          blank={{ title: '', description: '', additional_info_url: '', pass_threshold: 'majority' }}
        />
      </Panel>

      <FormFooter error={state.error} />
    </form>
  );
}

/** A list of cards, each with move up, move down and remove, and an Add button below. */
function OrderedList<T extends { _k: string }>({
  items,
  onChange,
  render,
  blank,
  noun,
  empty
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode;
  blank: Omit<T, '_k'>;
  noun: string;
  empty: string;
}) {
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  return (
    <div className="flex flex-col">
      {items.length === 0 && <p className="mt-0 px-4 py-4 text-sm text-muted-foreground">{empty}</p>}
      <ol className="divide-y">
        {items.map((item, i) => (
          <li key={item._k} className="flex flex-col gap-3 px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {noun[0].toUpperCase() + noun.slice(1)} {i + 1}
              </span>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${noun} ${i + 1} up`}>
                  <ArrowUp aria-hidden className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label={`Move ${noun} ${i + 1} down`}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  aria-label={`Remove ${noun} ${i + 1}`}
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </div>
            </div>
            {render(item, i, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
          </li>
        ))}
      </ol>
      <div className="border-t px-4 py-3">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...blank, _k: Math.random().toString(36).slice(2) } as T])}>
          <Plus aria-hidden className="size-4" />
          Add {noun}
        </Button>
      </div>
    </div>
  );
}
