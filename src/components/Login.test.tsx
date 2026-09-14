import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';
import Sidebar from './Sidebar';

describe('authentication UI markup', () => {
  it('renders labeled credentials without exposing passwords or a signup form', () => {
    const html = renderToStaticMarkup(<Login onSuccess={vi.fn()} />);
    expect(html).toContain('Masuk ke workspace');
    expect(html).toContain('for="username"');
    expect(html).toContain('for="password"');
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).not.toContain('qa1:');
  });
  it('shows the current identity, shared role, History and Logout', () => {
    const html = renderToStaticMarkup(<Sidebar activeTab="history" setActiveTab={vi.fn()} userRole="QA User 2" plan="Member" onLogout={vi.fn()} loggingOut={false} />);
    expect(html).toContain('QA User 2');
    expect(html).toContain('History');
    expect(html).toContain('Logout');
    expect(html).not.toContain('Team Leader');
  });
});
