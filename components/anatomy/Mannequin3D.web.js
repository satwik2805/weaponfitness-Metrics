/**
 * Web stub for Mannequin3D.
 *
 * The real Mannequin3D imports three.js / @react-three which crashes the Metro
 * web bundler with "dependencies is not iterable". On web we fall through to
 * the 2D body-highlighter figure rendered by the parent (MuscleFigure).
 */
export default function Mannequin3D() {
  // Intentionally renders nothing — the ErrorBoundary / Suspense wrapper in
  // MuscleFigure.js will show the 2D fallback instead.
  return null;
}
