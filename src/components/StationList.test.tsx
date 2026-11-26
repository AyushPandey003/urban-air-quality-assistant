import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { StationList } from './StationList';
import { makeSnapshot } from '../test/fixtures';
const readings = makeSnapshot().cities[0]!.readings;
it('filters stations and preserves full accessible names', async () => {
  const user = userEvent.setup();
  render(
    <StationList readings={readings} selected={readings[0]!} onSelect={vi.fn()} loading={false} />,
  );
  await user.type(screen.getByRole('searchbox', { name: 'Search stations' }), 'Beta');
  expect(screen.queryByRole('button', { name: /Alpha station/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Beta station/ })).toBeVisible();
});
it('selects a station by keyboard', async () => {
  const user = userEvent.setup(),
    onSelect = vi.fn();
  render(
    <StationList readings={readings} selected={readings[0]!} onSelect={onSelect} loading={false} />,
  );
  screen.getByRole('button', { name: /Beta station/ }).focus();
  await user.keyboard('{Enter}');
  expect(onSelect).toHaveBeenCalledWith(readings[1]);
});
it('explains an empty search and loading state', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <StationList readings={[]} selected={null} onSelect={vi.fn()} loading />,
  );
  expect(screen.getByText('Discovering stations…')).toBeVisible();
  rerender(
    <StationList readings={readings} selected={readings[0]!} onSelect={vi.fn()} loading={false} />,
  );
  await user.type(screen.getByRole('searchbox'), 'missing');
  expect(screen.getByRole('status')).toHaveTextContent('No stations match');
});
