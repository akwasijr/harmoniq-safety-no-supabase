import * as React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider, useTranslation } from "@/i18n";

function TranslationProbe() {
  const { locale, t } = useTranslation();

  return (
    <>
      <span data-testid="locale">{locale}</span>
      <span>{t("industry_templates._ui.templateLibrary")}</span>
    </>
  );
}

describe("I18nProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses the company locale when there is no stored override", () => {
    render(
      <I18nProvider companyLocale="de">
        <TranslationProbe />
      </I18nProvider>,
    );

    expect(screen.getByTestId("locale").textContent).toBe("de");
    expect(screen.getByText("Vorlagenbibliothek")).toBeDefined();
  });

  it("updates when the company locale changes and no override is stored", async () => {
    const { rerender } = render(
      <I18nProvider companyLocale="en">
        <TranslationProbe />
      </I18nProvider>,
    );

    rerender(
      <I18nProvider companyLocale="sv">
        <TranslationProbe />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("locale").textContent).toBe("sv");
    });
    expect(screen.getByText("Mallbibliotek")).toBeDefined();
  });

  it("preserves a stored user override when the company locale changes", async () => {
    window.localStorage.setItem("harmoniq_locale", "nl");

    const { rerender } = render(
      <I18nProvider companyLocale="en">
        <TranslationProbe />
      </I18nProvider>,
    );

    rerender(
      <I18nProvider companyLocale="sv">
        <TranslationProbe />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("locale").textContent).toBe("nl");
    });
    expect(screen.getByText("Sjabloonbibliotheek")).toBeDefined();
  });
});
