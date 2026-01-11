import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open is true', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<Modal {...defaultProps} open={false} />);
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(<Modal {...defaultProps} title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should render close button by default', () => {
    render(<Modal {...defaultProps} title="Test" />);
    expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
  });

  it('should hide close button when showCloseButton is false', () => {
    render(<Modal {...defaultProps} title="Test" showCloseButton={false} />);
    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<Modal {...defaultProps} title="Test" />);
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', () => {
    render(<Modal {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    render(<Modal {...defaultProps} />);
    const backdrop = screen.getByRole('presentation');
    fireEvent.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when modal content is clicked', () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  describe('sizes', () => {
    it('should apply small size class', () => {
      render(<Modal {...defaultProps} size="sm" />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-sm');
    });

    it('should apply medium size class by default', () => {
      render(<Modal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-md');
    });

    it('should apply large size class', () => {
      render(<Modal {...defaultProps} size="lg" />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-lg');
    });
  });

  it('should have proper accessibility attributes', () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('should prevent body scroll when open', () => {
    const { unmount } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
