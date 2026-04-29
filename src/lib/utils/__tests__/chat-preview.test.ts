import { describe, it, expect } from "vitest";
import { isLocalhostUrl, formatElementContext } from "../chat-preview";
import type { ElementSelection } from "$lib/types";

describe("isLocalhostUrl", () => {
  it("accepts localhost URLs", () => {
    expect(isLocalhostUrl("http://localhost:3000")).toBe(true);
    expect(isLocalhostUrl("http://localhost:8080/path")).toBe(true);
    expect(isLocalhostUrl("https://localhost:443")).toBe(true);
  });

  it("accepts 127.0.0.1 URLs", () => {
    expect(isLocalhostUrl("http://127.0.0.1:5173")).toBe(true);
    expect(isLocalhostUrl("https://127.0.0.1")).toBe(true);
  });

  it("accepts 0.0.0.0 URLs", () => {
    expect(isLocalhostUrl("http://0.0.0.0:3000")).toBe(true);
  });

  it("accepts [::1] URLs", () => {
    expect(isLocalhostUrl("http://[::1]:3000")).toBe(true);
  });

  it("rejects non-localhost URLs", () => {
    expect(isLocalhostUrl("http://example.com")).toBe(false);
    expect(isLocalhostUrl("https://google.com")).toBe(false);
    expect(isLocalhostUrl("http://192.168.1.1:3000")).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(isLocalhostUrl("ftp://localhost:21")).toBe(false);
    expect(isLocalhostUrl("ws://localhost:8080")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isLocalhostUrl("not a url")).toBe(false);
    expect(isLocalhostUrl("")).toBe(false);
    expect(isLocalhostUrl("localhost:3000")).toBe(false);
  });
});

describe("formatElementContext", () => {
  it("formats a minimal element selection", () => {
    const sel: ElementSelection = {
      url: "http://localhost:3000/page",
      domPath: "html > body > div > button",
      tagName: "BUTTON",
      textContent: "Click me",
      attributes: {},
      styleSummary: {},
      outerHtmlSnippet: "<button>Click me</button>",
    };
    const result = formatElementContext(sel);
    expect(result).toContain("[Page Element]");
    expect(result).toContain("URL: http://localhost:3000/page");
    expect(result).toContain("Path: html > body > div > button");
    expect(result).toContain("Tag: BUTTON");
    expect(result).toContain('Text: "Click me"');
    expect(result).toContain("HTML: <button>Click me</button>");
  });

  it("includes attributes when present", () => {
    const sel: ElementSelection = {
      url: "http://localhost:3000",
      domPath: "html > body > a",
      tagName: "A",
      textContent: "",
      attributes: { href: "/link", class: "btn" },
      styleSummary: {},
      outerHtmlSnippet: '<a href="/link" class="btn"></a>',
    };
    const result = formatElementContext(sel);
    expect(result).toContain('Attributes: href="/link", class="btn"');
  });

  it("includes styles when present", () => {
    const sel: ElementSelection = {
      url: "http://localhost:3000",
      domPath: "html > body > div",
      tagName: "DIV",
      textContent: "",
      attributes: {},
      styleSummary: { display: "flex", color: "red" },
      outerHtmlSnippet: "<div></div>",
    };
    const result = formatElementContext(sel);
    expect(result).toContain("Styles: display=flex, color=red");
  });

  it("truncates long text content at 200 chars", () => {
    const longText = "a".repeat(300);
    const sel: ElementSelection = {
      url: "http://localhost:3000",
      domPath: "html > body > p",
      tagName: "P",
      textContent: longText,
      attributes: {},
      styleSummary: {},
      outerHtmlSnippet: `<p>${longText}</p>`,
    };
    const result = formatElementContext(sel);
    const textLine = result.split("\n").find((l) => l.startsWith("Text:"));
    expect(textLine).toBeDefined();
    expect(textLine!.length).toBeLessThan(220);
  });
});
