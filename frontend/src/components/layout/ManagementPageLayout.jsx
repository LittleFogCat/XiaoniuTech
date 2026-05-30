import BackHomeButton from '../BackHomeButton';
import LanguageThemeControls from '../LanguageThemeControls';
import UserAccountMenu from '../UserAccountMenu';

const DEFAULT_ROOT_CLASS_NAME = 'min-h-screen bg-[var(--page-bg)] text-[color:var(--text-primary)]';
const DEFAULT_HEADER_CONTAINER_CLASS_NAME = 'mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4';
const DEFAULT_MAIN_CLASS_NAME = 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8';
const DEFAULT_EYEBROW_CLASS_NAME = 'text-xs uppercase tracking-[0.28em] text-[color:var(--accent-solid)]';
const DEFAULT_TITLE_CLASS_NAME = 'text-xl font-semibold';

export default function ManagementPageLayout({
  eyebrow,
  title,
  children,
  rootClassName = DEFAULT_ROOT_CLASS_NAME,
  background = null,
  headerContainerClassName = DEFAULT_HEADER_CONTAINER_CLASS_NAME,
  mainClassName = DEFAULT_MAIN_CLASS_NAME,
  eyebrowClassName = DEFAULT_EYEBROW_CLASS_NAME,
  titleClassName = DEFAULT_TITLE_CLASS_NAME,
  headerActions,
  showThemeControls = true,
  showUserAccountMenu = true,
  userAccountMenuProps,
}) {
  const resolvedHeaderActions = headerActions !== undefined
    ? headerActions
    : (
        <>
          {showThemeControls ? <LanguageThemeControls compact /> : null}
          {showUserAccountMenu ? <UserAccountMenu {...userAccountMenuProps} /> : null}
        </>
      );

  return (
    <div className={rootClassName}>
      {background}

      <header className="sticky top-0 z-30 border-b border-[color:var(--surface-border)] bg-[var(--header-bg)] backdrop-blur-lg">
        <div className={headerContainerClassName}>
          <div className="flex items-center gap-3">
            <BackHomeButton iconOnly />
            <div>
              {eyebrow ? (
                <div className={eyebrowClassName}>{eyebrow}</div>
              ) : null}
              <h1 className={titleClassName}>{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {resolvedHeaderActions}
          </div>
        </div>
      </header>

      <main className={mainClassName}>{children}</main>
    </div>
  );
}