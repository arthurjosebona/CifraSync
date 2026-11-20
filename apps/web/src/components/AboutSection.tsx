import { detectPlatform } from '../platform';

const PLATFORM_LABEL = { web: 'Web', desktop: 'Desktop', android: 'Android' } as const;

export function AboutSection() {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 text-sm">
      <h2 className="mb-2 font-semibold text-muted">Sobre</h2>
      <p>
        <strong>CifraSync</strong> {__APP_VERSION__} · {PLATFORM_LABEL[detectPlatform()]}
      </p>
      <p className="mt-1 text-muted">
        Cifras, repertórios e teleprompter de palco, offline e sincronizado. Projeto open source
        (licença MIT) feito com auxílio de IA, sob direção e revisão do autor.
      </p>
      <p className="mt-2">
        <a
          href="https://github.com/arthurjosebona/CifraSync"
          target="_blank"
          rel="noreferrer"
          className="text-accent underline"
        >
          Código-fonte no GitHub
        </a>
      </p>
    </section>
  );
}
