import { useEffect, useId, useState, type FC } from 'react';
import type { MermaidConfig } from 'mermaid';

type Props = {
  source: string;
};

type DiagramTheme = NonNullable<MermaidConfig['themeVariables']>;

const renderedDiagrams = new Map<string, string>();

let renderQueue = Promise.resolve();

const enqueue = <T,>(job: () => Promise<T>): Promise<T> => {
  const run = renderQueue.then(job, job);
  renderQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

const cssColor = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const diagramTheme = (): DiagramTheme => {
  const paper = cssColor('--paper');
  const ink = cssColor('--ink');
  const ink2 = cssColor('--ink2');
  const line = cssColor('--line');
  const val = cssColor('--val');
  const valSoft = cssColor('--val-soft');
  const sunk = cssColor('--sunk');
  const warn = cssColor('--warn');
  const warnSoft = cssColor('--warn-soft');
  return {
    background: paper,
    primaryColor: valSoft,
    primaryTextColor: ink,
    primaryBorderColor: val,
    secondaryColor: sunk,
    tertiaryColor: paper,
    lineColor: ink2,
    textColor: ink,
    mainBkg: paper,
    secondBkg: sunk,
    nodeBorder: val,
    clusterBkg: sunk,
    clusterBorder: line,
    titleColor: ink,
    edgeLabelBackground: paper,
    actorBkg: paper,
    actorBorder: val,
    actorTextColor: ink,
    actorLineColor: line,
    signalColor: ink2,
    signalTextColor: ink,
    labelBoxBkgColor: sunk,
    labelBoxBorderColor: line,
    labelTextColor: ink,
    loopTextColor: ink,
    activationBorderColor: val,
    activationBkgColor: valSoft,
    sequenceNumberColor: ink,
    noteBkgColor: warnSoft,
    noteTextColor: ink,
    noteBorderColor: warn,
    sectionBkgColor: valSoft,
    altSectionBkgColor: sunk,
    labelColor: ink,
    errorBkgColor: cssColor('--bad-soft'),
    errorTextColor: ink,
  };
};

export const MermaidDiagram: FC<Props> = (props) => {
  const { source } = props;
  const reactId = useId().replace(/:/g, '');
  const [svg, setSvg] = useState(() => renderedDiagrams.get(source) ?? '');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const draw = async (): Promise<void> => {
      const { default: mermaid } = await import('mermaid');
      const id = `diagram-${reactId}-${Date.now()}`;
      try {
        await enqueue(async () => {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            look: 'classic',
            fontFamily: '"IBM Plex Sans", sans-serif',
            theme: 'base',
            themeVariables: diagramTheme(),
            sequence: { useMaxWidth: true, mirrorActors: false },
            state: { useMaxWidth: true },
            class: { useMaxWidth: true },
          });
          const parsed = await mermaid.parse(source, { suppressErrors: true });
          if (parsed === false) {
            throw new Error('invalid diagram');
          }
          const rendered = await mermaid.render(id, source);
          if (!cancelled) {
            renderedDiagrams.set(source, rendered.svg);
            setFailed(false);
            setSvg(rendered.svg);
          }
        });
      } catch {
        document.getElementById(id)?.remove();
        if (!cancelled) {
          setSvg('');
          setFailed(true);
        }
      }
    };

    const observer = new MutationObserver(() => {
      void draw();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    void draw();
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [reactId, source]);

  if (failed) {
    return (
      <pre className="mermaid-fallback">
        <code>{source}</code>
      </pre>
    );
  }

  return (
    <div
      className="mermaid-diagram"
      data-state={svg === '' ? 'loading' : 'ready'}
      aria-label="Схема"
      aria-busy={svg === ''}
      dangerouslySetInnerHTML={svg === '' ? undefined : { __html: svg }}
    />
  );
};
