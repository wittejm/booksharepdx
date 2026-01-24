import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingSpinner from "./LoadingSpinner";

describe("LoadingSpinner", () => {
  it("should render an SVG spinner", () => {
    render(<LoadingSpinner />);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should have animation class", () => {
    render(<LoadingSpinner />);
    const svg = document.querySelector("svg");
    expect(svg).toHaveClass("animate-spin");
  });

  describe("sizes", () => {
    it("should render small size", () => {
      render(<LoadingSpinner size="sm" />);
      const svg = document.querySelector("svg");
      expect(svg).toHaveClass("h-4", "w-4");
    });

    it("should render medium size by default", () => {
      render(<LoadingSpinner />);
      const svg = document.querySelector("svg");
      expect(svg).toHaveClass("h-8", "w-8");
    });

    it("should render large size", () => {
      render(<LoadingSpinner size="lg" />);
      const svg = document.querySelector("svg");
      expect(svg).toHaveClass("h-12", "w-12");
    });
  });

  it("should accept custom className", () => {
    render(<LoadingSpinner className="my-custom-class" />);
    const container = document.querySelector(".my-custom-class");
    expect(container).toBeInTheDocument();
  });

  it("should be inline-block by default", () => {
    render(<LoadingSpinner />);
    const container = document.querySelector(".inline-block");
    expect(container).toBeInTheDocument();
  });
});
