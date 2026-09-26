/* Effects run once (no StrictMode double-invoke), so create on build, destroy on release. */
export function handleLifecycle(create, destroy) {
  const handle = create();
  return {
    handle,
    activate() {},
    release() {
      try { destroy(handle); } catch (e) { /* already gone */ }
    },
  };
}
