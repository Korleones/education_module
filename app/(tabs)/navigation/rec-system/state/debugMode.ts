// This is a global debug switch; the simplest way to implement it is like this.
let debugMode = false;

export function isDebugMode() {
  return debugMode;
}

export function setDebugMode(v: boolean) {
  debugMode = v;
}
