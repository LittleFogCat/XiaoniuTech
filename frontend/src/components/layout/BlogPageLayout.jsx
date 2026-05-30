import BlogHeader from '../BlogHeader';

const DEFAULT_ROOT_CLASS_NAME = 'min-h-screen bg-[var(--page-bg)] text-[color:var(--text-primary)]';
const DEFAULT_MAIN_CLASS_NAME = 'mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8';

export default function BlogPageLayout({
  children,
  headerProps = {},
  mainClassName = DEFAULT_MAIN_CLASS_NAME,
  rootClassName = DEFAULT_ROOT_CLASS_NAME,
  showHeader = true,
}) {
  return (
    <div className={rootClassName}>
      {showHeader ? <BlogHeader {...headerProps} /> : null}
      <main className={mainClassName}>{children}</main>
    </div>
  );
}