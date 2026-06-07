export function sectionFromPath(pathname: string, basePath: string, fallback: string): string {
  const escaped = basePath.replace(/\//g, '\\/');
  const section = pathname.replace(new RegExp(`^.*${escaped}\\/?`), '').split('/')[0];
  return section || fallback;
}
