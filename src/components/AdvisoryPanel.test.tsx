import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { AdvisoryPanel } from './AdvisoryPanel';
it('offers native keyboard-operable health profile radios', async () => {
  const user = userEvent.setup();
  render(<AdvisoryPanel aqi={125} />);
  const general = screen.getByRole('radio', { name: 'General' });
  expect(general).toBeChecked();
  general.focus();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio', { name: 'Asthma' })).toBeChecked();
  expect(screen.getByText(/rescue inhaler/i)).toBeVisible();
});
it('does not issue health advice without usable data', () => {
  render(<AdvisoryPanel aqi={null} />);
  expect(screen.getByText(/non-stale observations/)).toBeVisible();
});
