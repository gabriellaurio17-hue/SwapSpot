import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the SwapSpot landing page', async () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(await screen.findByRole('heading', { name: /swap, rent & sell on campus/i })).toBeInTheDocument();
});
