import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Toast from "./Toast";

describe("Toast", () => {
  const defaultProps = {
    id: "toast-1",
    message: "Test message",
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render the message", () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("should render close button", () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByLabelText("Close notification")).toBeInTheDocument();
  });

  describe("types", () => {
    it("should render success type with green background", () => {
      render(<Toast {...defaultProps} type="success" />);
      const toast = screen.getByText("Test message").closest("div");
      expect(toast?.parentElement).toHaveClass("bg-green-500");
    });

    it("should render error type with red background", () => {
      render(<Toast {...defaultProps} type="error" />);
      const container = screen.getByText("Test message").parentElement;
      expect(container).toHaveClass("bg-red-500");
    });

    it("should render warning type with yellow background", () => {
      render(<Toast {...defaultProps} type="warning" />);
      const container = screen.getByText("Test message").parentElement;
      expect(container).toHaveClass("bg-yellow-500");
    });

    it("should render info type by default with blue background", () => {
      render(<Toast {...defaultProps} />);
      const container = screen.getByText("Test message").parentElement;
      expect(container).toHaveClass("bg-blue-500");
    });
  });

  describe("auto-dismiss", () => {
    it("should auto-dismiss after default duration (3000ms)", () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} onDismiss={onDismiss} />);

      expect(screen.getByText("Test message")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onDismiss).toHaveBeenCalledWith("toast-1");
    });

    it("should auto-dismiss after custom duration", () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} duration={5000} onDismiss={onDismiss} />);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onDismiss).toHaveBeenCalledWith("toast-1");
    });

    it("should not auto-dismiss when duration is 0", () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} duration={0} onDismiss={onDismiss} />);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByText("Test message")).toBeInTheDocument();
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe("manual dismiss", () => {
    it("should dismiss when close button is clicked", () => {
      const onDismiss = vi.fn();
      render(<Toast {...defaultProps} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByLabelText("Close notification"));

      expect(onDismiss).toHaveBeenCalledWith("toast-1");
    });

    it("should hide content after close", () => {
      render(<Toast {...defaultProps} />);

      expect(screen.getByText("Test message")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Close notification"));

      expect(screen.queryByText("Test message")).not.toBeInTheDocument();
    });
  });

  it("should clean up timer on unmount", () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <Toast {...defaultProps} onDismiss={onDismiss} />,
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
