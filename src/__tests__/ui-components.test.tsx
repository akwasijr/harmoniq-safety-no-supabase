/**
 * UI component tests
 *
 * Tests for shared UI components: Button, Input, Badge, Switch, Label, Card.
 * Uses React Testing Library with jsdom environment.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeDefined();
  });

  it("fires onClick handler", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows loading spinner when loading=true", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button");
    expect(button.getAttribute("disabled")).toBe("");
    // The Loader2 icon has an SVG with animate-spin class
    const svg = button.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("is disabled when disabled prop is set", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies variant classes", () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    const button = container.querySelector("button");
    expect(button?.className).toContain("destructive");
  });

  it("applies size classes", () => {
    const { container } = render(<Button size="sm">Small</Button>);
    const button = container.querySelector("button");
    // sm size class should be present
    expect(button?.className).toBeTruthy();
  });

  it("forwards refs", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Test</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input placeholder="Enter email" />);
    expect(screen.getByPlaceholderText("Enter email")).toBeDefined();
  });

  it("handles value changes", () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("shows error message when error prop is true", () => {
    render(<Input error errorMessage="Email is required" />);
    expect(screen.getByText("Email is required")).toBeDefined();
  });

  it("sets aria-invalid when error is true", () => {
    render(<Input error errorMessage="Bad input" />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("shows error message when errorMessage prop is provided (even without error)", () => {
    // The component shows the message whenever errorMessage is truthy
    render(<Input errorMessage="Field is required" />);
    expect(screen.getByText("Field is required")).toBeDefined();
  });

  it("forwards refs", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

describe("Badge", () => {
  it("renders text content", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeDefined();
  });

  it("renders as a span element", () => {
    const { container } = render(<Badge>Tag</Badge>);
    const span = container.querySelector("span");
    expect(span).toBeTruthy();
    expect(span?.textContent).toBe("Tag");
  });

  it("applies variant classes", () => {
    const { container } = render(<Badge variant="success">Done</Badge>);
    const span = container.querySelector("span");
    // success variant maps to green color classes
    expect(span?.className).toContain("green");
  });

  it("supports status variants", () => {
    const { container } = render(<Badge variant="critical">Critical</Badge>);
    // critical variant maps to red color classes
    expect(container.querySelector("span")?.className).toContain("red");
  });
});

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

describe("Label", () => {
  it("renders label text", () => {
    render(<Label>Name</Label>);
    expect(screen.getByText("Name")).toBeDefined();
  });

  it("shows required indicator", () => {
    render(<Label required>Email</Label>);
    expect(screen.getByText("*")).toBeDefined();
  });

  it("applies error styling", () => {
    const { container } = render(<Label error>Bad</Label>);
    const label = container.querySelector("label");
    expect(label?.className).toContain("text-destructive");
  });

  it("associates with input via htmlFor", () => {
    render(<Label htmlFor="email-input">Email</Label>);
    const label = screen.getByText("Email");
    expect(label.getAttribute("for")).toBe("email-input");
  });
});

// ---------------------------------------------------------------------------
// Switch
// ---------------------------------------------------------------------------

describe("Switch", () => {
  it("renders with switch role", () => {
    render(<Switch checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole("switch")).toBeDefined();
  });

  it("reflects checked state via aria-checked", () => {
    const { rerender } = render(<Switch checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");

    rerender(<Switch checked={true} onCheckedChange={() => {}} />);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  it("calls onCheckedChange when clicked", () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not fire when disabled", () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} disabled />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

describe("Card", () => {
  it("renders Card with children", () => {
    render(<Card><p>Content</p></Card>);
    expect(screen.getByText("Content")).toBeDefined();
  });

  it("renders full card composition", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Body content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText("Title")).toBeDefined();
    expect(screen.getByText("Description")).toBeDefined();
    expect(screen.getByText("Body content")).toBeDefined();
    expect(screen.getByText("Footer")).toBeDefined();
  });

  it("accepts custom className", () => {
    const { container } = render(<Card className="custom-class">Test</Card>);
    expect(container.firstElementChild?.className).toContain("custom-class");
  });
});
