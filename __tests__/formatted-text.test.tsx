/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { FormattedText } from '@/components/ui/formatted-text';

describe('FormattedText', () => {
  it('turns blank-line-separated text into paragraphs', () => {
    const { container } = render(<FormattedText text={'The first paragraph.\n\nThe second paragraph.'} />);
    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(screen.getByText('The first paragraph.')).toBeTruthy();
    expect(screen.getByText('The second paragraph.')).toBeTruthy();
  });

  it('renders bullet and numbered blocks as semantic lists', () => {
    render(<FormattedText text={'- Food\n- Shelter\n\n1. Apply\n2. Receive help'} />);
    expect(screen.getAllByRole('list')).toHaveLength(2);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('Receive help')).toBeTruthy();
  });
});
