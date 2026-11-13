import { cn } from '@/utils/cn';

type FormattedTextProps = {
  text: string;
  className?: string;
};

const BULLET = /^[-*•]\s+(.+)$/;
const NUMBERED = /^\d+[.)]\s+(.+)$/;

/**
 * Formats trusted plain text without interpreting HTML. Blank lines create
 * paragraphs, list-prefixed lines create semantic lists, and single line
 * breaks remain visible.
 */
export function FormattedText({ text, className }: FormattedTextProps) {
  const blocks = text.trim().replace(/\r\n?/g, '\n').split(/\n\s*\n/);

  return (
    <div className={cn('space-y-4 break-words text-body leading-relaxed text-foreground', className)}>
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trimEnd());
        const bullets = lines.map((line) => line.match(BULLET));
        if (bullets.every(Boolean)) {
          return (
            <ul key={index} className="ml-5 list-disc space-y-1 pl-1">
              {bullets.map((match, line) => <li key={line}>{match![1]}</li>)}
            </ul>
          );
        }

        const numbered = lines.map((line) => line.match(NUMBERED));
        if (numbered.every(Boolean)) {
          return (
            <ol key={index} className="ml-5 list-decimal space-y-1 pl-1">
              {numbered.map((match, line) => <li key={line}>{match![1]}</li>)}
            </ol>
          );
        }

        return <p key={index} className="mt-0 whitespace-pre-line">{lines.join('\n')}</p>;
      })}
    </div>
  );
}
