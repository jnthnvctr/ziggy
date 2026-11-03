import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('shows the title and all six grades', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Ziggy' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText(/^[1-9]\d* skills$/)).toBeTruthy();
  });
});
