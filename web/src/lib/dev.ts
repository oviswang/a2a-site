export function devAllowLocalShellLogin() {
  return String(process.env.DEV_ALLOW_LOCAL_SHELL_LOGIN || '0') === '1';
}
