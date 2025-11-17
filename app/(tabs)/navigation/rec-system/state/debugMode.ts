// 这是一个全局的调试开关，最简单可以这样实现
let debugMode = false;

export function isDebugMode() {
  return debugMode;
}

export function setDebugMode(v: boolean) {
  debugMode = v;
}
