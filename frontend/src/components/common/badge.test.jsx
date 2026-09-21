import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge, StatusBadge, PriorityBadge } from './Badge';
import { Button } from './Button';

describe('Badge', () => {
  it('renders children with a colour class', () => {
    render(<Badge color="green">Done</Badge>);
    const el = screen.getByText('Done');
    expect(el).toHaveClass('badge');
    expect(el.className).toContain('emerald');
  });
  it('lets a className override the default colour', () => {
    render(<Badge className="bg-pink-100 text-pink-700">Custom</Badge>);
    expect(screen.getByText('Custom').className).not.toContain('slate');
    expect(screen.getByText('Custom').className).toContain('pink');
  });
});

describe('StatusBadge / PriorityBadge', () => {
  it('labels known statuses from metadata', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });
  it('falls back to the raw status string', () => {
    render(<StatusBadge status="WEIRD" />);
    expect(screen.getByText('WEIRD')).toBeInTheDocument();
  });
  it('labels priorities from metadata', () => {
    render(<PriorityBadge priority="CRITICAL" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('renders a native button with the primary class by default', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn-primary');
  });
  it('applies danger and small-size variants', () => {
    render(<Button variant="danger" size="sm">Delete</Button>);
    const el = screen.getByRole('button', { name: 'Delete' });
    expect(el).toHaveClass('btn-danger');
    expect(el.className).toContain('text-xs');
  });
  it('passes through click handlers', () => {
    const onClick = { fn: vi.fn() };
    render(<Button onClick={() => onClick.fn()}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick.fn).toHaveBeenCalled();
  });
});