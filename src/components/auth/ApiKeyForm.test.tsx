import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import ApiKeyForm from './ApiKeyForm';

const mockLogin = vi.fn();
const mockUseAuth = vi.fn(() => ({
  login: mockLogin,
  logout: vi.fn(),
  apiKey: null,
  accountInfo: null,
  isAuthenticated: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/auth/ImportButton', () => ({
  default: () => <div data-testid="import-button">Import</div>,
}));

describe('ApiKeyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockReset();
  });

  it('renders the form with input and submit button', () => {
    render(<MemoryRouter><ApiKeyForm /></MemoryRouter>);

    expect(screen.getByLabelText(/IBM Cloud API Key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect/i })).toBeInTheDocument();
  });

  it('submit button is disabled when input is empty', () => {
    render(<MemoryRouter><ApiKeyForm /></MemoryRouter>);

    const button = screen.getByRole('button', { name: /Connect/i });
    expect(button).toBeDisabled();
  });

  it('enables submit button when input has value', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ApiKeyForm /></MemoryRouter>);

    const input = screen.getByLabelText(/IBM Cloud API Key/i);
    await user.type(input, 'my-test-key');

    const button = screen.getByRole('button', { name: /Connect/i });
    expect(button).not.toBeDisabled();
  });

  it('calls login on form submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<MemoryRouter><ApiKeyForm /></MemoryRouter>);

    const input = screen.getByLabelText(/IBM Cloud API Key/i);
    await user.type(input, 'test-api-key');

    const button = screen.getByRole('button', { name: /Connect/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test-api-key');
    });
  });

  it('displays error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid API key'));
    const user = userEvent.setup();
    render(<MemoryRouter><ApiKeyForm /></MemoryRouter>);

    const input = screen.getByLabelText(/IBM Cloud API Key/i);
    await user.type(input, 'bad-key');

    const button = screen.getByRole('button', { name: /Connect/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Invalid API key/i)).toBeInTheDocument();
    });
  });

  it('shows error when submitting empty input after trimming', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ApiKeyForm /></MemoryRouter>);

    const input = screen.getByLabelText(/IBM Cloud API Key/i);
    // Type spaces only — can't submit (button disabled), but let's test the form submission
    await user.type(input, '   ');

    // Button should be disabled since trimmed value is empty
    const button = screen.getByRole('button', { name: /Connect/i });
    expect(button).toBeDisabled();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ApiKeyForm /></MemoryRouter>);

    const input = screen.getByLabelText(/IBM Cloud API Key/i);
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByLabelText(/Show password/i);
    await user.click(toggleButton);

    expect(input).toHaveAttribute('type', 'text');

    const hideButton = screen.getByLabelText(/Hide password/i);
    await user.click(hideButton);

    expect(input).toHaveAttribute('type', 'password');
  });

  it('shows loading state during validation', async () => {
    let resolveLogin: () => void;
    mockLogin.mockImplementation(() => new Promise<void>((resolve) => {
      resolveLogin = resolve;
    }));

    const user = userEvent.setup();
    render(<MemoryRouter><ApiKeyForm /></MemoryRouter>);

    const input = screen.getByLabelText(/IBM Cloud API Key/i);
    await user.type(input, 'test-key');

    const button = screen.getByRole('button', { name: /Connect/i });
    await user.click(button);

    // Should show loading indicator
    await waitFor(() => {
      expect(screen.getByText(/Validating/i)).toBeInTheDocument();
    });

    // Resolve the login
    resolveLogin!();
  });
});
