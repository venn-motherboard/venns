interface NDEFReadingEvent extends Event {
  serialNumber: string;
}
declare class NDEFReader extends EventTarget {
  constructor();
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  onreading: ((this: NDEFReader, ev: NDEFReadingEvent) => void) | null;
  onreadingerror: ((this: NDEFReader, ev: Event) => void) | null;
}
