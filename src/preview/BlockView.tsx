import { Fragment, type ReactNode } from 'react';
import { createRng, toDecimalString, type Block, type Token } from '../engine';
import s from './preview.module.css';

/**
 * Rough, functional drawings of each block kind, for checking generators.
 * The real kid-facing renderer is built in M4.
 */

const Box = () => <span className={s.box} aria-label="answer box" />;

/** Text with `__` drawn as an answer box. */
function withBoxes(text: string): ReactNode {
  return text.split('__').map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <Box />}
      {part}
    </Fragment>
  ));
}

function TokenView({ tk }: { tk: Token }) {
  switch (tk.t) {
    case 'num':
      return <span>{toDecimalString(tk.v)}</span>;
    case 'frac':
      return (
        <span className={s.frac}>
          <span>{tk.n}</span>
          <span>{tk.d}</span>
        </span>
      );
    case 'mixed':
      return (
        <span>
          {tk.w}
          <span className={s.frac}>
            <span>{tk.n}</span>
            <span>{tk.d}</span>
          </span>
        </span>
      );
    case 'blank':
      return <Box />;
    default:
      return <span className={s.op}>{tk.v}</span>;
  }
}

function Dots({ count, className }: { count: number; className?: string | undefined }) {
  return (
    <span className={className ?? s.dots}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={s.dot} />
      ))}
    </span>
  );
}

function Scattered({ count, seed }: { count: number; seed: number }) {
  const rng = createRng(seed);
  const spots: [number, number][] = [];
  // Place on a 6×4 grid with jitter, so dots never overlap.
  const cells = rng.shuffle([...Array(24).keys()]).slice(0, count);
  for (const c of cells)
    spots.push([(c % 6) * 16 + rng.int(1, 8), Math.floor(c / 6) * 24 + rng.int(1, 12)]);
  return (
    <svg className={s.scatter} viewBox="0 0 100 100" aria-label={`${count} objects`}>
      {spots.map(([x, y], i) => (
        <circle key={i} cx={x + 4} cy={y + 4} r={4} />
      ))}
    </svg>
  );
}

function FractionModel({ b }: { b: Extract<Block, { kind: 'fractionModel' }> }) {
  const wholes = b.wholes ?? 1;
  return (
    <span className={s.row}>
      {Array.from({ length: wholes }, (_, w) => {
        const shaded = Math.max(0, Math.min(b.parts, b.shaded - w * b.parts));
        if (b.shape === 'bar') {
          return (
            <span key={w} className={s.bar}>
              {Array.from({ length: b.parts }, (_, i) => (
                <span key={i} className={i < shaded ? s.barOn : s.barOff} />
              ))}
            </span>
          );
        }
        const slices = Array.from({ length: b.parts }, (_, i) => {
          const a0 = (i / b.parts) * 2 * Math.PI - Math.PI / 2;
          const a1 = ((i + 1) / b.parts) * 2 * Math.PI - Math.PI / 2;
          const d = `M20 20 L${20 + 18 * Math.cos(a0)} ${20 + 18 * Math.sin(a0)} A18 18 0 0 1 ${20 + 18 * Math.cos(a1)} ${20 + 18 * Math.sin(a1)} Z`;
          return <path key={i} d={d} className={i < shaded ? s.sliceOn : s.sliceOff} />;
        });
        return (
          <svg
            key={w}
            className={s.pie}
            viewBox="0 0 40 40"
            aria-label={`${shaded} of ${b.parts} parts shaded`}
          >
            {b.parts === 1 ? (
              <circle cx={20} cy={20} r={18} className={shaded ? s.sliceOn : s.sliceOff} />
            ) : (
              slices
            )}
          </svg>
        );
      })}
    </span>
  );
}

function NumberLine({ b }: { b: Extract<Block, { kind: 'numberLine' }> }) {
  const steps = (b.max - b.min) * b.partsPerUnit;
  const x = (i: number) => 10 + (i / steps) * 280;
  return (
    <svg className={s.numberLine} viewBox="0 0 300 50" aria-label="number line">
      <line x1={5} y1={20} x2={295} y2={20} />
      {Array.from({ length: steps + 1 }, (_, i) => {
        const whole = i % b.partsPerUnit === 0;
        return (
          <g key={i}>
            <line x1={x(i)} y1={whole ? 12 : 15} x2={x(i)} y2={whole ? 28 : 25} />
            {whole && (
              <text x={x(i)} y={44} textAnchor="middle">
                {b.min + i / b.partsPerUnit}
              </text>
            )}
          </g>
        );
      })}
      {b.point !== null && <circle cx={x(b.point)} cy={20} r={5} className={s.point} />}
    </svg>
  );
}

function speak(text: string) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

export function BlockView({ b }: { b: Block }) {
  switch (b.kind) {
    case 'equation':
      return (
        <div className={s.equation}>
          {b.tokens.map((tk, i) => (
            <TokenView key={i} tk={tk} />
          ))}
        </div>
      );
    case 'vertical': {
      const width = Math.max(...b.operands.map((o) => String(o).length)) + 1;
      return (
        <div className={s.vertical} style={{ ['--w' as string]: `${width}ch` }}>
          {b.operands.map((o, i) => (
            <div key={i}>
              <span className={s.op}>{i === b.operands.length - 1 ? b.op : ''}</span>
              {o}
            </div>
          ))}
          <div className={s.rule} />
          <Box />
        </div>
      );
    }
    case 'longDivision':
      return (
        <div className={s.longDiv}>
          <Box />
          <div>
            {b.divisor}
            <span className={s.bracket}>{b.dividend}</span>
          </div>
        </div>
      );
    case 'sequence':
      return (
        <div className={s.equation}>
          {b.items.map((x, i) => (
            <Fragment key={i}>
              {i > 0 && <span className={s.op}>,</span>}
              {x === null ? <Box /> : <span>{x}</span>}
            </Fragment>
          ))}
        </div>
      );
    case 'objects':
      return b.layout === 'scattered' ? (
        <Scattered count={b.count} seed={b.seed} />
      ) : (
        <Dots count={b.count} className={b.layout === 'array' ? s.dotArray : s.dots} />
      );
    case 'twoGroups':
      return (
        <div className={s.row}>
          <Dots count={b.left} className={s.group} />
          <Dots count={b.right} className={s.group} />
        </div>
      );
    case 'tenFrame':
      return (
        <div className={s.row}>
          {b.filled.map((n, f) => (
            <span key={f} className={s.tenFrame}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={s.cell}>
                  {i < n && <span className={s.dot} />}
                </span>
              ))}
            </span>
          ))}
        </div>
      );
    case 'baseTen':
      return (
        <div className={s.row}>
          {Array.from({ length: b.hundreds }, (_, i) => (
            <span key={`h${i}`} className={s.flat} />
          ))}
          {Array.from({ length: b.tens }, (_, i) => (
            <span key={`t${i}`} className={s.rod} />
          ))}
          <Dots count={b.ones} className={s.cubes} />
        </div>
      );
    case 'groups':
      return (
        <div className={s.row}>
          {Array.from({ length: b.groups }, (_, i) => (
            <Dots key={i} count={b.each} className={s.group} />
          ))}
        </div>
      );
    case 'array':
      return (
        <span className={s.grid} style={{ gridTemplateColumns: `repeat(${b.cols}, 14px)` }}>
          {Array.from({ length: b.rows * b.cols }, (_, i) => (
            <span key={i} className={s.dot} />
          ))}
        </span>
      );
    case 'fractionModel':
      return <FractionModel b={b} />;
    case 'numberLine':
      return <NumberLine b={b} />;
    case 'story':
      return <p className={s.story}>{withBoxes(b.text)}</p>;
    case 'text':
      return <p className={s.text}>{withBoxes(b.text)}</p>;
    case 'listen':
      return (
        <button type="button" className={s.listen} onClick={() => speak(b.text)}>
          Play sound <span className={s.muted}>({b.text})</span>
        </button>
      );
  }
}
