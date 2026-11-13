export type InitiativeResponseType = 'approval' | 'choice';

export type InitiativeResponseOption = {
  value: string;
  label: string;
  detail?: string;
};

export const APPROVAL_OPTIONS: InitiativeResponseOption[] = [
  { value: 'yes', label: 'Support', detail: 'Support this initiative' },
  { value: 'no', label: 'Oppose', detail: 'Oppose this initiative' },
  { value: 'abstain', label: 'Abstain', detail: 'No position' }
];

/** Database JSON is untrusted at this boundary; fall back to the legacy choices. */
export function initiativeResponseOptions(
  responseType: string | null | undefined,
  value: unknown
): InitiativeResponseOption[] {
  if (responseType !== 'choice' || !Array.isArray(value))
    return APPROVAL_OPTIONS;
  const options = value.flatMap((option) => {
    if (!option || typeof option !== 'object') return [];
    const row = option as Record<string, unknown>;
    if (typeof row.value !== 'string' || typeof row.label !== 'string')
      return [];
    const detail = typeof row.detail === 'string' ? row.detail : undefined;
    return [
      { value: row.value, label: row.label, ...(detail ? { detail } : {}) }
    ];
  });
  return options.length >= 2 ? options : APPROVAL_OPTIONS;
}

export function initiativeResponseLabel(
  responseType: string | null | undefined,
  options: unknown,
  value: string | null | undefined
) {
  if (!value) return '';
  return (
    initiativeResponseOptions(responseType, options).find(
      (option) => option.value === value
    )?.label ?? value
  );
}
