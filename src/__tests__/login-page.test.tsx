/* eslint-disable @next/next/no-img-element */

import { render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={alt} {...props} />
  ),
}));

vi.mock("@/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "auth.signIn") return "Sign in";
      return key;
    },
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/client-cookies", () => ({
  setClientCookie: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  IS_MOCK_MODE: false,
  mockLogin: vi.fn(),
}));

import LoginPage from "@/app/(auth)/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/login");
  });

  it("shows platform admin mode when opened from /admin", async () => {
    window.history.pushState({}, "", "/login?mode=platform");

    render(<LoginPage />);

    expect(
      await screen.findByRole("heading", { name: /platform admin sign in/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Platform Admin")).toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: /dashboard/i }),
    ).not.toBeInTheDocument();
  });
});
