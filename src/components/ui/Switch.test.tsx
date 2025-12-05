import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Switch } from './Switch';

describe('Switch', () => {
  it('should render with checked state', () => {
    render(<Switch checked={true} onChange={vi.fn()} />);
    
    const button = screen.getByRole('switch');
    expect(button).toHaveAttribute('aria-checked', 'true');
  });

  it('should render with unchecked state', () => {
    render(<Switch checked={false} onChange={vi.fn()} />);
    
    const button = screen.getByRole('switch');
    expect(button).toHaveAttribute('aria-checked', 'false');
  });

  it('should call onChange when clicked', () => {
    const handleChange = vi.fn();
    render(<Switch checked={false} onChange={handleChange} />);
    
    const button = screen.getByRole('switch');
    fireEvent.click(button);
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should call onChange with false when toggling from checked', () => {
    const handleChange = vi.fn();
    render(<Switch checked={true} onChange={handleChange} />);
    
    const button = screen.getByRole('switch');
    fireEvent.click(button);
    
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('should not call onChange when disabled', () => {
    const handleChange = vi.fn();
    render(<Switch checked={false} onChange={handleChange} disabled={true} />);
    
    const button = screen.getByRole('switch');
    fireEvent.click(button);
    
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should render with label', () => {
    render(<Switch checked={false} onChange={vi.fn()} label="Test Label" />);
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should have aria-label when provided', () => {
    render(
      <Switch
        checked={false}
        onChange={vi.fn()}
        aria-label="Custom aria label"
      />
    );
    
    const button = screen.getByRole('switch');
    expect(button).toHaveAttribute('aria-label', 'Custom aria label');
  });

  it('should use label as aria-label when no aria-label provided', () => {
    render(<Switch checked={false} onChange={vi.fn()} label="Test Label" />);
    
    const button = screen.getByRole('switch');
    expect(button).toHaveAttribute('aria-label', 'Test Label');
  });

  it('should handle keyboard Enter key', () => {
    const handleChange = vi.fn();
    render(<Switch checked={false} onChange={handleChange} />);
    
    const button = screen.getByRole('switch');
    fireEvent.keyDown(button, { key: 'Enter' });
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should handle keyboard Space key', () => {
    const handleChange = vi.fn();
    render(<Switch checked={false} onChange={handleChange} />);
    
    const button = screen.getByRole('switch');
    fireEvent.keyDown(button, { key: ' ' });
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });
});

