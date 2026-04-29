import { SessionStore } from "./session-store.svelte";
import type { EventMiddleware } from "./event-middleware";

export interface SessionTab {
  id: string;
  label: string;
  runId: string | null;
  store: SessionStore;
  createdAt: number;
  pinned: boolean;
}

let _tabCounter = 0;
function nextTabId(): string {
  return `tab-${++_tabCounter}-${Date.now().toString(36)}`;
}

export class TabManager {
  tabs: SessionTab[] = $state([]);
  activeTabId: string = $state("");
  compareMode: boolean = $state(false);
  compareTabIds: [string, string] | null = $state(null);

  private _middleware: EventMiddleware | null = null;

  constructor() {
    const first = this._createTab();
    this.tabs = [first];
    this.activeTabId = first.id;
  }

  get activeTab(): SessionTab | undefined {
    return this.tabs.find((t) => t.id === this.activeTabId);
  }

  get activeStore(): SessionStore {
    return this.activeTab?.store ?? this.tabs[0]?.store ?? new SessionStore();
  }

  setMiddleware(mw: EventMiddleware): void {
    this._middleware = mw;
  }

  addTab(runId?: string): SessionTab {
    const tab = this._createTab(runId);
    this.tabs = [...this.tabs, tab];
    this.activeTabId = tab.id;
    this._syncMiddleware(tab);
    return tab;
  }

  closeTab(tabId: string): void {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    if (tab.store.run?.id && this._middleware) {
      this._middleware.unsubscribe(tab.store.run.id);
    }

    const remaining = this.tabs.filter((t) => t.id !== tabId);
    if (remaining.length === 0) {
      const fresh = this._createTab();
      this.tabs = [fresh];
      this.activeTabId = fresh.id;
      this._syncMiddleware(fresh);
      return;
    }

    this.tabs = remaining;
    if (this.activeTabId === tabId) {
      this.activeTabId = remaining[remaining.length - 1].id;
      this._syncMiddleware(this.activeTab!);
    }

    if (this.compareMode && this.compareTabIds) {
      const [a, b] = this.compareTabIds;
      if (a === tabId || b === tabId) this.exitCompareMode();
    }
  }

  switchTab(tabId: string): void {
    if (this.activeTabId === tabId) return;
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    this.activeTabId = tabId;
    this._syncMiddleware(tab);
  }

  renameTab(tabId: string, label: string): void {
    this.tabs = this.tabs.map((t) => (t.id === tabId ? { ...t, label } : t));
  }

  togglePin(tabId: string): void {
    this.tabs = this.tabs.map((t) =>
      t.id === tabId ? { ...t, pinned: !t.pinned } : t,
    );
  }

  moveTab(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    const next = [...this.tabs];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    this.tabs = next;
  }

  updateTabRunId(tabId: string, runId: string): void {
    this.tabs = this.tabs.map((t) =>
      t.id === tabId ? { ...t, runId } : t,
    );
  }

  enterCompareMode(tabIdA: string, tabIdB: string): void {
    if (tabIdA === tabIdB) return;
    this.compareMode = true;
    this.compareTabIds = [tabIdA, tabIdB];
  }

  exitCompareMode(): void {
    this.compareMode = false;
    this.compareTabIds = null;
  }

  private _createTab(runId?: string): SessionTab {
    const store = new SessionStore();
    return {
      id: nextTabId(),
      label: `Chat ${this.tabs.length + 1}`,
      runId: runId ?? null,
      store,
      createdAt: Date.now(),
      pinned: false,
    };
  }

  private _syncMiddleware(tab: SessionTab): void {
    if (!this._middleware) return;
    this._middleware.subscribeCurrent(tab.runId ?? "", tab.store);
  }
}
