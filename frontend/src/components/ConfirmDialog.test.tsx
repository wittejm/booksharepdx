import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: "Confirm Action",
    message: "Are you sure you want to do this?",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render when open is true", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Confirm Action")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to do this?"),
    ).toBeInTheDocument();
  });

  it("should not render when open is false", () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Confirm Action")).not.toBeInTheDocument();
  });

  it("should render default button text", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("should render custom button text", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmText="Delete"
        cancelText="Keep"
      />,
    );
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Keep")).toBeInTheDocument();
  });

  it("should call onClose when cancel is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it("should call onConfirm and onClose when confirm is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Confirm"));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  describe("variants", () => {
    it("should apply danger variant styles", () => {
      render(<ConfirmDialog {...defaultProps} variant="danger" />);
      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toHaveClass("bg-red-600");
    });

    it("should apply warning variant styles", () => {
      render(<ConfirmDialog {...defaultProps} variant="warning" />);
      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toHaveClass("bg-yellow-600");
    });

    it("should apply info variant styles by default", () => {
      render(<ConfirmDialog {...defaultProps} />);
      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toHaveClass("bg-primary-600");
    });
  });

  it("should close via Modal close button", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("should close via Escape key", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
